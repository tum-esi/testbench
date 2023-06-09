import { detectProtocolSchemes, ListeningType, logFormatted, ProtocolType, testConfig } from "./utilities"
import { Tester } from "./Tester"
import * as fs from "fs"
import { TotalReport, TestReport, VulnerabilityReport } from "./TestReport"
import Servient, { ProtocolClientFactory } from "@node-wot/core"
import { CoapClientFactory, CoapsClientFactory } from "@node-wot/binding-coap"
import { FileClientFactory } from "@node-wot/binding-file"
// import { FirestoreClientFactory } from "@node-wot/binding-firestore"
import { HttpClientFactory, HttpsClientFactory } from "@node-wot/binding-http"
import { ModbusClientFactory } from "@node-wot/binding-modbus"
import { MqttClientFactory, MqttsClientFactory } from "@node-wot/binding-mqtt"
import { NetconfClientFactory } from "@node-wot/binding-netconf"
// FIXME: Getting "Error: Cannot find schema for simple type Variant", might be because of deprecated node-opcua packages
// import { OPCUAClientFactory } from "@node-wot/binding-opcua"
import { WebSocketClientFactory } from "@node-wot/binding-websockets"
import { defaultConfig } from "./defaults"

export class Testbench {
    private servient: Servient
    private tester: Tester
    private testConfig: testConfig
    private testData: object
    private testReport: any
    private heuristicTestReport: any

    constructor(servient: Servient) {
        this.servient = servient
        this.testReport = "[]"
        this.heuristicTestReport = {
            OpCov: [],
            ParamCov: [],
            InputCov: {},
            OutputCov: [],
        }
    }

    public getServient() {
        return this.servient
    }

    public getTestConfig() {
        return this.testConfig
    }

    public setTestConfig(testConfig: testConfig) {
        this.testConfig = testConfig
    }

    public getTestData() {
        return this.testData
    }

    public setTestData(testData: object) {
        this.testData = testData
    }

    public getTestReport() {
        return this.testReport
    }

    public getHeuristicTestReport() {
        return this.getHeuristicTestReport
    }

    /**
     * Tests the given consumed thing with default config
     * @param logMode Logs all of the operations on the console in case it is true
     * @param fastMode Uses less asset to test vulnerability in case it is true
     * @param consumedThing Thing to be tested
     * @returns
     */
    public async fastTest(logMode: boolean, fastMode: boolean, consumedThing: WoT.ConsumedThing): Promise<TotalReport> {
        this.testConfig = defaultConfig
        this.initiate(logMode, consumedThing)
        await this.testThing(logMode)
        const conformanceReport = this.testReport

        await this.testVulnerabilities(fastMode)
        const vulnerabilityReport = this.testReport

        this.testReport = new TotalReport(conformanceReport as TestReport, vulnerabilityReport as VulnerabilityReport)
        return this.testReport
    }

    /**
     * Initiates the Testbench
     * @param logMode Logs all of the operations on the console in case it is true
     * @param consumedThing Thing to be tested
     */
    public initiate(logMode: boolean, consumedThing: WoT.ConsumedThing) {
        this.tester = new Tester(this.testConfig as testConfig, consumedThing)
        const returnCheck = this.tester.initiate(logMode)
        this.testData = this.tester.codeGen.requests
        this.cleanClientFactories(consumedThing.getThingDescription())
        this.addClientFactories(consumedThing.getThingDescription())

        if (returnCheck === 0) {
            this.heuristicTestReport = {
                OpCov: [],
                ParamCov: [],
                InputCov: this.tester.inputTestReport,
                OutputCov: [],
            }
            return "Initiation was successful."
        } else {
            return "Initiation was successful, but no interactions were found."
        }
    }

