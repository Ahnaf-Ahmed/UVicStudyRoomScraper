let axios = require('axios'); // HTTP client
let cheerio = require('cheerio'); // HTML parsing package
let jsonframe = require('jsonframe-cheerio');
let fs = require('fs');
const puppeteer = require('puppeteer');

var area = 1	//1 for main, 2 for 2nd/3rd floor, 4 for lower level
var today = new Date();
var dd = String(today.getDate());
var mm = String(today.getMonth() + 1); //January is 0
var yyyy = today.getFullYear();
var rooms = ["Room 113a", "Room 113b", "Room 113c", "Room 113d", "Room 131", "Room A103", "Room A105", "Room A107", "Room A109"]
var netlinkInfo = "";
var selectedRoom = "";
//var studyURL = "https://webapp.library.uvic.ca/studyrooms/day.php?year=" + yyyy + "&month=" + mm + "&day=" + dd + "&area" +  area;
var breakOut = false;



fs.readFile('accounts.txt', "utf8", (err, data) => {
	if (err) throw err;

	//if there's an issue with accounts it's because of this
	let temp = data.split(/\r?\n\r?\n/);
	console.log("temp is: ")
	console.log(temp)
	selectedRoom = temp.pop()
	selectedRoom = selectedRoom.substring(6,selectedRoom.length)
	//^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
	netlinkInfo = temp.map(row => row.split(/\r?\n/));
	console.log(selectedRoom)
	
	//console.log(netlinkInfo[1][1])
	//console.log(netlinkInfo);
	
	for (let index = 0; index < netlinkInfo.length; index++) {
		if(netlinkInfo[index][2] == null) {
			netlinkInfo[index][2] = '0';
			//console.log("here " + index)
		}
		
	}

	//console.log(netlinkInfo);

	let url1 = "https://webapp.library.uvic.ca/studyrooms/day.php?year=" + yyyy + "&month=" + mm + "&day=" + dd + "&area=" +  "1";
	let url2 = "https://webapp.library.uvic.ca/studyrooms/day.php?year=" + yyyy + "&month=" + mm + "&day=" + dd + "&area=" +  "2";
	let url3 = "https://webapp.library.uvic.ca/studyrooms/day.php?year=" + yyyy + "&month=" + mm + "&day=" + dd + "&area=" +  "4";
	let URLs = [url1, url2, url3];

	URLs.some(url => scraper(url));

});



