var Servient = require("@node-wot/core").Servient
var HttpServer = require("@node-wot/binding-http").HttpServer
var CoapServer = require("@node-wot/binding-coap").CoapServer

let srv = new Servient()
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
                observable: true,
            },
            wrongWritable: {
                description: "property that says writable but isn't",
                type: "number",
                observable: true,
            },
            wrongDataTypeNumber: {
                description: "property that returns a different data type than the one described",
                type: "number",
                readOnly: true,
                observable: true,
            },
            wrongDataTypeObject: {
                description: "property that doesn't return a key that is required",
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
                required: ["brightness", "status"],
            },
            testArray: {
                type: "array",
                items: {
                    type: "number",
                },
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
                type: "number",
            },
        },
        id: "urn:uuid:560290c8-6490-4a58-99ca-eea9bc8c25d2",
    })

        .then((thing) => {
            thing.writeProperty("display", "initialization string")
            thing.writeProperty("wrongWritable", 15)

            thing.setPropertyWriteHandler("wrongWritable", () => {
                return new Promise(function (resolve, reject) {
                    console.log("Writing the old value")
                    thing.writeProperty("wrongWritable", 15)
                    resolve(15)
                })
                // return thing.properties["wrongWritable"].write(15).then(() => 15, () => false);
            })

            thing.writeProperty("wrongDataTypeNumber", "this is not a number")
            thing.writeProperty("wrongDataTypeObject", {
                brightness: 99.99,
            })
            thing.writeProperty("testArray", [12, 15, 10])

            thing.setActionHandler("setCounter", (input) => {
                console.log("* ACTION HANDLER FUNCTION for setCounter")
                console.log("* ", input)
                thing
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
                return thing.writeProperty("testObject", input).then(
                    () => input,
                    () => false
                )
            })

            thing.setActionHandler("longTakingAction", (input) => {
                console.log("* ACTION HANDLER FUNCTION for longTakingAction")
                var promise1 = new Promise(function (resolve, reject) {
                    setTimeout(resolve, 5000, input)
                })
                return promise1
            })

            setInterval(myEventCallback, 400)
            function myEventCallback() {
                thing.emitEvent("onChange", "notANumber")
            }

            thing.expose().then(() => {
                console.info(thing.title + " ready")
            })
        })
        .catch((err) => {
            throw "Could not connect to servient"
        })
})