    /**
     * Tests the consumed thing of the Testbench, initiates the Testbench again if a consumed thing is given
     * @param logMode Logs all of the operations on the console in case it is true
     * @param consumedThing Thing to be tested
     */
    public async testThing(logMode: boolean, consumedThing?: WoT.ConsumedThing) {
        if (consumedThing) {
            this.initiate(logMode, consumedThing)
        }

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

    /**
     * Tests the vulnerabilities of the consumed thing of the Testbench, initiates the Testbench again if a consumed thing is given
     * @param fastMode Uses less asset to test vulnerability in case it is true
     * @param consumedThing Thing to be tested
     */
    public async testVulnerabilities(fastMode: boolean, consumedThing?: WoT.ConsumedThing) {
        if (consumedThing) {
            this.initiate(false, consumedThing)
        }

        this.testReport = await this.tester.testVulnerabilities(fastMode)
    }

    public async testOpCov(logMode?: boolean, consumedThing?: WoT.ConsumedThing) {
        if (logMode && consumedThing) {
            this.initiate(logMode, consumedThing)
        }

        logFormatted("------ START OF Operational Testing ------")
        try {
            this.heuristicTestReport["OpCov"] = await this.tester.testingOpCov()
        } catch {
            logFormatted(":::::ERROR::::: TestThing: Error during Operational test phase.")
        }
    }

    public async testParamCov(logMode?: boolean, consumedThing?: WoT.ConsumedThing) {
        if (logMode && consumedThing) {
            this.initiate(logMode, consumedThing)
        }

        logFormatted("------ START OF Parameter Testing ------")

        try {
            this.heuristicTestReport["ParamCov"] = await this.tester.testingParamCov()
        } catch {
            logFormatted(":::::ERROR::::: TestThing: Error during Parameter test phase.")
        }
    }

    public async testInputCov(logMode?: boolean, consumedThing?: WoT.ConsumedThing) {
        if (logMode && consumedThing) {
            this.initiate(logMode, consumedThing)
        }

        fs.writeFileSync(this.testConfig.TestDataLocation, JSON.stringify(this.testData, null, " "))
        logFormatted("------ START OF Input Testing ------")
        try {
            this.heuristicTestReport["InputCov"] = await this.tester.testingInputCov(this.heuristicTestReport["InputCov"])
        } catch {
            logFormatted(":::::ERROR::::: TestThing: Error during Input test phase.")
        }
    }

    public async testOutputCov(logMode?: boolean, consumedThing?: WoT.ConsumedThing) {
        if (logMode && consumedThing) {
            this.initiate(logMode, consumedThing)
        }

        logFormatted("------ START OF Output Testing ------")
        try {
            this.heuristicTestReport["OutputCov"] = await this.tester.testingOutputCov()
        } catch {
            logFormatted(":::::ERROR::::: TestThing: Error during Output test phase.")
        }
    }

    public async testAllLevels(logMode?: boolean, consumedThing?: WoT.ConsumedThing) {
        if (logMode && consumedThing) {
            this.initiate(logMode, consumedThing)
        }

        await this.testOpCov()
        await this.testParamCov()
        await this.testInputCov()
        await this.testOutputCov()

        this.tester.testingResult(this.heuristicTestReport)
        return this.heuristicTestReport
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

    /**
     * Checks the Thing Description to add needed client factories to the servient
     * @param td Thing Description to be checked for protocols
     */
    private addClientFactories(td: object) {
        const tdProtocols = detectProtocolSchemes(JSON.stringify(td))
        const servientProtocols = this.servient.getClientSchemes()
        let clientFactory: ProtocolClientFactory & { [key: string]: any }

        for (const protocol of tdProtocols) {
            if (servientProtocols.includes(protocol)) {
                continue
            }

            let factoryExists = true

            switch (protocol) {
                case ProtocolType.Coap:
                    clientFactory = new CoapClientFactory()
                    break
                case ProtocolType.Coaps:
                    clientFactory = new CoapsClientFactory()
                    break
                case ProtocolType.File:
                    clientFactory = new FileClientFactory()
                    break
                case ProtocolType.Firestore:
                    // FIXME: @node-wot/binding-firestore package is on version 0.8.2 and Content type in firestore
                    // package does not match with the one in @node-wot/core, therefore we cannot assign
                    // client factory without an error
                    // clientFactory = new FirestoreClientFactory()
                    break
                case ProtocolType.Http:
                    clientFactory = new HttpClientFactory()
                    break
                case ProtocolType.Https:
                    clientFactory = new HttpsClientFactory()
                    break
                case ProtocolType.Modbus:
                    clientFactory = new ModbusClientFactory()
                    break
                case ProtocolType.Mqtt:
                    clientFactory = new MqttClientFactory()
                    break
                case ProtocolType.Mqtts:
                    // TODO: fill config with given username and password
                    clientFactory = new MqttsClientFactory(null)
                    break
                case ProtocolType.Netconf:
                    clientFactory = new NetconfClientFactory()
                    break
                case ProtocolType.Opcua:
                    // clientFactory = new OPCUAClientFactory()
                    break
                case ProtocolType.Websocket:
                    clientFactory = new WebSocketClientFactory()
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

    /**
     * Checks the Thing Description to remove client factories that are not in use from the servient
     * @param td Thing Description to be checked for protocols
     */
    private cleanClientFactories(td: object) {
        const tdProtocols = detectProtocolSchemes(JSON.stringify(td))
        const servientProtocols = this.servient.getClientSchemes()

        for (const protocol of servientProtocols) {
            if (!tdProtocols.includes(protocol)) {
                this.servient.removeClientFactory(protocol);
            }
        }
    }
}
