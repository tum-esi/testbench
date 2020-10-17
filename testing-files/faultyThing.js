var Servient = require("@node-wot/core").Servient
var HttpServer = require("@node-wot/binding-http").HttpServer
var CoapServer = require("@node-wot/binding-coap").CoapServer
var fs = require('fs');
var util = require('util');

var log_file = fs.createWriteStream(__dirname + '/faultyThing.debug.log', {flags : 'w'});

console.log = function(d) { //
  log_file.write(util.format(d) + '\n');
};

let srv = new Servient({
    "log":{
        "level": 0
    }
})
let httpSrvObj = { port: 8083 }
srv.addServer(new HttpServer(httpSrvObj))
let coapSrvObj = { port: 8084 }
srv.addServer(new CoapServer(coapSrvObj))

srv.start().then((WoT) => {
    console.log("* started servient")
    WoT.produce({
        title: "TestServient",
        description: "Test servient that can be used as a servient to be tested with the WoT Test Bench",
        properties: {
            display: {
                type: "string",
                readOnly: false,
                observable: true,
            },
            counter: {
                type: "number",
                readOnly: false,
                observable: true,
            },
            temperature: {
                type: "number",
                readOnly: true,
                observable: false,
            },
            faultyPercent: {
                type: "number",
                minimum: 0.0,
                maximum: 100.0,
                observable: true,
                readOnly: true,
                writeOnly: false,
            },
            wrongWritable: {
                description: "property that says writable but isn't",
                type: "number",
                observable: false,
                readOnly: false,
                writeOnly: false,
            },
            wrongDataTypeNumber: {
                description: "property that returns a different data type than the one described",
                type: "number",
                readOnly: true,
                observable: false,
                writeOnly: false,
            },
            wrongDataTypeObject: {
                description: "property that doesn't return a key that is required",
                type: "object",
                readOnly: true,
                writeOnly: false,
                observable: false,
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
                required: ["brightness", "status"],
            },
            testArray: {
                type: "array",
                items: {
                    type: "number",
                },
                readOnly: false,
                writeOnly: false,
                observable: false,
            },
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
                            minimum: 0,
                            maximum: 100,
                        },
                        status: {
                            type: "string",
                        },
                    },
                },
            },
            longTakingAction: {
                description: "Action that can fail because of taking longer than usual (5s)",
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
            failEvent: {
                data: {
                    type: "number",
                },
            },
        },
        id: "urn:uuid:560290c8-6490-4a58-99ca-eea9bc8c25d2",
    })

        .then((thing) => {
            thing.writeProperty("display", "initialization string")
            thing.writeProperty("wrongWritable", 15)

            thing.setPropertyWriteHandler("wrongWritable", async () => {
                console.log("Writing the old value.")
                return 15
            })

            thing.writeProperty("temperature", true)
            thing.writeProperty("wrongDataTypeNumber", "this is not a number")
            thing.writeProperty("wrongDataTypeObject", {
                brightness: 99.99,
            })
            thing.writeProperty("testArray", [12, 15, 10])

            thing.setActionHandler("setCounter", async (input) => {
                console.log("* ACTION HANDLER FUNCTION for setCounter")
                console.log("* ", input)
                thing.writeProperty("counter", input)
                return "not the expected return value"
            })

            thing.setActionHandler("getTemperature", () => {
                console.log("* ACTION HANDLER FUNCTION for getTemp")
                thing
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
                // This action returns a number, but is supposed to return nothing at all
                return "567"
            })

            thing.setActionHandler("longTakingAction", (input) => {
                console.log("* ACTION HANDLER FUNCTION for longTakingAction")
                var promise1 = new Promise((resolve, reject) => {
                    setTimeout(resolve, 5000, input)
                })
                return promise1
            })

            setInterval(() => {
                thing.emitEvent("failEvent", "not a number so test fails")
            }, 400)

            setInterval(() => {
                thing.writeProperty("counter", true)
                thing.writeProperty("faultyPercent", 300)
                setTimeout(async () => {
                    thing.writeProperty("counter", "not a number")
                    thing.writeProperty("faultyPercent", -400)
                    return
                }, 200)
            }, 400)

            thing.expose().then(() => {
                console.info(thing.title + " ready")
            })
        })
        .catch((err) => {
            throw "Could not connect to servient"
        })
})
