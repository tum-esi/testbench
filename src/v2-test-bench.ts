import _ from 'node-wot/packages/core/node_modules/wot-typescript-definitions';
import {Servient} from 'node-wot/packages/core';
import {HttpClientFactory} from "node-wot/packages/binding-http";
import {CoapClientFactory} from "node-wot/packages/binding-coap";
import {HttpServer} from 'node-wot/packages/binding-http';
import {CoapServer} from "node-wot/packages/binding-coap";
import {Thing} from 'node-wot/packages/td-tools';
import * as TDParser from 'node-wot/packages/td-tools';
import fs = require('fs');
import { Tester } from './Tester'
import {convertTDtoNodeWotTD040} from './convertTDs';

// a test config file is always configured like this
export interface testConfig {
    TBname?: string;
    SchemaLocation?: string;
    TestReportsLocation?: string;
    TestDataLocation?: string;
    Scenarios?: number;
    Repetitions?: number;
}

//getting the test config and extraction anything possible
let testConfig: testConfig = JSON.parse(fs.readFileSync('./test-config.json', "utf8"));
let tbName: string = testConfig["TBname"];

//creating the Test Bench as a servient. It will test the Thing as a client and interact with the tester as a Server
let srv = new Servient();
srv.addServer(new HttpServer());
// srv.addServer(new CoapServer());
srv.addClientFactory(new HttpClientFactory());
// srv.addClientFactory(new CoapClientFactory());
srv.start().then(WoT=>{
    console.log('\x1b[36m%s\x1b[0m', '* TestBench servient started');
    let TestBenchT = WoT.produce({
        name: 'test-bench',
    });
    let tester: Tester = null;
    TestBenchT.addProperty({
        name : "testConfig",
        schema : '{"type": "string"}',
        writable : true
    });
    TestBenchT.writeProperty("testConfig", testConfig);
    TestBenchT.addProperty({
        name : "testBenchStatus",
        schema : '{"type": "string"}',
        writable : false
    });
    TestBenchT.addProperty({
        name : "thingUnderTestTD",
        schema : '{"type": "string"}',
        writable : true
    });
    TestBenchT.addProperty({
        name : "testData",
        schema : '{"type": "string"}',
        writable : true
    });
    TestBenchT.addProperty({
        name : "testReport",
        schema : '{ "type": "string"}',
        writable : false
    });

    // update config file and variable, consume thing and add Tester:
    TestBenchT.addAction({
        name: "initiate",
        outputSchema: '{ "type": "boolean" }'
    });
    TestBenchT.setActionHandler("initiate", () => {
        var p1 = TestBenchT.readProperty("testConfig").then((newConf) => {
            testConfig = JSON.parse(JSON.stringify(newConf));
            fs.writeFileSync('./test-config.json', JSON.stringify(testConfig, null, ' '));
        });
        var p2 = p1.then(() => {return TestBenchT.readProperty('thingUnderTestTD')}).then((tut) => {
            if (tut != null) {
                tut = JSON.stringify(tut);
                // ------------ CONVERTING !! TAKE NEW NODE WOT -----------------
                let convertedTD: string = convertTDtoNodeWotTD040(tut);
                let tutTd: Thing = TDParser.parseTDString(convertedTD);
                let consumedTuT: WoT.ConsumedThing = WoT.consume(convertedTD);
                tester = new Tester(testConfig, tutTd, consumedTuT);
                if (tester.initiate()) {
                    return true;
                }
            }
        }).catch(err => {throw "Error"});
        return p2.then(() => {
            return TestBenchT.writeProperty('testData', tester.codeGen.getRequests(testConfig.TestDataLocation));
        }).then(() => true, () => false);
    });
    // test a thing action:
    TestBenchT.addAction({
        name: "testThing",
        inputSchema: '{ "type": "boolean" }',
        outputSchema: '{ "type": "boolean" }'
    });
    // testing a thing action handler, input boolean for logMode:
    // if input true, logMode is on
    TestBenchT.setActionHandler("testThing", function(input) {
        var p1 = TestBenchT.readProperty("testData").then((data) => {
            fs.writeFileSync(testConfig.TestDataLocation, JSON.stringify(data, null, ' '));
        });
        return p1.then(() => {
            console.log('\x1b[36m%s\x1b[0m', '* --------------------- START OF TESTTHING METHOD ---------------------')
            tester.testThing(testConfig.Repetitions, testConfig.Scenarios, input).then(testReport => {
                testReport.printResults();
                testReport.storeReport(testConfig.TestReportsLocation);
                TestBenchT.writeProperty("testReport",testReport.getResults());
                return true;
            }).catch(() => {
                console.log('\x1b[36m%s\x1b[0m', "* Something went wrong");
                return false;
            });
        });
    });

}).catch(err => { throw "Couldnt connect to one servient" });
