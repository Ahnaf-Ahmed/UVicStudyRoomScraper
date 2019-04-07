let axios = require('axios'); // HTTP client
let cheerio = require('cheerio'); // HTML parsing package
let jsonframe = require('jsonframe-cheerio'); // a cheerio plugin I designed
let fs = require('fs'); // is included in node.js - you don't need to install it

var area = 1	//1 for main, 2 for 2nd/3rd floor, 4 for lower level
var today = new Date();
var dd = String(today.getDate());
var mm = String(today.getMonth() + 1); //January is 0!
var yyyy = today.getFullYear();
var rooms = ["Room 113a", "Room 113b", "Room 113c", "Room 113d", "Room 131", "Room A103", "Room A105", "Room A107", "Room A109"]

var studyURL = "https://webapp.library.uvic.ca/studyrooms/day.php?year=" + yyyy + "&month=" + mm + "&day=" + dd + "&area" +  area;

console.log(studyURL);

axios.get(studyURL)
	.then((response) => {

		if(response.status === 200) {

			var html = response.data;
			let $ = cheerio.load(html); // We load the html we received into cheerio's parser
			jsonframe($);               // We add the plugin to the cheerio's parser

			fs.writeFileSync('ph.html', html); // This saves the html to a ph.html for checks

			var roomDataFrame = {       // This is a simple conversation of the data structure
				"roomInfo": {             // thanks to jsonframe
					"selector": "table:not(.noborder) .odd_row,.I,.even_row",        //need to do (sectiontype).name (each piece you're going to iterate over)
					"data": [{
                        "name": ".I a",
						"link": "a@href"
                    }]
				}
			};

			var roomNameFrame = {       
				"setup": {             
					"selector": "th+ th",    //need to do (sectiontype).name (each piece you're going to iterate over)
					"data": ["th"]
				}
			};

			var timeFrame = {
				"times": {             // thanks to jsonframe
					"selector": "table:not(.noborder) tr",        //use the selector for the section you want to iterate over
					"data": [{
                        "time": ".red"
                    }]
				}
			}

			var roomData = $('body').scrape(roomDataFrame); 
			var roomName = $('body').scrape(roomNameFrame); 
			var time = $('body').scrape(timeFrame);	//first one is empty becase it's the header row and has no time
			
			let roomArray = roomName.setup;
			let roomNum = roomArray.length;

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
			fs.writeFileSync("roomData.json",JSON.stringify(roomData, null, 2)); // You can see that the output json is structured the way we wanted it thanks to the json frame
			//processData(roomData);
		}

	}, (error) => {
		console.log("Humm: ", error);
	});

function processData(inputJSON) {		//not used currently, to be possibly used later


	
	for (var obj in inputJSON.products){
		

		if(!("name" in inputJSON.products[obj])){
			inputJSON.products[obj].status = "open"

		}

		//var attrName = key;
		//var attrValue = obj[key];
	}
	

	for (x in inputJSON) {
		if (x.name) {

		}
	}

}