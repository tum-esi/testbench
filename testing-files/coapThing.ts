import { CoapServer } from "@node-wot/binding-coap"
import Servient, { ExposedThing } from "@node-wot/core"

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
                // FIXME: Can't make it observable because coap-server call handleUnobserveProperty/handleObserveProperty with null WoT.InteractionOptions, therefore error occurs
                observable: false,
                readOnly: false,
                writeOnly: false,
                forms: [
                    {
                        href: "coap://localhost:5683/coap-thing-servient/properties/greetMessage",
                        contentType: "application/json",
                        op: ["readproperty", "writeproperty"],
                    },
                ],
            },
            constantNumber: {
                type: "number",
                observable: false,
                readOnly: true,
                writeOnly: false,
                forms: [
                    {
                        href: "coap://localhost:5683/coap-thing-servient/properties/constantNumber",
                        contentType: "application/json",
                        op: ["readproperty"],
                    },
                ],
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
                forms: [
                    {
                        href: "coap://localhost:5683/coap-thing-servient/actions/greet",
                        contentType: "application/json",
                        op: "invokeaction",
                    },
                ],
            },
        },
        events: {
            update: {
                data: {
                    type: "string",
                },
                forms: [
                    {
                        href: "coap://localhost:5683/coap-thing-servient/events/update",
                        contentType: "application/json",
                        op: ["subscribeevent", "unsubscribeevent"],
                    },
                ],
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

    public async initDevice() {
        this.thing = await this.deviceWoT.produce(this.thingModel)
        this.td = this.thing.getThingDescription()

        this.initializeProperties()
        this.initializeActions()
        this.initializeEvents()
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

const coapServer = new CoapServer()
const servient = new Servient()

servient
    .start()
    .then(async (WoT) => {
        const thing = new CoapThing(WoT)

        coapServer
            .start(servient)
            .then(async () => {
                console.log("Started Coap Server...")
                await thing.initDevice()

                await coapServer.expose(thing.thing as ExposedThing)
                console.log("Exposed thing...")
            })
            .catch((error) => {
                console.log("Some error happpened...")
                console.log(error)
                coapServer.stop()
            })
    })
    .catch(() => {
        servient.shutdown()
    })
