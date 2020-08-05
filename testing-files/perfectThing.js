var Servient = require('@node-wot/core').Servient;
var HttpServer = require('@node-wot/binding-http').HttpServer;
var CoapServer = require('@node-wot/binding-coap').CoapServer;

let srv = new Servient();
let httpSrvObj = {"port": 8081}
srv.addServer(new HttpServer(httpSrvObj));
let coapSrvObj = {"port": 8082}
srv.addServer(new CoapServer(coapSrvObj));

srv.start().then(WoT => {
    console.log('* started servient');
    let thing = WoT.produce({
        title: "TestServient",
        description: "Test servient that can be used as a servient to be tested with the WoT Test Bench",
        properties: {
            display: {
                type: 'string',
                observable: true
            },
            counter: {
                type: 'number',
                observable: true
            },
            temperature: {
                type: 'number',
                readOnly: true,
                observable: true
            },
            testObject: {
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
                }
            },
            testArray:{
                type: "array",
                items: {
                    type: "number"
                }
            },
        },
        actions: {
            setCounter:{
                input: {
                    type: 'number'
                }
            },
            getTemperature: {
                output: {
                    type: "number"
                }
            },
            setDisplay: {
                input: {
                    type: "string"
                },
                output: {
                    type: "string"
                }
            },
            setTestObject: {
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
            },
            setTestArray: {
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
            }
        },
        events: {
            onChange: {
                type: "number"
            }
        }
    })
    
        .then((thing) => {
            thing.writeProperty("display", "initialization string");
            thing.writeProperty("counter", 0);
            thing.writeProperty("temperature", 25);
            thing.writeProperty("testObject", {
                "brightness": 99.99,
                "status": "exampleString"
            });
            thing.writeProperty("testArray", [12, 15, 10]);

            thing.setActionHandler("setCounter", (input) => {
                console.log("* ACTION HANDLER FUNCTION for setCounter");
                console.log("* ", input);
                return thing.writeProperty("counter", input).then(() => {
                    console.log('* Set counter successful');
                    return
                }).catch(() => {
                    console.log('* Set counter failed');
                    return
                });
            });

            thing.setActionHandler("getTemperature", () => {
                console.log("* ACTION HANDLER FUNCTION for getTemp");
                return thing.readProperty("temperature").then((temp) => {
                    console.log('* getTemperature successful');
                    return temp;
                }).catch(() => {
                    console.log('* getTemperature failed');
                    return 0;
                });
            });

            thing.setActionHandler("setDisplay", (input) => {
                    console.log("* ACTION HANDLER FUNCTION for setDisplay");
                    console.log("* ", input);
                    return new Promise((resolve, reject) => {
                        resolve("Display set");
                    });
                });

            thing.setActionHandler("setTestObject", (input) => {
                console.log("* ACTION HANDLER FUNCTION for setTestObject");
                console.log("* ", input);
                return thing.writeProperty("testObject", input).then(() => input, () => false);
            });

            thing.setActionHandler("setTestArray", (input) => {
                console.log("* ACTION HANDLER FUNCTION for setTestArray");
                console.log("* ", input);
                return thing.writeProperty("testArray", input).then(() => {
                    return input;
                });
            });

            thing.expose().then(() => {
                console.info(thing.title + " ready");
            });
        })
        .catch(err => {
            throw "Could not connect to servient"
        });
});