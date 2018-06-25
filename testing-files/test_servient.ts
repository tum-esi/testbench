import {Servient,ContentSerdes, ContentCodec} from 'node-wot/packages/core';
import {HttpClientFactory,HttpServer} from 'node-wot/packages/binding-http';
import {Thing} from 'node-wot/packages/td-tools';
var XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;

let srv = new Servient();
srv.addServer(new HttpServer(8081)); 
srv.addClientFactory(new HttpClientFactory());
//You dont have to put both functionalities, if you only consume Things then you dont need a server or if you only expose a Thing you shouldnt need a client
srv.start().then(WoT=>{ // you dont have to use WoT here, it is just what the community agreed on
    
	console.log('* started servient');
    let thing = WoT.produce({
        name: "mything",
    });
    console.log(thing.getThingDescription());
    console.log("* Created thing " + thing.name);
    thing.addProperty({
        name : "display",
        schema : '{ "type": "string"}',
        value : "morning,sleeping",
        observable : true,
        writable : true
    });
    thing.addProperty({
        name : "counter",
        schema : '{ "type": "number"}',
        value : 2,
        observable : true,
        writable : true
    });
    thing.addProperty({
        name : "temp",
        schema : '{ "type": "number"}',
        value : 0,
        observable : true,
        writable : false
    });
    thing.addProperty({
        name : "testObject",
        schema : `{ 
            "type": "object", 
            "properties": { 
                "brightness": {
                    "type": "number", 
                    "minimum": 0.0, 
                    "maximum": 100.0
                }, 
                "status" : {
                    "type": "string"
                } 
            } 
        }`,
        writable : true
    });
    thing.addProperty({
        name : "testArray",
        schema : `{ 
            "type": "array", 
            "items": { "type": "number" }
        }`,
        writable : true
    });
    thing.addAction({
        name: "setCounter",
        inputSchema: '{ "type": "number" }'
    });
    thing.addAction({
        name: "getTemp",
        outputSchema: '{ "type": "number" }'
    });
    thing.addAction({
        name: "setDisplay",
        inputSchema: '{ "type": "string" }',
        outputSchema: '{ "type": "string" }'
    });
    thing.addAction({
        name: "setTestObject",
        inputSchema: `{ 
            "type": "object", 
            "properties": { 
                "brightness": {
                    "type": "number", 
                    "minimum": 0.0, 
                    "maximum": 100.0
                }, 
                "status" : {
                    "type": "string"
                } 
            } 
        }`
    });
    thing.addAction({
        name: "setTestArray",
        inputSchema: `{ 
            "type": "array", 
            "items": { "type": "number" }
        }`,
        outputSchema: `{ 
            "type": "array", 
            "items": { "type": "number" }
        }`
    });
    thing.addEvent({
        name: "onChange",
        schema: '{ "type": "number" }'
    });
    //////////////////////////////////
    // add server functionality:

    // input: number, output: string_
    thing.setActionHandler("setCounter", (input: number) => {
        console.log("* ACTION HANDLER FUNCTION for setCounter");
        console.log("* ", input);
        thing.writeProperty("counter", input);

        // not necessarily required...
        return new Promise((resolve, reject) => {
            let examplePropertyValue = "set value to 11";
            resolve(examplePropertyValue);
          });
    });
    thing.setActionHandler("getTemp", () => {
        console.log("* ACTION HANDLER FUNCTION for getTemp");
        let count = thing.readProperty("temp");
        // not necessarily required...
        return new Promise((resolve, reject) => {
            resolve(count);
          });
    });
    // input: string, output: string
    thing.setActionHandler("setDisplay", (input: string) => {
        console.log("* ACTION HANDLER FUNCTION for setDisplay");
        console.log("* ", input);
        // var xmlHttp = new XMLHttpRequest();
        // xmlHttp.onreadystatechange = function() { 
        //     if (xmlHttp.readyState == 4 && xmlHttp.status == 200)
        //         console.log(xmlHttp.responseText);
        //         let temperatur = xmlHttp.responseText;
        //         thing.writeProperty("temp", parseFloat(temperatur));
        // }
        // xmlHttp.open("GET", "http://raspberrypi.local:5000/dispmsg/"+input+"-blue", true); // true for asynchronous 
        // xmlHttp.send(null);

        // due to console logs... during compile
        return new Promise((resolve, reject) => {
            let examplePropertyValue = "resolved your string";
            resolve(examplePropertyValue);
          });
    });
    thing.setActionHandler("setTestObject", (input: string) => {
        console.log("* ACTION HANDLER FUNCTION for setTestObject");
        console.log("* ", input);
        thing.writeProperty("testObject", input);
        return new Promise((resolve, reject) => {
            resolve(input);
            });
    });

    // delay function fo action return value:
    function delay(t, v) {
       return new Promise(function(resolve) { 
           setTimeout(resolve.bind(null, v), t);
       });
    }
    thing.setActionHandler("setTestArray", (input: string) => {
        console.log("* ACTION HANDLER FUNCTION for setTestArray");
        console.log("* ", input);
        thing.writeProperty("testArray", input);
        // return delay(5000, input);

        // delay to simulate action which takes longer
        return delay(5000, input).then(function(input) {
            console.log('returning now');
            return input;
        });
    });

    // example of property read handler...
    thing.setPropertyReadHandler("counter", () => {
        console.log("* HANDLER FUNCTION for " + "counter");
        return new Promise((resolve, reject) => {
            let examplePropertyValue = 13;
            console.log('* returning value:', examplePropertyValue);
            resolve(examplePropertyValue);
          });
      });
    thing.setPropertyReadHandler("testObject", () => {
        console.log("* HANDLER FUNCTION for testObject");
        let testObjectValue = thing.propertyStates.get('testObject').value;
        return new Promise((resolve, reject) => {
            if (testObjectValue == null) {
                resolve({"brightness": 100, "status": "sample object testing"})
            }
            else {
                resolve(testObjectValue)
            }
          });
    });
    thing.setPropertyReadHandler("testArray", () => {
        console.log("* HANDLER FUNCTION for testArray");
        let testArrayValue = thing.propertyStates.get('testArray').value;
        return new Promise((resolve, reject) => {
            if (testArrayValue == null) {
                resolve([-3,15,27])
            }
            else {
                resolve(testArrayValue)
            }
          });
    });
}).catch(err => { throw "Couldnt connect to one servient" });




