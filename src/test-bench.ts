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
console.log('---------------------------------------------------')
console.log(tutTdString);
console.log('---------------------------------------------------')
console.log('---------------------------------------------------')
console.log('---------------------------------------------------')

console.log(convertedTD);


let tutTd: ThingDescription = TDParser.parseTDString(convertedTD);
// console.log('SchemaValidatorTD on TUT is', SchemaValidator.validateTD(tutTd))
// let tutTd: ThingDescription = TDParser.parseTDString(tutTdString);

//creating the Test Bench as a servient. It will test the Thing as a client and interact with the tester as a Server
let srv = new Servient();
console.log('Created Test Bench');
srv.addServer(new HttpServer(TdFunctions.findPort(tbTd))); //at the port specified in the TD
srv.addClientFactory(new HttpClientFactory());
srv.start().then(WoT=>{
    console.log('TestBench servient started');
    
    // cannot use tbTd as input for produce, node-wot functionality not implemented yet
    // let TestBenchT = WoT.produce(tbTd); // returns exposedthing model
    // instead:
    let TestBenchT = WoT.produce({
        name: "thing_test_bench",
    });

    // ask ege about input of this function:
    let TuTT = WoT.consume(convertedTD);

    //--------------------------------------------
    // MISSING PARTS of TestBench:
    // setProperty Test Configuration !!!

    let tester: Tester = new Tester(testConfig, tutTd, TuTT);
    // var chck = tester.initiate();
    // console.log('check if init worked:', chck);

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

    TestBenchT.addAction({
        // for çhecking valid properties, check index.d.ts at /home/jp39/Desktop/thesis/node-wot/packages/core/node_modules/wot-typescript-definitions
        name: "testThing",
        inputSchema: '{ "type": "boolean" }',
        outputSchema: '{ "type": "boolean" }'
    });
    TestBenchT.addAction({
        // for çhecking valid properties, check index.d.ts at /home/jp39/Desktop/thesis/node-wot/packages/core/node_modules/wot-typescript-definitions
        name: "generateRequests",
        inputSchema: '{ "type": "string" }'
    });
    TestBenchT.addProperty({
        name : "testConfig",
        schema : '{ "type": "object"}',
        value : "testwritable,getpropertydesc,testaction,testevent",
        writable : true
    });
    TestBenchT.addProperty({
        name : "requests",
        schema : '{ "type": "array"}',
        writable : true
    });
    TestBenchT.addProperty({
        name : "testReport",
        schema : '{ "type": "array"}',
        writable : false
    });

    // Add Validation to thing description in the beginning

    // -------------------------------------------

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






//WoT.createFromDescription(tbTd).then(tb => {

    //tb.setProperty("TestConfig", testConfig);
    //now the Thing under Test (tut) will be extracted like a consumed thing
    //the current problem is that node-wot cannot have everything that is 
    // written in a TD, so the Thing is consumed but the TD that is given 
    // in the
    // test config is used for generating stuff and testing it 
    

    // this function exists and need to become replaced by let consumed_thing = Wot.consume()
    

    //WoT.consumeDescriptionUri(tutTd.base + tutName).then(tut => {
        // logger.info("Fetched Thing " + tutName);
        //console.log("Fetched Thing " + tutName);

        //let tester: Tester = new Tester(testConfig, tutTd, tut);
        //tester.initiate();
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
/*
        tester.testThing(testConfig.Repetitions, true).then(testReport => {
            testReport.printResults();
            testReport.storeReport(testConfig.TestReportsLocation);
        }).catch(() => {
            logger.error("Something went wrong")
        });
*/

        //tb.onInvokeAction("Initiate", function () {
        //    try {
        //        return tester.initiate();
        //    } catch (error) {
                // logger.error("Initiation Error. " + error + "\nExiting")
        //        console.log("Initiation Error. " + error + "\nExiting");
        //        return false;
        //    }
        //});

        //tb.onInvokeAction("TestThing", function (input) {
            //console.log(input);
            //tester.testThing(testConfig.Repetitions, input).then(testReport => {
                //testReport.printResults();
                //testReport.storeReport(testConfig.TestReportsLocation);
                //tb.setProperty("TestReport",testReport.getResults());
                //console.log()
            //}).catch(() => {
                // logger.error("Something went wrong");
                //console.log("Something went wrong");
            //});
        //});

    // }).catch((err) => logger.error('Problem in consumeDescriptionUri function ', err));
    //}).catch((err) => console.log('Problem in consumeDescriptionUri function ', err));

//});



