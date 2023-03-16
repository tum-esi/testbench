import { Servient } from "@node-wot/core"
import { HttpClientFactory, HttpsClientFactory, HttpServer } from "@node-wot/binding-http"
import { CoapServer } from "@node-wot/binding-coap"

const srv = new Servient()
const httpSrvObj = { port: 8081 }
srv.addServer(new HttpServer(httpSrvObj))
const coapSrvPort = 8082
srv.addServer(new CoapServer(coapSrvPort))

srv.addClientFactory(new HttpClientFactory(httpSrvObj))
srv.addClientFactory(new HttpsClientFactory(httpSrvObj))

srv.start()
    .then(async (WoT) => {
        console.log("* started servient")
        const perfectThing = new PerfectThing(WoT)
        await perfectThing.startDevice()
    })
    .catch(() => {
        console.log("* Failed to start servient!")
        srv.shutdown()
    })

export class PerfectThing {
    public thing: WoT.ExposedThing
    public deviceWoT: typeof WoT
    public td: WoT.ExposedThingInit

    private thingModel: WoT.ExposedThingInit = {
        title: "perfect-thing-servient",
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
    }

    private display: string
    private counter: number
    private temperature: number
    private testObject: object
    private testArray: number[]

    constructor(deviceWoT: typeof WoT) {
        this.deviceWoT = deviceWoT
        this.display = "initialization string"
        this.counter = 0
        this.temperature = 25
        this.testObject = {
            brightness: 99.99,
            status: "exampleString",
        }
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

    private async testObjectReadHandler() {
        return this.testObject
    }

    private async testObjectWriteHandler(inputData: WoT.InteractionOutput) {
        this.testObject = (await inputData.value()) as object
    }

    private async testArrayReadHandler() {
        return this.testArray
    }

    private async testArrayWriteHandler(inputData: WoT.InteractionOutput) {
        this.testArray = (await inputData.value()) as [number]
    }

    private async setCounterHandler(inputData: WoT.InteractionOutput): Promise<any> {
        const inputValue = (await inputData.value()) as number

        console.log("* ACTION HANDLER FUNCTION for setCounter")
        console.log("* ", inputValue)
        this.counter = inputValue
    }

    private async getTemperatureHandler(): Promise<any> {
        console.log("* ACTION HANDLER FUNCTION for getTemp")

        return this.temperature
    }

    private async setDisplayHandler(inputData: WoT.InteractionOutput): Promise<any> {
        const inputValue = (await inputData.value()) as string

        console.log("* ACTION HANDLER FUNCTION for setDisplay")
        console.log("* ", inputValue)

        this.display = inputValue
    }

    private async setTestObjectHandler(inputData: WoT.InteractionOutput): Promise<any> {
        const inputValue = (await inputData.value()) as object

        console.log("* ACTION HANDLER FUNCTION for setTestObject")
        console.log("* ", inputValue)

        this.testObject = inputValue
    }

    private async setTestArrayHandler(inputData: WoT.InteractionOutput): Promise<any> {
        const inputValue = (await inputData.value()) as number[]

        console.log("* ACTION HANDLER FUNCTION for setTestArray")
        console.log("* ", inputValue)

        this.testArray = inputValue
    }

    private initializeProperties() {
        this.thing.setPropertyReadHandler("display", this.displayReadHandler.bind(this))
        this.thing.setPropertyWriteHandler("display", this.displayWriteHandler.bind(this))
        this.thing.setPropertyReadHandler("counter", this.counterReadHandler.bind(this))
        this.thing.setPropertyWriteHandler("counter", this.counterWriteHandler.bind(this))
        this.thing.setPropertyReadHandler("temperature", this.temperatureReadHandler.bind(this))
        this.thing.setPropertyReadHandler("testObject", this.testObjectReadHandler.bind(this))
        this.thing.setPropertyWriteHandler("testObject", this.testObjectWriteHandler.bind(this))
        this.thing.setPropertyReadHandler("testArray", this.testArrayReadHandler.bind(this))
        this.thing.setPropertyWriteHandler("testArray", this.testArrayWriteHandler.bind(this))
    }

    private initializeActions() {
        this.thing.setActionHandler("setCounter", async (inputData) => {
            return await this.setCounterHandler(inputData)
        })

        this.thing.setActionHandler("getTemperature", async () => {
            return await this.getTemperatureHandler()
        })

        this.thing.setActionHandler("setDisplay", async (inputData) => {
            return await this.setDisplayHandler(inputData)
        })

        this.thing.setActionHandler("setTestObject", async (inputData) => {
            return await this.setTestObjectHandler(inputData)
        })

        this.thing.setActionHandler("setTestArray", async (inputData) => {
            return await this.setTestArrayHandler(inputData)
        })
    }

    private initializeEvents() {
        setInterval(() => {
            this.thing.emitEvent("onChange", 42)
        }, 400)

        setInterval(() => {
            this.temperature = -12
            setTimeout(() => {
                this.temperature = 42
            }, 400)
        }, 800)
    }
}