function scraper(studyURL) {
	axios.get(studyURL)
	.then((response) => {
		console.log(studyURL);
		breakOut = true;

		if(response.status === 200) {

			var html = response.data;
			let $ = cheerio.load(html); // We load the html we received into cheerio's parser
			jsonframe($);               // We add the plugin to the cheerio's parser

			//fs.writeFileSync('ph.html', html); // Saving html to file for checking

			//getting the json for all possible booking
			var roomDataFrame = {       //Conversation of the data structure thanks to jsonframe
				"roomInfo": {            
					"selector": "table:not(.noborder) .odd_row,.I,.even_row",        //need to do the selector for each piece you're going to iterate over
					"data": [{
						"name": ".I a",
						"link": "a@href"
					}]
				}
			};

			//getting the json for the name of each room
			var roomNameFrame = {       
				"setup": {             
					"selector": "th+ th",
					"data": ["th"]
				}
			};

			//getting the json for available times of each room
			var timeFrame = {
				"times": {             // thanks to jsonframe
					"selector": "table:not(.noborder) tr",        //use the selector for the section you want to iterate over
					"data": [{
						"time": ".red"
					}]
				}
			}
			var roomName = $('body').scrape(roomNameFrame); //done first so we don't waste time scraping others

			let roomArray = roomName.setup;
			for (let index = 0; index < roomArray.length; index++) {
				let element = roomArray[index];
				roomArray[index] = element.substring(0,element.length - 3);
			}

			//console.log(roomArray.includes(selectedRoom))
			
			if (roomArray.includes(selectedRoom)) {
				console.log("on floor: " + studyURL.substring(studyURL.length-1, studyURL.length))
			}else {
				return false;
			}
			//console.log(roomArray)

			let roomNum = roomArray.length;

			var time = $('body').scrape(timeFrame);	//first one is empty becase it's the header row and has no time
			var roomData = $('body').scrape(roomDataFrame);
			for (var obj in roomData.roomInfo){
				if(!("name" in roomData.roomInfo[obj]) && ("link" in roomData.roomInfo[obj])){
					roomData.roomInfo[obj].status = "open"
				}

				if(("name" in roomData.roomInfo[obj]) && ("link" in roomData.roomInfo[obj])){
					roomData.roomInfo[obj].status = "closed"
				}

				if(!("link" in roomData.roomInfo[obj])) {
					roomData.roomInfo[obj].name = roomData.roomInfo[obj-roomNum].name;
					roomData.roomInfo[obj].status = "closed";
				}
				
				if(!("name" in roomData.roomInfo[obj])){
					roomData.roomInfo[obj].name = "NONE"
				}

				
				roomData.roomInfo[obj].number = +obj + +1;
				roomData.roomInfo[obj].room = roomArray[obj%roomNum];
				roomData.roomInfo[obj].time = time.times[Math.floor(+obj / +roomNum) + 1].time;
			}
			fs.writeFileSync("roomData.json",JSON.stringify(roomData, null, 2)); 
			//processData(roomData);
		}
		return true;
	}, (error) => {
		console.log("Humm: ", error);
	});

}

function processData(inputJSON) {		

	
	var links = new Array(33);
	var reservedList = new Array(33);
	let i = 0;
	let otherCount = 0;
	for (var obj in inputJSON.roomInfo){
		if (inputJSON.roomInfo[obj].room === selectedRoom && inputJSON.roomInfo[obj].status === "open"){
			links[i++] = inputJSON.roomInfo[obj].link;
			
		}

		if (inputJSON.roomInfo[obj].name === "Reserved"){
			reservedList[otherCount++] = inputJSON.roomInfo[obj].link;
		}
	}
	//console.log(links)
	
	(async () => {
		const browser = await puppeteer.launch({headless: false}); // default is true
		const page = await browser.newPage();
		await page.setViewport({ width: 1280, height: 800 })
		await page.goto('https://webapp.library.uvic.ca/studyrooms/day.php?day=12&month=04&year=2019&area=1')
		for(let k = 0; k < netlinkInfo.length; k++){
			for(let j = 0; netlinkInfo[k][2] < 4; (netlinkInfo[k][2])++, j++) { 
				console.log("current is " + netlinkInfo[k][2])
				await page.goto("https://webapp.library.uvic.ca/studyrooms/" + links[4*k + j])
				console.log("https://webapp.library.uvic.ca/studyrooms/" + links[4*k + j]);
				await page.type('input[name=name]', 'this is a test', { delay: 100 })
				await page.type('select[name=duration]', '30min', { delay: 100 })
				await page.type('input[name=netlinkid]', netlinkInfo[k][0], { delay: 100 })
				await page.type('input[name=netlinkpw]', netlinkInfo[k][1], { delay: 100 })
				await page.click('input[type="button"]')
				await page.waitForNavigation();

				if(page.url() !== "https://webapp.library.uvic.ca/studyrooms/day.php?year=2019&month=4&day=12&area=1") {
					console.log("failed")
				}else{
					for (var obj in inputJSON.roomInfo){
						if (inputJSON.roomInfo[obj].link === links[4*k + j]){
							inputJSON.roomInfo[obj].scriptBooked = true;
						}
					}
					fs.writeFileSync("roomData.json",JSON.stringify(inputJSON, null, 2));
				}
				console.log("DONE")
				await page.screenshot({ path: 'success' + j + '.png'})
			}
		}

		console.log(k)
		
	})();
	

	

}