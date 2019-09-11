var Servient = require('thingweb.node-wot/packages/core').Servient;
var HttpServer = require('thingweb.node-wot/packages/binding-http').HttpServer;
var HttpClientFactory = require('thingweb.node-wot/packages/binding-http').HttpClientFactory;
var XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;

let srv = new Servient();
let httpSrvObj = {"port": 8081}
srv.addServer(new HttpServer(httpSrvObj));
srv.addClientFactory(new HttpClientFactory());
srv.start().then(WoT => {

    console.log('* started servient');

    let thing = WoT.produce({
        title: "TestServient",
        description: "Test servient that can be used as a servient to be tested with the WoT Test Bench"
    });

    thing.addProperty("display", {
        type: 'string',
        writable: true,
        observable: true
    }, "initialization string");

    thing.addProperty("counter", {
        type: 'number',
        writable: true,
        observable: true
    }, 0);

    thing.addProperty("temperature", {
        type: 'number',
        writable: false,
        observable: true
    }, 25);

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
            return input;
        });
    });

    thing.addEvent("onChange", {
        type: "number"
    });

    thing.expose().then(() => {
        console.info(thing.title + " ready");
    });
}).catch(err => {
    throw "Couldnt connect to servient"
});
