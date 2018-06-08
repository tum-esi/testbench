// insert node-wot installation location to tsconfig.json 
// insert node-wot location to compilerOptions path

import _ from '@node-wot/core/node_modules/wot-typescript-definitions';
import Servient from '@node-wot/core/src/servient';
import HttpClientFactory from "@node-wot/binding-http/src/http-client-factory";
import HttpServer from '@node-wot/binding-http/src/http-server';
import ThingDescription from '@node-wot/td-tools/src/thing-description';
import * as TDParser from '@node-wot/td-tools/src/td-parser';
import * as TdFunctions from './tdFunctions';
import fs = require('fs');
// import { CodeGenerator } from './CodeGenerator'
import { TestReport } from './TestReport'
import { Tester } from './Tester'
import * as SchemaValidator from './SchemaValidator'
// my imports:
import {convertTDtoNodeWotTD040} from './add_on_functions';

// a test config file is always configured like this
export interface testConfig {
    TBname?: string;
    ThingTdLocation?: string;
    ThingTdName?: string;
    SchemaLocation?: string;
    TestReportsLocation?: string;
    RequestsLocation?: string;
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
// let convTUT: ThingDescription = TDParser.parseTDString(convertedTD);
// console.log('---------------------------------------------------')
// console.log(tutTdString);
// console.log('---------------------------------------------------')
// console.log('---------------------------------------------------')
// console.log(convertedTD);

//creating the Test Bench as a servient. It will test the Thing as a client and interact with the tester as a Server
let srv = new Servient();
console.log('Created Test Bench');
srv.addServer(new HttpServer(TdFunctions.findPort(tbTd))); //at the port specified in the TD
srv.addClientFactory(new HttpClientFactory());
srv.start().then(WoT=>{
    console.log('TestBench servient started');
    
    let TestBenchT = WoT.produce({
        name: "thing_test_bench",
    });
    // ask ege about input of this function:
    let TuTT = WoT.consume(convertedTD);
    // console.log('*************************************************');
    // console.log(TuTT);
    // console.log('*************************************************');
    // console.log(JSON.stringify(TuTT));

    let tester: Tester = new Tester(testConfig, tutTd, TuTT);
    let check = tester.initiate();

    // initiate testbench:
    TestBenchT.addAction({
        // for çhecking valid properties, check index.d.ts at /home/jp39/Desktop/thesis/node-wot/packages/core/node_modules/wot-typescript-definitions
        name: "initiate",
        // returns property value
        outputSchema: '{ "type": "boolean" }'
    });
    TestBenchT.setActionHandler("initiate", function(propname: string) {
        return new Promise((resolve, reject) => {
            try {
                resolve(tester.initiate());
            } catch (error) {
                reject(false);
            }
        });
    });

    // infos of testbench configurations:
    TestBenchT.addProperty({
        name : "testConfig",
        schema : '{ "type": "string"}',
        writable : true
    });
    TestBenchT.writeProperty("testConfig", testConfig);
    // test a thing action:
    TestBenchT.addAction({
        // for çhecking valid properties, check index.d.ts at /home/jp39/Desktop/thesis/node-wot/packages/core/node_modules/wot-typescript-definitions
        name: "testThing",
        inputSchema: '{ "type": "boolean" }',
        outputSchema: '{ "type": "boolean" }'
    });
    TestBenchT.addProperty({
        name : "testReport",
        schema : '{ "type": "array"}',
        writable : false
    });
    // testing a thing action handler, input boolean for logMode:
    // if input true, logMode is on
    TestBenchT.setActionHandler("testThing", function(input) {
        console.log(input);
        console.log(testConfig.Repetitions);
        return new Promise((resolve, reject) => {
            tester.testThing(testConfig.Repetitions, input).then(testReport => {
                testReport.printResults();
                testReport.storeReport(testConfig.TestReportsLocation);
                TestBenchT.writeProperty("testReport",testReport.getResults());
                resolve(true);
            }).catch(() => {
                console.log("Something went wrong");
                reject(false);
            });
        });
    });

    TestBenchT.addAction({
        // for çhecking valid properties, check index.d.ts at /home/jp39/Desktop/thesis/node-wot/packages/core/node_modules/wot-typescript-definitions
        name: "generateRequests",
        inputSchema: '{ "type": "string" }'
    });
    TestBenchT.addProperty({
        name : "requests",
        schema : '{ "type": "array"}',
        writable : true
    });




    // Add Validation to thing description in the beginning
    TestBenchT.addProperty({
        name : "testsactions",
        schema : '{ "type": "string"}',
        value : "testwritable,getpropertydesc,testaction,testevent",
        observable : true,
        writable : false
    });
    // performs read request
    TestBenchT.addAction({
        name: "getpropertyvalue",
        // insert should be property name
        inputSchema: '{ "type": "string" }',
        // returns property value
        outputSchema: '{ "type": "string" }'
    });

    async function asyncCall(propname) {
      console.log('calling');
      var result = await TuTT.readProperty(propname);
      return result;
      // expected output: "resolved"
    }
    TestBenchT.setActionHandler("getpropertyvalue", function(propname: string) {
      var answer = asyncCall(propname);
      return new Promise((resolve, reject) => {
          if (answer) {
              resolve(answer);
            // setTimeout(() => {
            //   resolve('resolved');
            // }, 2000);
          } else {
              reject(Error('getpropertyvalue did not work'))
          }
      });
    });
    // console.log(TestBenchT.getThingDescription())
}).catch(err => { throw "Couldnt connect to one servient" });



    //tb.setProperty("TestConfig", testConfig);
    
        /*
        tester.testReport.addTestCycle();
         tester.testReport.addTestScenario();
        tester.testScenario(0,0,true).then(()=>{
            console.log("nice")
        }).catch((error:Error)=>{
            console.log("not nice", error)
        });
        */
        /*
        tester.testCycle(0,true).then(()=>{
            console.log("nice")
        }).catch(()=>{
            console.log("not nice")
        });
        */