/////////////////////// CODE BACKUP //////////////////////////

    // thing.start().then(() => {
    //       thing.register();
    //   });
    
    // replace this functionality be set handlers....
    // setInterval( async () => {
    //     console.log('try changing property counter');
    //     let count = await thing.readProperty("counter");
    //     count += 1;
    //     console.log("counter has value", count);
    //     thing.writeProperty("counter", count);
    //     thing.emitEvent("onchange", count);


    //     // calling python handler for sensor
    //     // var xmlHttp = new XMLHttpRequest();
    //     // xmlHttp.onreadystatechange = await function() { 
    //     //     if (xmlHttp.readyState == 4 && xmlHttp.status == 200)
    //     //         console.log(xmlHttp.responseText);
    //     //         let temperatur = xmlHttp.responseText;
    //     //         thing.writeProperty("temp", parseFloat(temperatur));
    //     // }
    //     // xmlHttp.open("GET", "http://raspberrypi.local:5000/gettemp", true); // true for asynchronous 
    //     // xmlHttp.send(null);

    // }, 5000);


// console.log(srv);
/*
this then and catch structure exists because of Promises. It is a very hyped and used design choice in node.js where you start a process and promise that you will finish it. So here the srv promises to start and once it finishes this start process, you can use it by using then. In case there is something wrong, you catch it with catch . You should also understand what => means so I leave you to discover callbacks in nodejs :) They exist in every other language but not used as heavily as in nodejs.
*/

// function makeRequest (method, url) {
//   return new Promise(function (resolve, reject) {
//     var xhr = new XMLHttpRequest();
//     xhr.open(method, url);
//     xhr.onload = function () {
//       if (this.status >= 200 && this.status < 300) {
//         resolve(xhr.response);
//       } else {
//         reject({
//           status: this.status,
//           statusText: xhr.statusText
//         });
//       }
//     };
//     xhr.onerror = function () {
//       reject({
//         status: this.status,
//         statusText: xhr.statusText
//       });
//     };
//     xhr.send();
//   });
// }

// async function asyncCall(propname) {
//   var result = await TuTT.readProperty(propname);
//   return result;
//   // expected output: "resolved"
// }
// TestBenchT.setActionHandler("getpropertyvalue", function(propname: string) {
//   var answer = asyncCall(propname);
//   return new Promise((resolve, reject) => {
//       if (answer) {
//           resolve(answer);
//       } else {
//           reject(Error('getpropertyvalue did not work'))
//       }
//   });
// });
