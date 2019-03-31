let axios = require('axios'); // HTTP client
let cheerio = require('cheerio'); // HTML parsing package
let jsonframe = require('jsonframe-cheerio'); // a cheerio plugin I designed
let fs = require('fs'); // is included in node.js - you don't need to install it

axios.get('https://www.wuxiaworld.com')
	.then((response) => {

		if(response.status === 200) {

			var html = response.data;
			let $ = cheerio.load(html); // We load the html we received into cheerio's parser
			jsonframe($);               // We add the plugin to the cheerio's parser

			fs.writeFileSync('ph.html', html); // This saves the html to a ph.html for checks

			var productsFrame = {       // This is a simple conversation of the data structure
				"products": {             // thanks to jsonframe
					"selector": "table.table-novels tr",        //need to do (sectiontype).name (each piece you're going to iterate over)
					"data": [{
						"name": ".title a",
						"Chapter title": ".visible-xs-inline a",
						"time": ".timestamp"
					}]
				}
			};

			var products = $('body').scrape(productsFrame); // Scrape the list of products based on the json frame we defined before
			fs.writeFileSync("products.json",JSON.stringify(products, null, 2)); // You can see that the output json is structured the way we wanted it thanks to the json frame
		}

	}, (error) => {
		console.log("Humm: ", error);
	});