var Servient = require("@node-wot/core").Servient
var HttpServer = require("@node-wot/binding-http").HttpServer
var CoapServer = require("@node-wot/binding-coap").CoapServer
var fs = require("fs");
var util = require('util');

var log_file = fs.createWriteStream(__dirname + '/perfectThing.debug.log', {flags : 'w'});
var log_stdout = process.stdout;

console.log = function(d) { //
  log_file.write(util.format(d) + '\n');
};

let srv = new Servient()
let httpSrvObj = { port: 8081 }
srv.addServer(new HttpServer(httpSrvObj))
let coapSrvObj = { port: 8082 }
srv.addServer(new CoapServer(coapSrvObj))

srv.start().then((WoT) => {
    console.log("* started servient")
    WoT.produce({
        title: "TestServient",
        description: "Test servient that can be used as a servient to be tested with the WoT Test Bench",
        properties: {
            display: {
                type: "string",
                observable: true,
                readOnly: false,
                writeOnly: false,
            },
            counter: {
                type: "number",
                observable: false,
                readOnly: false,
                writeOnly: false,
            },
            temperature: {
                type: "number",
                readOnly: true,
                observable: true,
                writeOnly: false,
            },
            testObject: {
                type: "object",
                properties: {
                    brightness: {
                        type: "number",
                        minimum: 0.0,
                        maximum: 100.0,
                    },
                    status: {
                        type: "string",
                    },
                },
                readOnly: false,
                writeOnly: false,
                observable: false,
            },
            testArray: {
                type: "array",
                items: {
                    type: "number",
                },
                readOnly: false,
                writeOnly: false,
                observable: false,
            }
        },
        actions: {
            setCounter: {
                input: {
                    type: "number",
                },
            },
            getTemperature: {
                output: {
                    type: "number",
                },
            },
            setDisplay: {
                input: {
                    type: "string",
                },
                output: {
                    type: "string",
                },
            },
            setTestObject: {
                input: {
                    type: "object",
                    properties: {
                        brightness: {
                            type: "number",
                            minimum: 0.0,
                            maximum: 100.0,
                        },
                        status: {
                            type: "string",
                        },
                    },
                },
            },
            setTestArray: {
                input: {
                    type: "array",
                    items: {
                        type: "number",
                    },
                },
                output: {
                    type: "array",
                    items: {
                        type: "number",
                    },
                },
            },
        },
        events: {
            onChange: {
                data: {
                    type: "number",
                },
            },
            onChangeTimeout: {
                data: {
                    type: "number",
                },
            },
        },
        id: "urn:uuid:3999c3d8-1b55-4c05-bc63-c91f0981cf36",
    })

        .then((thing) => {
            thing.writeProperty("display", "initialization string")
            thing.writeProperty("counter", 0)
            thing.writeProperty("temperature", 25)
            thing.writeProperty("testObject", {
                brightness: 99.99,
                status: "exampleString",
            })
            thing.writeProperty("testArray", [12, 15, 10])

            thing.setActionHandler("setCounter", (input) => {
                console.log("* ACTION HANDLER FUNCTION for setCounter")
                console.log("* ", input)
                return thing
                    .writeProperty("counter", input)
                    .then(() => {
                        console.log("* Set counter successful")
                        return
                    })
                    .catch(() => {
                        console.log("* Set counter failed")
                        return
                    })
            })

            thing.setActionHandler("getTemperature", () => {
                console.log("* ACTION HANDLER FUNCTION for getTemp")
                return thing
                    .readProperty("temperature")
                    .then((temp) => {
                        console.log("* getTemperature successful")
                        return temp
                    })
                    .catch(() => {
                        console.log("* getTemperature failed")
                        return 0
                    })
            })

            thing.setActionHandler("setDisplay", (input) => {
                console.log("* ACTION HANDLER FUNCTION for setDisplay")
                console.log("* ", input)
                return new Promise((resolve, reject) => {
                    resolve("Display set")
                })
            })

            thing.setActionHandler("setTestObject", (input) => {
                console.log("* ACTION HANDLER FUNCTION for setTestObject")
                console.log("* ", input)
                return thing.writeProperty("testObject", input)
            })

            thing.setActionHandler("setTestArray", (input) => {
                console.log("* ACTION HANDLER FUNCTION for setTestArray")
                console.log("* ", input)
                return thing.writeProperty("testArray", input).then(() => {
                    return input
                })
            })

            // Emit Event each Interval.
            setInterval(() => {
                thing.emitEvent("onChange", 42)
            }, 400)

            // Alternate property each Interval.
            setInterval(() => {
                thing.writeProperty("temperature", -12)
                setTimeout(async () => {
                    await thing.writeProperty("temperature", 42)
                    return
                }, 400)
            }, 800)

            thing.expose().then(() => {
                console.info(thing.title + " ready")
            })
        })
        .catch((err) => {
            throw "Could not connect to servient"
        })
})
