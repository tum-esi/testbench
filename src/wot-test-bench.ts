import { Servient } from "@node-wot/core"
import { HttpServer } from "@node-wot/binding-http"
import { CoapServer } from "@node-wot/binding-coap"
import { parseArgs, configPath } from "./config"
import { logFormatted, testConfig } from "./utilities"
import * as fs from "fs"
import { TestbenchThing } from "./TestbenchThing"
import { defaultConfig } from "./defaults";

let testConfig: testConfig;

if (process.argv.length > 2) {
    parseArgs()
    testConfig = JSON.parse(fs.readFileSync(configPath, "utf8"))
} else {
    testConfig = defaultConfig
}

const tbName: string = testConfig["TBname"]

//creating the Test Bench as a servient.
//It will test the Thing as a client and interact with the tester as a Server
const srv = new Servient()
const httpServer = typeof testConfig.http.port === "number" ? new HttpServer(testConfig.http) : new HttpServer()
const coapServer = typeof testConfig.coap.port === "number" ? new CoapServer(testConfig.coap.port) : new CoapServer()
srv.addServer(httpServer)
srv.addServer(coapServer)

srv.start()
    .then(async (WoT) => {
        logFormatted("TestBench servient started")
        const testbenchThing = new TestbenchThing(WoT, srv, tbName)
        await testbenchThing.startDevice(testConfig)
    })
    .catch(() => {
        logFormatted(":::::ERROR::::: Servient startup failed")
        srv.shutdown()
    })
