import { CoapServer } from "@node-wot/binding-coap"
import Servient from "@node-wot/core"

export class CoapThing {
    public thing: WoT.ExposedThing
    public deviceWoT: typeof WoT
    public td: WoT.ExposedThingInit

    private thingModel: WoT.ExposedThingInit = {
        title: "coap-thing-servient",
        description: "Test servient that can be used as a servient to be tested with the WoT Test Bench",
        properties: {
            greetMessage: {
                type: "string",
                observable: true,
                readOnly: false,
                writeOnly: false,
            },
            constantNumber: {
                type: "number",
                observable: false,
                readOnly: true,
                writeOnly: false,
            },
        },
        actions: {
            greet: {
                input: {
                    type: "string",
                },
                output: {
                    type: "string",
                },
            },
        },
        events: {
            update: {
                data: {
                    type: "string",
                },
            },
        },
    }

    private greetMessage: string
    private constantNumber: number

    constructor(deviceWoT: typeof WoT) {
        this.deviceWoT = deviceWoT
        this.greetMessage = "Hello"
        this.constantNumber = 42
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

    private async greetMessageReadHandler() {
        return this.greetMessage
    }

    private async greetMessageWriteHandler(inputData: WoT.InteractionOutput) {
        this.greetMessage = (await inputData.value()) as string
    }

    private async constantNumberReadHandler() {
        return this.constantNumber
    }

    private async greetHandler(inputData: WoT.InteractionOutput): Promise<string> {
        const inputValue = (await inputData.value()) as string

        console.log("* ACTION HANDLER FUNCTION for greet")
        return new Promise((resolve) => {
            resolve(`${this.greetMessage} ${inputValue}`)
        })
    }

    private initializeProperties() {
        this.thing.setPropertyReadHandler("greetMessage", this.greetMessageReadHandler.bind(this))
        this.thing.setPropertyWriteHandler("greetMessage", this.greetMessageWriteHandler.bind(this))
        this.thing.setPropertyReadHandler("constantNumber", this.constantNumberReadHandler.bind(this))
    }

    private initializeActions() {
        this.thing.setActionHandler("greet", async (inputData) => {
            return await this.greetHandler(inputData)
        })
    }

    private initializeEvents() {
        setInterval(() => {
            this.thing.emitEvent("update", "New update!")
        }, 500)
    }
}

const servient = new Servient()
servient.addServer(new CoapServer())

servient
    .start()
    .then(async (WoT) => {
        const thing = new CoapThing(WoT)
        await thing.startDevice()
    })
    .catch((error) => {
        console.log(error)
        servient.shutdown()
    })
