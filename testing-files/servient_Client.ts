import {Servient,ContentSerdes, ContentCodec} from '@node-wot/core';
import {HttpClientFactory,HttpServer} from '@node-wot/binding-http';
import {Thing} from '@node-wot/td-tools';
var XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;

var targetUri = "http://localhost:8081/mything";

let srv = new Servient();
srv.addServer(new HttpServer(8085)); 
srv.addClientFactory(new HttpClientFactory());
// console.log(srv);
//You dont have to put both functionalities, if you only consume Things then you dont need a server or if you only expose a Thing you shouldnt need a client
srv.start().then(WoT=>{ // you dont have to use WoT here, it is just what the community agreed on
    
	console.log('started servient CLIENT');

	WoT.fetch(targetUri)
	.then(function(td) {
		let thing = WoT.consume(td);
		console.log("TD: " + td);
		
		// read property #1
		// thing.readProperty("counter")
		// 	.then(function(count){
		// 		console.log("count value is ", count);
		//     })
		// 	.catch(err => { throw err });

		console.log("Thing " + thing.name + " has been consumed.");
			
		// console.log(thing.observablesEvent)
		thing.onEvent("onchange").subscribe(function(value) {
			  console.log("Temperature has changed to " + value);
			});

		// console.log(thing.findInteraction("onchange", "Event"));

		thing.onEvent("onchange").subscribe(function(value) {
			  console.log("Temperature has changed to " + value);
			});

		// thing.invokeAction("startMeasurement", { units: "Celsius" })
		// 	.then(() => { console.log("Temperature measurement started."); })
		// 	.catch(e => {
		// 	   console.log("Error starting measurement.");
		// 	   subscription.unsubscribe();
		// 	 })


		// increment property #1
		// thing.invokeAction("increment")
		// .then(function(count){
		// 	console.log("count value after increment #1 is ", count);
	 //    })
		// .catch(err => { throw err });
		
		// // increment property #2
		// thing.invokeAction("increment")
		// .then(function(count){
		// 	console.log("count value after increment #2 is ", count);
	 //    })
		// .catch(err => { throw err });
		
		// // read property #2
		// thing.readProperty("count")
		// .then(function(count){
		// 	console.log("count value is ", count);
	 //    })
		// .catch(err => { throw err });
		
	})
	.catch(err => { throw err });
}).catch(err => { throw "Couldnt connect to one servient" });

