import { FileClientFactory } from "@node-wot/binding-file"
import { HttpServer } from "@node-wot/binding-http"
import Servient from "@node-wot/core"

const srv = new Servient()
const httpSrvObj = { port: 8081 }
srv.addServer(new HttpServer(httpSrvObj))

srv.addClientFactory(new FileClientFactory())

srv.start()
    .then(async (WoT) => {
        console.log("* started servient")
        const perfectThing = new FileThing(WoT)
        await perfectThing.startDevice()
    })
    .catch(() => {
        console.log("* Failed to start servient!")
        srv.shutdown()
    })

export class FileThing {
    public thing: WoT.ExposedThing
    public deviceWoT: typeof WoT
    public td: WoT.ExposedThingInit

    private thingModel: WoT.ExposedThingInit = {
        title: "file-thing-servient",
        description: "Test servient that can be used as a servient to be tested with the WoT Test Bench",
        properties: {
            fileContent: {
                type: "string",
                observable: false,
                readOnly: false,
                writeOnly: false,
            },
        },
    }

    private fileContent: string

    constructor(deviceWoT: typeof WoT) {
        this.deviceWoT = deviceWoT
        this.fileContent = ""
    }

    public async startDevice() {
        this.thing = await this.deviceWoT.produce(this.thingModel)
        this.td = this.thing.getThingDescription()

        this.initializeProperties()

        console.log(`Exposing Thing: ${this.thingModel.title}`)
        await this.thing.expose()
        console.info(this.td.title + " ready")
    }

    private async fileContentReadHandler() {
        return this.fileContent
    }

    private async fileContentWriteHandler(inputData: WoT.InteractionOutput) {
        this.fileContent = (await inputData.value()) as string
    }

    private initializeProperties() {
        this.thing.setPropertyReadHandler("fileContent", this.fileContentReadHandler.bind(this))
        this.thing.setPropertyWriteHandler("fileContent", this.fileContentWriteHandler.bind(this))
    }
}
