import { Servient } from "@node-wot/core"
import { HttpClientFactory, HttpsClientFactory, HttpServer } from "@node-wot/binding-http"
import { CoapServer } from "@node-wot/binding-coap"

const srv = new Servient()
const httpSrvObj = { port: 8083 }
srv.addServer(new HttpServer(httpSrvObj))
const coapSrvPort = 8084
srv.addServer(new CoapServer(coapSrvPort))

srv.addClientFactory(new HttpClientFactory(httpSrvObj))
srv.addClientFactory(new HttpsClientFactory(httpSrvObj))

srv.start().then(async (WoT) => {
    console.log("* started servient")
    const faultyThing = new FaultyThing(WoT)
    await faultyThing.startDevice()
})

export class FaultyThing {
    public thing: WoT.ExposedThing
    public deviceWoT: typeof WoT
    public td: WoT.ExposedThingInit

    private thingModel: WoT.ExposedThingInit = {
        title: "faulty-thing-servient",
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
    }

    private display: string
    private counter: number
    private temperature: number
    private faultyPercent: number
    private wrongWritable: number
    private wrongDataTypeNumber: number
    private wrongDataTypeObject: object
    private testArray: number[]

    constructor(deviceWoT: typeof WoT) {
        this.deviceWoT = deviceWoT
        this.display = "initialization string"
        this.wrongWritable = 15
        this.testArray = [12, 15, 10]
    }

    public async startDevice() {
        this.thing = await this.deviceWoT.produce(this.thingModel)
        this.td = this.thing.getThingDescription()

        this.initializeProperties()
        this.initializeActions()
        this.initializeEvents()

        console.log(`Exposing Thing: ${this.thingModel.title}`)
        await this.thing.expose()
        console.info(this.td.title + " ready")
    }

    private async displayReadHandler() {
        return this.display
    }

    private async displayWriteHandler(inputData: WoT.InteractionOutput) {
        this.display = (await inputData.value()) as string
    }

    private async counterReadHandler() {
        return this.counter
    }

    private async counterWriteHandler(inputData: WoT.InteractionOutput) {
        this.counter = (await inputData.value()) as number
    }

    private async temperatureReadHandler() {
        return this.temperature
    }

    private async faultyPercentReadHandler() {
        return this.faultyPercent
    }

    private async wrongWritableReadHandler() {
        return this.wrongWritable
    }

    private async wrongWritableWriteHandler(inputData: WoT.InteractionOutput) {
        this.wrongWritable = 15
    }

    private async wrongDataTypeNumberReadHandler() {
        return this.wrongDataTypeNumber
    }

    private async wrongDataTypeObjectReadHandler() {
        return this.wrongDataTypeObject
    }

    private async testArrayReadHandler() {
        return this.testArray
    }

    private async testArrayWriteHandler(inputData: WoT.InteractionOutput) {
        this.testArray = (await inputData.value()) as number[]
    }

    private async setCounterHandler(inputData: WoT.InteractionOutput): Promise<any> {
        const inputValue = (await inputData.value()) as number

        console.log("* ACTION HANDLER FUNCTION for setCounter")
        console.log("* ", inputValue)

        this.counter = inputValue
        return "not the expected return value"
    }

    private async getTemperatureHandler(): Promise<number> {
        console.log("* ACTION HANDLER FUNCTION for getTemp")

        return this.temperature
    }

    private async setDisplayHandler(inputData: WoT.InteractionOutput): Promise<string> {
        const inputValue = (await inputData.value()) as string

        console.log("* ACTION HANDLER FUNCTION for setDisplay")
        console.log("* ", inputValue)

        return new Promise((resolve, reject) => {
            resolve("Display set")
        })
    }

    private async setTestObjectHandler(inputData: WoT.InteractionOutput): Promise<any> {
        const inputValue = (await inputData.value()) as object

        console.log("* ACTION HANDLER FUNCTION for setTestObject")
        console.log("* ", inputValue)
        // This action returns a number, but is supposed to return nothing at all
        return "567"
    }

    private async longTakingActionHandler(inputData: WoT.InteractionOutput): Promise<number[]> {
        const inputValue = (await inputData.value()) as number[]

        console.log("* ACTION HANDLER FUNCTION for longTakingAction")

        return new Promise((resolve, reject) => {
            setTimeout(resolve, 5000, inputValue)
        })
    }

    private initializeProperties() {
        this.thing.setPropertyReadHandler("display", this.displayReadHandler.bind(this))
        this.thing.setPropertyWriteHandler("display", this.displayWriteHandler.bind(this))
        this.thing.setPropertyReadHandler("counter", this.counterReadHandler.bind(this))
        this.thing.setPropertyWriteHandler("counter", this.counterWriteHandler.bind(this))
        this.thing.setPropertyReadHandler("temperature", this.temperatureReadHandler.bind(this))
        this.thing.setPropertyReadHandler("faultyPercent", this.faultyPercentReadHandler.bind(this))
        this.thing.setPropertyReadHandler("wrongWritable", this.wrongWritableReadHandler.bind(this))
        this.thing.setPropertyWriteHandler("wrongWritable", this.wrongWritableWriteHandler.bind(this))
        this.thing.setPropertyReadHandler("wrongDataTypeNumber", this.wrongDataTypeNumberReadHandler.bind(this))
        this.thing.setPropertyReadHandler("wrongDataTypeObject", this.wrongDataTypeObjectReadHandler.bind(this))
        this.thing.setPropertyReadHandler("testArray", this.testArrayReadHandler.bind(this))
        this.thing.setPropertyWriteHandler("testArray", this.testArrayWriteHandler.bind(this))
    }

    private initializeActions() {
        this.thing.setActionHandler("setCounter", (inputData) => {
            return this.setCounterHandler(inputData)
        })

        this.thing.setActionHandler("getTemperature", () => {
            return this.getTemperatureHandler()
        })

        this.thing.setActionHandler("setDisplay", (inputData) => {
            return this.setDisplayHandler(inputData)
        })

        this.thing.setActionHandler("setTestObject", (inputData) => {
            return this.setTestObjectHandler(inputData)
        })

        this.thing.setActionHandler("longTakingAction", (inputData) => {
            return this.longTakingActionHandler(inputData)
        })
    }

    private initializeEvents() {
        setInterval(() => {
            this.thing.emitEvent("failEvent", "not a number so test fails")
        }, 400)

        setInterval(() => {
            this.faultyPercent = 300
            setTimeout(async () => {
                this.faultyPercent = -400
            }, 200)
        }, 400)
    }
}
