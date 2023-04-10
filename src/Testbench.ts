import { detectProtocolSchemes, ListeningType, logFormatted, ProtocolType, testConfig } from "./utilities"
import { Tester } from "./Tester"
import * as fs from "fs"
import { TotalReport, TestReport, VulnerabilityReport } from "./TestReport"
import Servient, { ProtocolClientFactory } from "@node-wot/core"
import { CoapClientFactory, CoapsClientFactory } from "@node-wot/binding-coap"
import { FileClientFactory } from "@node-wot/binding-file"
import { HttpClientFactory, HttpsClientFactory } from "@node-wot/binding-http"
import { MqttClientFactory } from "@node-wot/binding-mqtt"

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
            T1: [],
            T2: [],
            T3: {},
            T4: [],
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

    public async fastTest(logMode: boolean, fastMode: boolean, consumedThing: WoT.ConsumedThing) {
        this.initiate(logMode, consumedThing)
        await this.testThing(logMode)
        const conformanceReport = this.testReport

        await this.testVulnerabilities(fastMode)
        const vulnerabilityReport = this.testReport

        this.testReport = new TotalReport(conformanceReport as TestReport, vulnerabilityReport as VulnerabilityReport)
        return this.testReport
    }

    public initiate(logMode: boolean, consumedThing: WoT.ConsumedThing) {
        this.tester = new Tester(this.testConfig as testConfig, consumedThing)
        const returnCheck = this.tester.initiate(logMode)
        this.testData = this.tester.codeGen.requests
        this.addClientFactories(consumedThing.getThingDescription())
        console.log(this.servient.getClientSchemes())

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

    public async testParamCov(logMode?: boolean, consumedThing?: WoT.ConsumedThing) {
        if (logMode && consumedThing) {
            this.initiate(logMode, consumedThing)
        }

        logFormatted("------ START OF Parameter Testing ------")

        try {
            this.heuristicTestReport["T2"] = await this.tester.testingParamCov()
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
            this.heuristicTestReport["T3"] = await this.tester.testingInputCov(this.heuristicTestReport["T3"])
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
            this.heuristicTestReport["T4"] = await this.tester.testingOutputCov()
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

    private addClientFactories(td: object) {
        const tdProtocols = detectProtocolSchemes(JSON.stringify(td))
        const servientProtocols = this.getServient().getClientSchemes()
        let clientFactory: ProtocolClientFactory

        for (const protocol of tdProtocols) {
            if (servientProtocols.includes(protocol)) {
                continue
            }

            let factoryExists = true

            switch (protocol) {
                case ProtocolType.Http:
                    clientFactory = new HttpClientFactory()
                    break
                case ProtocolType.Https:
                    clientFactory = new HttpsClientFactory()
                    break
                case ProtocolType.Coap:
                    clientFactory = new CoapClientFactory()
                    break
                case ProtocolType.Coaps:
                    clientFactory = new CoapsClientFactory()
                    break
                case ProtocolType.Mqtt:
                    clientFactory = new MqttClientFactory()
                    break
                case ProtocolType.File:
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
}
