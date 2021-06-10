import * as wot from "wot-typescript-definitions"
import { Servient } from "@node-wot/core"
import { HttpServer } from "@node-wot/binding-http"
import { HttpClientFactory } from "@node-wot/binding-http"
import { HttpsClientFactory } from "@node-wot/binding-http"
import { FileClientFactory } from "@node-wot/binding-file"
import { MqttClientFactory } from "@node-wot/binding-mqtt"
import { CoapServer } from "@node-wot/binding-coap"
import { CoapClientFactory } from "@node-wot/binding-coap"
import { CoapsClientFactory } from "@node-wot/binding-coap"
import { Tester } from "./Tester"
import { parseArgs, configPath, tdPaths } from "./config"
import { testConfig, ListeningType, logFormatted } from "./utilities"
import { TestReport, VulnerabilityReport, TotalReport } from "./TestReport"
import * as fs from "fs";

//const fs = require("fs")
//var util = require('util');

/*var log_file = fs.createWriteStream(__dirname + '/testBench.debug.log', {flags : 'w'});

console.log = function(d) { //
  log_file.write(util.format(d) + '\n');
};*/

var configFile = "default-config.json"
if (process.argv.length > 2) {
    parseArgs(tdPaths)
    configFile = configPath
}
//getting the test config and extraction anything possible
let testConfig: testConfig = JSON.parse(fs.readFileSync(configFile, "utf8"))
let tbName: string = testConfig["TBname"]
let tutName: string = ""

//creating the Test Bench as a servient.
//It will test the Thing as a client and interact with the tester as a Server
let srv = new Servient()
// srv.addCredentials(testConfig.credentials);
console.log(srv)
let httpServer = typeof testConfig.http.port === "number" ? new HttpServer(testConfig.http) : new HttpServer()
let coapServer = typeof testConfig.coap.port === "number" ? new CoapServer(testConfig.coap.port) : new CoapServer()
srv.addServer(httpServer)
srv.addServer(coapServer)
srv.addClientFactory(new FileClientFactory())
srv.addClientFactory(new HttpClientFactory(testConfig.http))
srv.addClientFactory(new HttpsClientFactory(testConfig.http))
srv.addClientFactory(new CoapClientFactory())
srv.addClientFactory(new CoapsClientFactory())
srv.addClientFactory(new MqttClientFactory())

