import { MqttBrokerServer, MqttBrokerServerConfig } from "@node-wot/binding-mqtt"
import Servient, { ExposedThing } from "@node-wot/core"

export class MqttThing {
    public thing: WoT.ExposedThing
    public deviceWoT: typeof WoT
    public td: WoT.ExposedThingInit

    private thingModel: WoT.ExposedThingInit = {
        title: "mqtt-thing-servient",
        description: "Test servient that can be used as a servient to be tested with the WoT Test Bench",
        properties: {
            greetMessage: {
                type: "string",
                observable: false,
                readOnly: false,
                writeOnly: false,
                forms: [
                    {
                        href: "mqtt://localhost:1883/mqtt-thing-servient/properties/greetMessage",
                        contentType: "application/json",
                        op: ["readproperty"],
                    },
                    {
                        href: "mqtt://localhost:1883/mqtt-thing-servient/properties/greetMessage/writeProperty",
                        contentType: "application/json",
                        op: ["writeproperty"],
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
                        href: "mqtt://localhost:1883/mqtt-thing-servient/properties/constantNumber",
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
                        href: "mqtt://localhost:1883/mqtt-thing-servient/actions/greet",
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
                        href: "mqtt://localhost:1883/mqtt-thing-servient/events/update",
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

const config: MqttBrokerServerConfig = { uri: "localhost:1883", selfHost: true }

const server = new MqttBrokerServer(config)
const servient = new Servient()

servient
    .start()
    .then(async (WoT) => {
        server
            .start(servient)
            .then(async () => {
                console.log("Started Mqtt Server...")
                const thing = new MqttThing(WoT)
                await thing.initDevice()

                await server.expose(thing.thing as ExposedThing)
                console.log("Exposed thing...")
            })
            .catch((error) => {
                console.log("Some error happpened...")
                console.log(error)
                server.stop()
            })
    })
    .catch(() => {
        servient.shutdown()
    })
