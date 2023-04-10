import Servient from "@node-wot/core"
import { ThingDescription } from "wot-typescript-definitions"
import { testConfig } from "./utilities"
import { Testbench } from "./Testbench"

export class TestbenchThing extends Testbench {
    public thing: WoT.ExposedThing
    public deviceWoT: typeof WoT
    public td: WoT.ExposedThingInit

    private thingModel: WoT.ExposedThingInit = {
        title: "Testbench",
        description:
            "WoT Test Bench tests a Thing by getting its TD and executing all of its interactions with data generated in runtime. " +
            "For simple use, invoke the fastTest action with the TD of your Thing as input data",
        "@context": ["https://www.w3.org/2019/wot/td/v1", { cov: "http://www.example.org/coap-binding#" }],
        properties: {
            testConfig: {
                type: "string",
                writeOnly: false,
                readOnly: false,
                description:
                    "(Optional) Writing to this property configures the Test Bench. TDs with security schemes require this property to " +
                    "contain the security credentials",
            },
            testBenchStatus: {
                type: "string",
                writeOnly: false,
                readOnly: true,
                description: "(not finished) Shows the status of the test bench whether it is currently testing a device or not",
            },
            thingUnderTestTD: {
                type: "object",
                writeOnly: false,
                readOnly: false,
                description: "Write to this property in order to give the TD of your Thing to test. Not necessary for fastTest",
            },
            testData: {
                type: "string",
                writeOnly: false,
                readOnly: false,
                description:
                    "(Optional) This property contains all the data that will be sent by the Test Bench to the Thing under Test. " +
                    "You can also write in custom data",
            },
            testReport: {
                type: "string",
                writeOnly: false,
                readOnly: true,
                description: "Contains all of the outputs of the testing. Not necessary for fastTest",
            },
            heuristicTestReport: {
                type: "object",
                writeOnly: false,
                readOnly: true,
                description: "Contains all of the outputs of the testing. Not necessary for fastTest",
            },
        },
        actions: {
            fastTest: {
                input: {
                    type: "object",
                },
                output: {
                    type: "string",
                },
                description: "Send a TD as input data and it will return a test report once the test has finished",
            },
            initiate: {
                input: {
                    type: "boolean",
                },
                output: {
                    type: "string",
                },
                description: "By invoking this action, the test bench consumes the thing under test, generates the data to be sent. Not necessary for fastTest",
            },
            testThing: {
                input: {
                    type: "boolean",
                },
                output: {
                    type: "boolean",
                },
                description: "By invoking this action, the testing starts and produces a test report that can be read. Not necessary for fastTest",
            },
            testVulnerabilities: {
                input: {
                    type: "boolean",
                },
                description: "Tests some basic security and safety vulnerabilities",
            },
            testOpCov: {
                output: {
                    type: "boolean",
                },
                description: "By invoking this action, the testing starts on the Operation Level",
            },
            testParamCov: {
                output: {
                    type: "boolean",
                },
                description: "By invoking this action, the testing starts on the Paramter Level",
            },
            testInputCov: {
                output: {
                    type: "boolean",
                },
                description: "By invoking this action and all Input Interactions are tested after each other",
            },
            testOutputCov: {
                output: {
                    type: "boolean",
                },
                description: "By invoking this action, the testing starts on the Output Level",
            },
            testAllLevels: {
                input: {
                    type: "boolean",
                },
                output: {
                    type: "boolean",
                },
                description: "By invoking this action, the testing starts on all Level",
            },
        },
    }

    private thingUnderTestTD: ThingDescription
    private testBenchStatus: string

    constructor(deviceWoT: typeof WoT, servient: Servient, tdTitle: string) {
        super(servient)
        this.deviceWoT = deviceWoT
        if (tdTitle) {
            this.thingModel["title"] = tdTitle
        }
    }

    public async startDevice(testConfig: testConfig) {
        this.thing = await this.deviceWoT.produce(this.thingModel)
        this.td = this.thing.getThingDescription()

        this.initializeProperties(testConfig)
        this.initializeActions()

        console.log(`Exposing Thing: ${this.thingModel.title}`)
        await this.thing.expose()
        console.info(this.td.title + " ready")
    }

    private async testConfigReadHandler() {
        return this.getTestConfig()
    }

    private async testConfigWriteHandler(inputData: WoT.InteractionOutput) {
        this.setTestConfig((await inputData.value()) as testConfig)
    }

    private async testBenchStatusReadHandler() {
        return this.testBenchStatus
    }

    private async thingUnderTestTDReadHandler() {
        return this.thingUnderTestTD
    }

    private async thingUnderTestTDWriteHandler(inputData: WoT.InteractionOutput) {
        this.thingUnderTestTD = (await inputData.value()) as ThingDescription
    }

