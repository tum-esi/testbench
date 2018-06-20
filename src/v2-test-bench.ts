import _ from '@node-wot/core/node_modules/wot-typescript-definitions';
 // for çhecking valid properties, check index.d.ts at /home/jp39/Desktop/thesis/node-wot/packages/core/node_modules/wot-typescript-definitions
import {Servient} from '@node-wot/core';
import {HttpClientFactory} from "@node-wot/binding-http";
import {HttpServer} from '@node-wot/binding-http';
import {ThingDescription} from '@node-wot/td-tools';
import * as TDParser from '@node-wot/td-tools';
import * as TdFunctions from './tdFunctions';
import fs = require('fs');
import { Tester } from './Tester'
import {convertTDtoNodeWotTD040} from './convertTDs';

// a test config file is always configured like this
export interface testConfig {
    TBname?: string;
    ThingTdLocation?: string;
    ThingTdName?: string;
    SchemaLocation?: string;
    TestReportsLocation?: string;
    RequestsLocation?: string;
    Scenarios?: number;
    Repetitions?: number;
}

//getting the test config and extraction anything possible
let testConfig: testConfig = JSON.parse(fs.readFileSync('./test-config.json', "utf8"));
//the name of this test bench
let tbName: string = testConfig["TBname"];
//get the Thing Description of this Test Bench
let tbTdString: string = fs.readFileSync('./' + tbName + '.jsonld', "utf8");
let tbTd: ThingDescription = TDParser.parseTDString(tbTdString);

//get the Td of the Thing under test (tut)
let tutName = testConfig.ThingTdName;
let tutTdLocation = testConfig.ThingTdLocation;
//creating the Thing Description
let tutTdString: string = fs.readFileSync(tutTdLocation + tutName + ".jsonld", "utf8");
// convert to node-wot TD version:
let convertedTD: string = convertTDtoNodeWotTD040(tutTdString);
let tutTd: ThingDescription = TDParser.parseTDString(convertedTD);

//creating the Test Bench as a servient. It will test the Thing as a client and interact with the tester as a Server
let srv = new Servient();
srv.addServer(new HttpServer(TdFunctions.findPort(tbTd))); //at the port specified in the TD
srv.addClientFactory(new HttpClientFactory());
srv.start().then(WoT=>{
    console.log('\x1b[36m%s\x1b[0m', '* TestBench servient started');
    
    let TestBenchT = WoT.produce({
        name: "thing_test_bench",
    });
    // ask ege about input of this function:
    let TuTT = WoT.consume(convertedTD);
    let tester: Tester = new Tester(testConfig, tutTd, TuTT);

    // infos of testbench configurations:
    TestBenchT.addProperty({
        name : "testConfig",
        schema : '{"type": "string"}',
        writable : false
    });
    TestBenchT.writeProperty("testConfig", testConfig);
    TestBenchT.addProperty({
        name : "TuTTD",
        schema : '{"type": "string"}',
        writable : false
    });
    TestBenchT.writeProperty("TuTTD", testConfig);


    TestBenchT.addProperty({
        name : "requests",
        schema : '{"type": "string"}',
        writable : false
    });
    TestBenchT.addAction({
        name: "updateRequests",
        inputSchema: '{ "type": "string" }',
        outputSchema: '{ "type": "boolean" }'
    });
    TestBenchT.setActionHandler("updateRequests", function(requestsUpdate: string) {
        fs.writeFileSync(testConfig.RequestsLocation, JSON.stringify(requestsUpdate, null, ' '));
        var p = TestBenchT.writeProperty('requests', requestsUpdate);
        return p.then(() => true, () => false);
    });

    // initiate testbench:
    TestBenchT.addAction({
        name: "initiate",
        outputSchema: '{ "type": "boolean" }'
    });
    TestBenchT.setActionHandler("initiate", function(propname: string) {

        // add consume thing in here:
        // using a read property

        return new Promise((resolve, reject) => {
            if (tester.initiate()) {
                // additionally update requests property with generated data:
                TestBenchT.writeProperty('requests', tester.codeGen.getRequests(testConfig.RequestsLocation));
                resolve(true);
            } else {
                reject(false);
            }
        });
    });

    TestBenchT.addProperty({
        name : "testReport",
        schema : '{ "type": "string"}',
        writable : false
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
        return new Promise((resolve, reject) => {
            console.log('\x1b[36m%s\x1b[0m', '* --------------------- START OF TESTTHING METHOD ---------------------')
            tester.testThing(testConfig.Repetitions, testConfig.Scenarios, input).then(testReport => {
                testReport.printResults();
                testReport.storeReport(testConfig.TestReportsLocation);
                TestBenchT.writeProperty("testReport",testReport.getResults());
                resolve(true);
            }).catch(() => {
                console.log('\x1b[36m%s\x1b[0m', "* Something went wrong");
                reject(false);
            });
        });
    });


    // until here......... need to add one property for TuT Thing Description





    // Add Validation to thing description in the beginning
    // TestBenchT.addProperty({
    //     name : "testsactions",
    //     schema : '{ "type": "string"}',
    //     value : "testwritable,getpropertydesc,testaction,testevent",
    //     observable : true,
    //     writable : false
    // });
    // // performs read request
    // TestBenchT.addAction({
    //     name: "getpropertyvalue",
    //     // insert should be property name
    //     inputSchema: '{ "type": "string" }',
    //     // returns property value
    //     outputSchema: '{ "type": "string" }'
    // });

    // async function asyncCall(propname) {
    //   var result = await TuTT.readProperty(propname);
    //   return result;
    //   // expected output: "resolved"
    // }
    // TestBenchT.setActionHandler("getpropertyvalue", function(propname: string) {
    //   var answer = asyncCall(propname);
    //   return new Promise((resolve, reject) => {
    //       if (answer) {
    //           resolve(answer);
    //       } else {
    //           reject(Error('getpropertyvalue did not work'))
    //       }
    //   });
    // });
    // console.log(TestBenchT.getThingDescription())
}).catch(err => { throw "Couldnt connect to one servient" });
