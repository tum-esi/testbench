var Servient = require('thingweb.node-wot/packages/core').Servient;
var HttpServer = require('thingweb.node-wot/packages/binding-http').HttpServer;
var HttpClientFactory = require('thingweb.node-wot/packages/binding-http').HttpClientFactory;
var XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;

let srv = new Servient();
srv.addServer(new HttpServer(8081));
srv.addClientFactory(new HttpClientFactory());
srv.start().then(WoT => {

    console.log('* started servient');

    let thing = WoT.produce({
        name: "TestServient",
        description: "Test servient that can be used as a servient to be tested with the WoT Test Bench. All interactions have errors explicetely coded"
    });

    thing.addProperty("display", {
        type: 'string',
        writable: true,
        observable: true
    }, "initialization string");

    thing.addProperty("wrongWritable", {
        type: 'number',
        writable: true,
        observable: true
    }, 15);

    thing.addProperty("wrongDataType", {
        type: 'number',
        writable: false,
        observable: true
    }, "this is not a number");

    thing.addProperty("testObject", {
        type: 'object',
        properties: {
            "brightness": {
                type: "number",
                minimum: 0.0,
                maximum: 100.0
            },
            "status": {
                type: "string"
            }
        },
        writable: true
    }, {
        "brightness": 99.99,
        "status": "exampleString"
    });

    thing.addProperty("testArray", {
        type: "array",
        items: {
            type: "number"
        },
        writable: true
    }, [12, 15, 10]);

    thing.addAction("setCounter", {
        input: {
            type: 'number'
        }
    }, (input) => {
        console.log("* ACTION HANDLER FUNCTION for setCounter");
        console.log("* ", input);
        return thing.properties["counter"].write(input).then(() => {
            console.log('* Set counter successful');
            return
        }).catch(() => {
            console.log('* Set counter failed');
            return
        });
    });

    thing.addAction("getTemperature", {
        output: {
            type: "number"
        }
    }, () => {
        console.log("* ACTION HANDLER FUNCTION for getTemp");
        return thing.properties["temperature"].read().then((temp) => {
            console.log('* getTemperature successful');
            return temp;
        }).catch(() => {
            console.log('* getTemperature failed');
            return 0;
        });
    });

    thing.addAction("setDisplay", {
        input: {
            type: "string"
        },
        output: {
            type: "string"
        }
    },
    (input) => {
        console.log("* ACTION HANDLER FUNCTION for setDisplay");
        console.log("* ", input);
        return new Promise((resolve, reject) => {
            resolve("Display set");
        });
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
                "status": {
                    type: "string"
                }
            }
        }
    }, (input) => {
        console.log("* ACTION HANDLER FUNCTION for setTestObject");
        console.log("* ", input);
        return thing.properties["testObject"].write(input).then(() => input, () => false);
    });

    thing.addAction("setTestArray", {
        input: {
            type: "array",
            items: {
                type: "number"
            }
        },
        output: {
            type: "array",
            items: {
                type: "number"
            }
        }
    }, (input) => {
        console.log("* ACTION HANDLER FUNCTION for setTestArray");
        console.log("* ", input);
        return thing.properties["testArray"].write(input).then(() => {
            var promise1 = new Promise(function (resolve, reject) {
                setTimeout(resolve, 5000, input);
            });
            return promise1;
        });
    });

    thing.addEvent("onChange", {
        type: "number"
    });

    thing.expose().then(() => {
        console.info(thing.name + " ready");
    });
}).catch(err => {
    throw "Couldnt connect to servient"
});