    private async testDataReadHandler() {
        return this.getTestData()
    }

    private async testDataWriteHandler(inputData: WoT.InteractionOutput) {
        this.setTestData((await inputData.value()) as object)
    }

    private async testReportReadHandler() {
        return this.getTestReport()
    }

    private async heuristicTestReportReadHandler() {
        return this.getHeuristicTestReport()
    }

    private async fastTestHandler(inputData: WoT.InteractionOutput) {
        if (inputData) {
            this.thingUnderTestTD = (await inputData.value()) as ThingDescription
        }

        this.getServient().addCredentials((this.getTestConfig() as testConfig).credentials)

        if (JSON.stringify(this.thingUnderTestTD) === "") {
            return "Initiation failed, Thing under Test is an empty string."
        }

        const consumedTuT = await this.deviceWoT.consume(this.thingUnderTestTD)
        return await this.fastTest(true, true, consumedTuT)
    }

    private async initiateHandler(inputData: WoT.InteractionOutput) {
        const logMode = (await inputData.value()) as boolean

        this.getServient().addCredentials((this.getTestConfig() as testConfig).credentials)

        if (JSON.stringify(this.thingUnderTestTD) === "") {
            return "Initiation failed, Thing under Test is an empty string."
        }

        const consumedTuT = await this.deviceWoT.consume(this.thingUnderTestTD as ThingDescription)

        return this.initiate(logMode, consumedTuT)
    }

    private async testThingHandler(inputData: WoT.InteractionOutput): Promise<any> {
        const logMode = (await inputData.value()) as boolean

        return await this.testThing(logMode)
    }

    private async testVulnerabilitiesHandler(inputData: WoT.InteractionOutput): Promise<any> {
        const fastMode = (await inputData.value()) as boolean

        return await this.testVulnerabilities(fastMode)
    }

    private async testOpCovHandler(): Promise<any> {
        await this.testOpCov()
    }

    private async testParamCovHandler(): Promise<any> {
        await this.testParamCov()
    }

    private async testInputCovHandler(): Promise<any> {
        await this.testInputCov()
    }

    private async testOutputCovHandler(): Promise<any> {
        await this.testOutputCov()
    }

    private async testAllLevelsHandler(inputData: WoT.InteractionOutput) {
        if (inputData) {
            this.thingUnderTestTD = (await inputData.value()) as ThingDescription
        }

        const consumedTuT = await this.deviceWoT.consume(this.thingUnderTestTD)
        return await this.testAllLevels(true, consumedTuT)
    }

    private initializeProperties(testConfig: testConfig) {
        this.setTestConfig(testConfig)
        this.thing.setPropertyReadHandler("testConfig", this.testConfigReadHandler.bind(this))
        this.thing.setPropertyWriteHandler("testConfig", this.testConfigWriteHandler.bind(this))
        this.testBenchStatus = ""
        this.thing.setPropertyReadHandler("testBenchStatus", this.testBenchStatusReadHandler.bind(this))
        this.thingUnderTestTD = null
        this.thing.setPropertyReadHandler("thingUnderTestTD", this.thingUnderTestTDReadHandler.bind(this))
        this.thing.setPropertyWriteHandler("thingUnderTestTD", this.thingUnderTestTDWriteHandler.bind(this))
        this.thing.setPropertyReadHandler("testData", this.testDataReadHandler.bind(this))
        this.thing.setPropertyWriteHandler("testData", this.testDataWriteHandler.bind(this))
        this.thing.setPropertyReadHandler("testReport", this.testReportReadHandler.bind(this))
        this.thing.setPropertyReadHandler("heuristicTestReport", this.heuristicTestReportReadHandler.bind(this))
    }

    private initializeActions() {
        this.thing.setActionHandler("initiate", async (inputData) => {
            return await this.initiateHandler(inputData)
        })

        this.thing.setActionHandler("testThing", async (inputData) => {
            return await this.testThingHandler(inputData)
        })

        this.thing.setActionHandler("fastTest", async (inputData) => {
            return await this.fastTestHandler(inputData)
        })

        this.thing.setActionHandler("testVulnerabilities", async (inputData) => {
            return await this.testVulnerabilitiesHandler(inputData)
        })

        this.thing.setActionHandler("testOpCov", async () => {
            return await this.testOpCovHandler()
        })

        this.thing.setActionHandler("testParamCov", async () => {
            return await this.testParamCovHandler()
        })

        this.thing.setActionHandler("testInputCov", async () => {
            return await this.testInputCovHandler()
        })

        this.thing.setActionHandler("testOutputCov", async () => {
            return await this.testOutputCovHandler()
        })

        this.thing.setActionHandler("testAllLevels", async (inputData) => {
            return await this.testAllLevelsHandler(inputData)
        })
    }
}
