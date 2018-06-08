"use strict";
// insert node-wot installation location to tsconfig.json 
// insert node-wot location to compilerOptions path
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const servient_1 = require("@node-wot/core/src/servient");
const http_client_factory_1 = require("@node-wot/binding-http/src/http-client-factory");
const http_server_1 = require("@node-wot/binding-http/src/http-server");
const TDParser = require("@node-wot/td-tools/src/td-parser");
const TdFunctions = require("./tdFunctions");
const fs = require("fs");
const Tester_1 = require("./Tester");
// my imports:
const add_on_functions_1 = require("./add_on_functions");
//getting the test config and extraction anything possible
let testConfig = JSON.parse(fs.readFileSync('./test-config.json', "utf8"));
//the name of this test bench
let tbName = testConfig["TBname"];
//get the Thing Description of this Test Bench
let tbTdString = fs.readFileSync('./' + tbName + '.jsonld', "utf8");
let tbTd = TDParser.parseTDString(tbTdString);
//get the Td of the Thing under test (tut)
let tutName = testConfig.ThingTdName;
let tutTdLocation = testConfig.ThingTdLocation;
//creating the Thing Description
let tutTdString = fs.readFileSync(tutTdLocation + tutName + ".jsonld", "utf8");
// convert to node-wot TD version:
let convertedTD = add_on_functions_1.convertTDtoNodeWotTD040(tutTdString);
console.log('---------------------------------------------------');
console.log(tutTdString);
console.log('---------------------------------------------------');
console.log('---------------------------------------------------');
console.log('---------------------------------------------------');
console.log(convertedTD);
let tutTd = TDParser.parseTDString(convertedTD);
// console.log('SchemaValidatorTD on TUT is', SchemaValidator.validateTD(tutTd))
// let tutTd: ThingDescription = TDParser.parseTDString(tutTdString);
//creating the Test Bench as a servient. It will test the Thing as a client and interact with the tester as a Server
let srv = new servient_1.default();
console.log('Created Test Bench');
srv.addServer(new http_server_1.default(TdFunctions.findPort(tbTd))); //at the port specified in the TD
srv.addClientFactory(new http_client_factory_1.default());
srv.start().then(WoT => {
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
    let tester = new Tester_1.Tester(testConfig, tutTd, TuTT);
    // var chck = tester.initiate();
    // console.log('check if init worked:', chck);
    TestBenchT.addAction({
        // for çhecking valid properties, check index.d.ts at /home/jp39/Desktop/thesis/node-wot/packages/core/node_modules/wot-typescript-definitions
        name: "initiate",
        // returns property value
        outputSchema: '{ "type": "boolean" }'
    });
    TestBenchT.setActionHandler("initiate", function (propname) {
        return new Promise((resolve, reject) => {
            try {
                resolve(tester.initiate());
            }
            catch (error) {
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
        name: "testConfig",
        schema: '{ "type": "object"}',
        value: "testwritable,getpropertydesc,testaction,testevent",
        writable: true
    });
    TestBenchT.addProperty({
        name: "requests",
        schema: '{ "type": "array"}',
        writable: true
    });
    TestBenchT.addProperty({
        name: "testReport",
        schema: '{ "type": "array"}',
        writable: false
    });
    // Add Validation to thing description in the beginning
    // -------------------------------------------
    TestBenchT.addProperty({
        name: "testsactions",
        schema: '{ "type": "string"}',
        value: "testwritable,getpropertydesc,testaction,testevent",
        observable: true,
        writable: false
    });
    // performs read request
    TestBenchT.addAction({
        name: "getpropertyvalue",
        // insert should be property name
        inputSchema: '{ "type": "string" }',
        // returns property value
        outputSchema: '{ "type": "string" }'
    });
    function asyncCall(propname) {
        return __awaiter(this, void 0, void 0, function* () {
            console.log('calling');
            var result = yield TuTT.readProperty(propname);
            return result;
            // expected output: "resolved"
        });
    }
    TestBenchT.setActionHandler("getpropertyvalue", function (propname) {
        var answer = asyncCall(propname);
        return new Promise((resolve, reject) => {
            if (answer) {
                resolve(answer);
                // setTimeout(() => {
                //   resolve('resolved');
                // }, 2000);
            }
            else {
                reject(Error('getpropertyvalue did not work'));
            }
        });
    });
    // console.log(TestBenchT.getThingDescription())
}).catch(err => { throw "Couldnt connect to one servient"; });
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
