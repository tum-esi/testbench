import Servient, { ProtocolClientFactory } from "@node-wot/core"
import { ThingDescription } from "wot-typescript-definitions"
import { Tester } from "./Tester"
import { TestReport, TotalReport, VulnerabilityReport } from "./TestReport"
import { detectProtocolSchemes, ListeningType, logFormatted, testConfig } from "./utilities"
import * as fs from "fs"
import { HttpClientFactory, HttpsClientFactory } from "@node-wot/binding-http"
import { CoapClientFactory, CoapsClientFactory } from "@node-wot/binding-coap"
import { MqttClientFactory } from "@node-wot/binding-mqtt"
import { FileClientFactory } from "@node-wot/binding-file"

export class Testbench {
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

    private servient: Servient
    private tester: Tester

    private testConfig: testConfig
    private testBenchStatus: string
    private thingUnderTestTD: object
    private testData: object
    private testReport: any
    private heuristicTestReport: any

    constructor(deviceWoT: typeof WoT, servient: Servient, tdTitle: string) {
        this.heuristicTestReport = {
            T1: [],
            T2: [],
            T3: {},
            T4: [],
        }
        this.deviceWoT = deviceWoT
        this.servient = servient
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
        return this.testConfig
    }

    private async testConfigWriteHandler(inputData: WoT.InteractionOutput) {
        this.testConfig = (await inputData.value()) as testConfig
    }

    private async testBenchStatusReadHandler() {
        return this.testBenchStatus
    }

    private async thingUnderTestTDReadHandler() {
        return this.thingUnderTestTD
    }

    private async thingUnderTestTDWriteHandler(inputData: WoT.InteractionOutput) {
        this.thingUnderTestTD = (await inputData.value()) as object
    }

    private async testDataReadHandler() {
        return this.testData
    }

    private async testDataWriteHandler(inputData: WoT.InteractionOutput) {
        this.testData = (await inputData.value()) as object
    }

    private async testReportReadHandler() {
        return this.testReport
    }

    private async heuristicTestReportReadHandler() {
        return this.heuristicTestReport
    }

    private addClientFactories(td: object) {
        const protocols = detectProtocolSchemes(JSON.stringify(td))
        const existingProtocols = this.servient.getClientSchemes()
        let clientFactory: ProtocolClientFactory

        for (const p of protocols) {
            if (existingProtocols.includes(p)) {
                continue
            }

            let factoryExists = true

            switch (p) {
                case "http":
                    clientFactory = new HttpClientFactory()
                    break
                case "https":
                    clientFactory = new HttpsClientFactory()
                    break
                case "coap":
                    clientFactory = new CoapClientFactory()
                    break
                case "coaps":
                    clientFactory = new CoapsClientFactory()
                    break
                case "mqtt":
                    clientFactory = new MqttClientFactory()
                    break
                case "file":
                    clientFactory = new FileClientFactory()
                    break
                default:
                    factoryExists = false
                    break
            }

            if (factoryExists) {
                clientFactory.init()
                this.servient.addClientFactory(clientFactory)
            }
        }
    }

    private async fastTest(td: object) {
        this.thingUnderTestTD = td

        await this.initiate(true)
        await this.testThing(true)
        const conformanceReport = this.testReport

        await this.testVulnerabilities(true)
        const vulnerabilityReport = this.testReport

        this.testReport = new TotalReport(conformanceReport as TestReport, vulnerabilityReport as VulnerabilityReport)
        return this.testReport
    }

    private async fastTestHandler(inputData: WoT.InteractionOutput) {
        let thingTD
        if (inputData) {
            thingTD = await inputData.value()
        }

        return await this.fastTest(thingTD)
    }

    private async initiate(logMode: boolean) {
        this.servient.addCredentials((this.testConfig as testConfig).credentials)

        if (JSON.stringify(this.thingUnderTestTD) === "") {
            return "Initiation failed, Thing under Test is an empty string."
        }

        this.addClientFactories(this.thingUnderTestTD)
        const consumedTuT = await this.deviceWoT.consume(this.thingUnderTestTD as ThingDescription)
        this.tester = new Tester(this.testConfig as testConfig, consumedTuT)
        const returnCheck = this.tester.initiate(logMode)
        this.testData = this.tester.codeGen.requests

        if (returnCheck === 0) {
            this.heuristicTestReport = {
                T1: [],
                T2: [],
                T3: this.tester.inputTestReport,
                T4: [],
            }
            return "Initiation was successful."
        } else {
            return "Initiation was successful, but no interactions were found."
        }
    }

    private async initiateHandler(inputData: WoT.InteractionOutput) {
        const logMode = (await inputData.value()) as boolean

        return await this.initiate(logMode)
    }