srv.start()
    .then(async (WoT) => {
        logFormatted("TestBench servient started")
        const TestBenchT = await WoT.produce({
            title: tbName,
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
                    type: "string",
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
            },
            actions: {
                fastTest: {
                    input: {
                        type: "string",
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
                    description:
                        "By invoking this action, the test bench consumes the thing under test, generates the data to be sent. Not necessary for fastTest",
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
                    input:{
                        type: "boolean"
                    },
                    description: "Tests some basic security and safety vulnerabilities"
                }
            },
        })

        let tester: Tester = null
        
        //let fastMode: boolean = false;
        
        // init property values
        await TestBenchT.writeProperty("testConfig", testConfig)
        await TestBenchT.writeProperty("testBenchStatus", "")
        await TestBenchT.writeProperty("thingUnderTestTD", "")

        // set action handlers
        TestBenchT.setActionHandler("fastTest", async (thingTD: string) => {
            //get the input
            await TestBenchT.writeProperty("thingUnderTestTD", thingTD)
            //write it into tutTD prop
            //call initiate
            await TestBenchT.invokeAction("initiate", true)
            //call testThing
            await TestBenchT.invokeAction("testThing", true)
            //read testReport
            
            const conformanceReport = await TestBenchT.readProperty('testReport');

            // call testVulnerabilities
            
            //fastMode = true;
            await TestBenchT.invokeAction('testVulnerabilities', true);
            const vulnReport = await TestBenchT.readProperty('testReport');
            var totalReport: TotalReport = new TotalReport(conformanceReport, vulnReport);

            //create new report containing both conformance results and vulnerability results.
            await TestBenchT.writeProperty('testReport', totalReport);
            //write to testReport
            return await TestBenchT.readProperty("testReport");
            //return the simplified version
        })
        /* update config file, gets tutTD if not "", consume tutTD, adds
             Tester, set generated data to testData: */
        TestBenchT.setActionHandler("initiate", async (logMode: boolean) => {
            try {
                await TestBenchT.writeProperty("testReport", "[]")
            } catch {
                logFormatted(":::::ERROR::::: Init: write testReport property failed")
                return "Could not reinitialize the test report"
            }
            try {
                var newConf = await TestBenchT.readProperty("testConfig")
            } catch {
                logFormatted(":::::ERROR::::: Init: Get config property failed")
                return "Initiation failed"
            }
            testConfig = await JSON.parse(JSON.stringify(newConf))
            
            srv.addCredentials(testConfig.credentials)

            try {
                var tutTD = await TestBenchT.readProperty("thingUnderTestTD")
            } catch {
                logFormatted(":::::ERROR::::: Init: Get tutTD property failed")
                return "Initiation failed"
            }

            if (JSON.stringify(tutTD) == "") {
                return "Initiation failed, Thing under Test is an empty string."
            }

            const consumedTuT: wot.ConsumedThing = await WoT.consume(tutTD)
            tester = new Tester(testConfig, consumedTuT)
            const returnCheck = tester.initiate(logMode)

            if (returnCheck == 0) {
                try {
                    await TestBenchT.writeProperty("testData", tester.codeGen.requests)
                } catch {
                    logFormatted(":::::ERROR::::: Init: Set testData property failed")
                    return "Initiation failed"
                }
                return "Initiation was successful."
            } else if (returnCheck == 1) {
                try {
                    await TestBenchT.writeProperty("testData", tester.codeGen.requests)
                } catch {
                    logFormatted(":::::ERROR::::: Init: Set testData property failed")
                    return "Initiation failed"
                }
                return "Initiation was successful, but no interactions were found."
            }
            return "Initiation failed"
        })

        // Tests the tut. If input true, logMode is on.
        TestBenchT.setActionHandler("testThing", async (logMode: boolean) => {
            try {
                var data = await TestBenchT.readProperty("testData")
            } catch {
                logFormatted(":::::ERROR::::: TestThing: Get test data property failed")
                return false
            }

            await fs.writeFileSync(testConfig.TestDataLocation, JSON.stringify(data, null, " "))
            logFormatted("------ START OF TESTTHING METHOD ------")
            try {
                var testReport: TestReport = await tester.firstTestingPhase(testConfig.Repetitions, testConfig.Scenarios, logMode)
                testReport.printResults(ListeningType.Asynchronous)
                await TestBenchT.writeProperty("testReport", testReport.getResults())
            } catch {
                logFormatted(":::::ERROR::::: TestThing: Error during first test phase.")
                return
            }

            if (testConfig.EventAndObservePOptions.Synchronous.isEnabled) secondTestingPhase()
            return

            async function secondTestingPhase() {
                try {
                    // Starting the second testing phase.
                    const testReportHasChanged: boolean = await tester.secondTestingPhase(testConfig.Repetitions)
                    testReport.storeReport(testConfig.TestReportsLocation, tutName)
                    if (testReportHasChanged) {
                        await TestBenchT.writeProperty("testReport", testReport.getResults())
                        testReport.printResults(ListeningType.Synchronous)
                    }
                } catch {
                    logFormatted(":::::ERROR::::: TestThing: Error during second test phase.")
                }
            }
        })
        
        // Tests the Thing for security and safety.
        TestBenchT.setActionHandler("testVulnerabilities", async (fastMode: boolean) => {
            const vulnReport: VulnerabilityReport = await tester.testVulnerabilities(fastMode);
            //fastMode = false;
            await TestBenchT.writeProperty('testReport', vulnReport);
        })

        await TestBenchT.expose()
        console.info(TestBenchT.getThingDescription().title + " ready")
    })
    .catch((err) => {
        // logFormatted(":::::ERROR::::: Servient startup failed", e)
        console.error('Err:', err);
    })
