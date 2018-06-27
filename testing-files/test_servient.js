var Servient = require('thingweb.node-wot/packages/core').Servient;
var HttpServer = require('thingweb.node-wot/packages/binding-http').HttpServer;
var HttpClientFactory = require('thingweb.node-wot/packages/binding-http').HttpClientFactory;
var XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;

let srv = new Servient();
srv.addServer(new HttpServer(8081)); 
srv.addClientFactory(new HttpClientFactory());
srv.start().then(WoT=>{

	console.log('* started servient');
    let thing = WoT.produce({
        name: "mything",
    });
    thing.addProperty("display", {
        type : 'string',
        writable : true,
        observable : true
        }, "exampleString");
    thing.addProperty("counter", {
        type : 'number',
        writable : true,
        observable : true
        }, 2);
    thing.addProperty("temp", {
        type : 'number',
        writable : false,
        observable : true
    }, 0);
    thing.addProperty("testObject", {
        type : 'object',
        properties: {
            "brightness": {
                type: "number", 
                minimum: 0.0, 
                maximum: 100.0
            },
            "status" : {
                type: "string"
            }
        },
        writable : true
        }, {"brightness": 99.99,"status": "exampleString"});
    thing.addProperty("testArray",{
        type : "array",
        items : {type: "number"},
        writable : true
    }, [12,15,10]);
    thing.addAction("setCounter", {
        input: {
            type: 'number'
        }
    });
    thing.addAction("getTemp", {
        output: { type: "number" }
    });
    thing.addAction("setDisplay", {
        input: { type: "string" },
        output: { type: "string" }
    });
    thing.addAction("setTestObject", {
        input: { 
            type: "object", 
            properties: { 
                "brightness": {
                    type: "number", 
                    minimum: 0.0, 
                    maximum: 100.0
                }, 
                "status" : {
                    type: "string"
                } 
            } 
        }
    });
    thing.addAction("setTestArray", {
        input: { 
            type: "array", 
            items: { type: "number" }
        },
        output: { 
            type: "array", 
            items: { type: "number" }
        }
    });
    thing.addEvent("onChange", {
        type: "number"
    });

    // add server functionality:
    thing.setActionHandler("setCounter", (input) => {
        console.log("* ACTION HANDLER FUNCTION for setCounter");
        console.log("* ", input);
        return thing.properties["counter"].set(input).then(() => {
            console.log('* Set counter successful');
            return 
        }).catch(() => {
            console.log('* Set counter failed');
            return
        });
    });
    thing.setActionHandler("getTemp", () => {
        console.log("* ACTION HANDLER FUNCTION for getTemp");
        return thing.properties["temp"].get().then((count) => {
            console.log('* GetTemp successful');
            return count;
        }).catch(() => {
            console.log('* GetTemp failed');
            return 0;
        });
    });
    thing.setActionHandler("setDisplay", (input) => {
        console.log("* ACTION HANDLER FUNCTION for setDisplay");
        console.log("* ", input);
        // get_temp_rpi();
        return new Promise((resolve, reject) => {resolve("resolved your string");});
    });
    thing.setActionHandler("setTestObject", (input) => {
        console.log("* ACTION HANDLER FUNCTION for setTestObject");
        console.log("* ", input);
        return thing.properties["testObject"].set(input).then(() => input, () => false);
    });
    thing.setActionHandler("setTestArray", (input) => {
        console.log("* ACTION HANDLER FUNCTION for setTestArray");
        console.log("* ", input);
        return thing.properties["testArray"].set(input).then(() => {
            var promise1 = new Promise(function(resolve, reject) {
                setTimeout(resolve, 5000, input);
            });
            return promise1;
        });
    });
    thing.setPropertyReadHandler("counter", () => {
        console.log("* HANDLER FUNCTION for counter");
        return new Promise((resolve, reject) => {resolve(13);});
    });
}).catch(err => { throw "Couldnt connect to one servient" });


// function get_temp_rpi() {
//     var xmlHttp = new XMLHttpRequest();
//     xmlHttp.onreadystatechange = function() { 
//         if (xmlHttp.readyState == 4 && xmlHttp.status == 200)
//             console.log(xmlHttp.responseText);
//             let temperatur = xmlHttp.responseText;
//             thing.writeProperty("temp", parseFloat(temperatur));
//     }
//     xmlHttp.open("GET", "http://raspberrypi.local:5000/dispmsg/"+input+"-blue", true); // true for asynchronous 
//     xmlHttp.send(null);
// }