    private async testThing(logMode: boolean) {
        fs.writeFileSync(this.testConfig.TestDataLocation, JSON.stringify(this.testData, null, " "))
        logFormatted("------ START OF TESTTHING METHOD ------")
        try {
            this.testReport = await this.tester.firstTestingPhase(this.testConfig.Repetitions, this.testConfig.Scenarios, logMode)
            this.testReport.printResults(ListeningType.Asynchronous)
        } catch {
            logFormatted(":::::ERROR::::: TestThing: Error during first test phase.")
            return
        }

        if (this.testConfig.EventAndObservePOptions.Synchronous.isEnabled) await this.runSecondTestingPhase()
        return
    }

    private async runSecondTestingPhase() {
        try {
            const testReportHasChanged: boolean = await this.tester.secondTestingPhase(this.testConfig.Repetitions)
            this.testReport.storeReport(this.testConfig.TestReportsLocation, "Testbench Thing")
            if (testReportHasChanged) {
                this.testReport.printResults(ListeningType.Synchronous)
            }
        } catch {
            logFormatted(":::::ERROR::::: TestThing: Error during second test phase.")
        }
    }

    private async testThingHandler(inputData: WoT.InteractionOutput): Promise<any> {
        const logMode = (await inputData.value()) as boolean

        return await this.testThing(logMode)
    }

    private async testVulnerabilities(fastMode: boolean) {
        this.testReport = await this.tester.testVulnerabilities(fastMode)
    }

    private async testVulnerabilitiesHandler(inputData: WoT.InteractionOutput): Promise<any> {
        const fastMode = (await inputData.value()) as boolean

        return await this.testVulnerabilities(fastMode)
    }

    private async testOpCov() {
        logFormatted("------ START OF Operational Testing ------")
        try {
            this.heuristicTestReport["T1"] = await this.tester.testingOpCov()
        } catch {
            logFormatted(":::::ERROR::::: TestThing: Error during Operational test phase.")
            return
        }

        try {
            await this.tester.secondTestingPhase(this.testConfig.Repetitions)
        } catch {
            logFormatted(":::::ERROR::::: TestThing: Error during second test phase.")
        }

        return
    }

    private async testOpCovHandler(): Promise<any> {
        await this.testOpCov()
    }

    private async testParamCov() {
        logFormatted("------ START OF Parameter Testing ------")

        try {
            this.heuristicTestReport["T2"] = await this.tester.testingParamCov()
        } catch {
            logFormatted(":::::ERROR::::: TestThing: Error during Parameter test phase.")
        }
    }

    private async testParamCovHandler(): Promise<any> {
        await this.testParamCov()
    }

    private async testInputCov() {
        fs.writeFileSync(this.testConfig.TestDataLocation, JSON.stringify(this.testData, null, " "))
        logFormatted("------ START OF Input Testing ------")
        try {
            this.heuristicTestReport["T3"] = await this.tester.testingInputCov(this.heuristicTestReport["T3"])
        } catch {
            logFormatted(":::::ERROR::::: TestThing: Error during Input test phase.")
        }
    }

    private async testInputCovHandler(): Promise<any> {
        await this.testInputCov()
    }

    private async testOutputCov() {
        logFormatted("------ START OF Output Testing ------")
        try {
            this.heuristicTestReport["T4"] = await this.tester.testingOutputCov()
        } catch {
            logFormatted(":::::ERROR::::: TestThing: Error during Output test phase.")
        }
    }

    private async testOutputCovHandler(): Promise<any> {
        await this.testOutputCov()
    }

    private async testAllLevels(td: object) {
        this.thingUnderTestTD = td
        await this.initiate(true)
        await this.testOpCov()
        await this.testParamCov()
        await this.testInputCov()
        await this.testOutputCov()

        this.tester.testingResult(this.heuristicTestReport)
        return this.heuristicTestReport
    }

    private async testAllLevelsHandler(inputData: WoT.InteractionOutput) {
        const td = (await inputData.value()) as object

        return await this.testAllLevels(td)
    }

    private initializeProperties(testConfig) {
        this.testConfig = testConfig
        this.thing.setPropertyReadHandler("testConfig", this.testConfigReadHandler.bind(this))
        this.thing.setPropertyWriteHandler("testConfig", this.testConfigWriteHandler.bind(this))
        this.testBenchStatus = ""
        this.thing.setPropertyReadHandler("testBenchStatus", this.testBenchStatusReadHandler.bind(this))
        this.thingUnderTestTD = {}
        this.thing.setPropertyReadHandler("thingUnderTestTD", this.thingUnderTestTDReadHandler.bind(this))
        this.thing.setPropertyWriteHandler("thingUnderTestTD", this.thingUnderTestTDWriteHandler.bind(this))
        this.thing.setPropertyReadHandler("testData", this.testDataReadHandler.bind(this))
        this.thing.setPropertyWriteHandler("testData", this.testDataWriteHandler.bind(this))
        this.testReport = "[]"
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
