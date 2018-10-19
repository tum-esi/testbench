import {
    Servient
} from 'thingweb.node-wot/packages/core';
import {
    HttpClientFactory
} from 'thingweb.node-wot/packages/binding-http';
import {
    HttpsClientFactory
} from 'thingweb.node-wot/packages/binding-http';
import {
    FileClientFactory
} from 'thingweb.node-wot/packages/binding-file';
import {
    HttpServer
} from 'thingweb.node-wot/packages/binding-http';
import {
    Thing
} from 'thingweb.node-wot/packages/td-tools';
import * as wot from 'thingweb.node-wot/packages/core/node_modules/wot-typescript-definitions';
import * as TDParser from 'thingweb.node-wot/packages/td-tools';
import {
    Tester
} from './Tester'
import {
    testConfig
} from './utilities'
import fs = require('fs');

//getting the test config and extraction anything possible
let testConfig: testConfig = JSON.parse(fs.readFileSync('./default-config.json', "utf8"));
let tbName: string = testConfig["TBname"];
let tutName: string = "";

//creating the Test Bench as a servient. It will test the Thing as a client and interact with the tester as a Server
let srv = new Servient();
// srv.addCredentials(testConfig.credentials);
console.log(srv);

let httpServer = (typeof testConfig.http.port === "number") ? new HttpServer(testConfig.http.port) : new HttpServer();
srv.addServer(httpServer);

srv.addClientFactory(new FileClientFactory());
srv.addClientFactory(new HttpClientFactory(testConfig.http));
srv.addClientFactory(new HttpsClientFactory(testConfig.http));

// srv.addServer(new CoapServer());

srv.start().then(WoT => {
    console.log('\x1b[36m%s\x1b[0m', '* TestBench servient started');
    let TestBenchT = WoT.produce({
        name: tbName,
    });
    let tester: Tester = null;
    TestBenchT.addProperty("testConfig", {
        type: "string",
        writable: true
    }, testConfig);
    TestBenchT.addProperty("testBenchStatus", {
        type: "string",
        writable: false
    }, "");
    TestBenchT.addProperty("thingUnderTestTD", {
        type: "string",
        writable: true
    }, "");
    TestBenchT.addProperty("testData", {
        type: "string",
        writable: true
    });
    TestBenchT.addProperty("testReport", {
        type: "string",
        writable: false
    });

    TestBenchT.addAction("fastTest", {
            input: {
                type: "string"
            },
            output: {
                type: "object"
            }
        },
        (tutTD: string) => {
            return TestBenchT.properties.testConfig.read().then((newConf) => {});
        });

    // update config file, gets tutTD if not "", consume tutTD, adds Tester, set generated data to testData:
    TestBenchT.addAction("initiate", {
            input: {
                type: "boolean"
            }, // true sets logMode to active
            output: {
                type: "string"
            }
        },
        (logMode: boolean) => {
            return TestBenchT.properties.testConfig.read().then((newConf) => {
                testConfig = JSON.parse(JSON.stringify(newConf));

                //fs.writeFileSync('./default-config.json', JSON.stringify(testConfig, null, ' '));
                srv.addCredentials(testConfig.credentials);
                return TestBenchT.properties.thingUnderTestTD.read().then((tutTD) => {
                    tutTD = JSON.stringify(tutTD);
                    if (tutTD != "") {
                        let tutT: Thing = TDParser.parseTD(tutTD);
                        tutName = tutT.name;
                        let consumedTuT: wot.ConsumedThing = WoT.consume(tutTD);
                        tester = new Tester(testConfig, tutT, consumedTuT);
                        let returnCheck = tester.initiate(logMode);
                        if (returnCheck == 0) {
                            return TestBenchT.properties.testData.write(tester.codeGen.requests).then(() => {
                                return "Initiation was successful."
                            }).catch(() => {
                                console.log('\x1b[36m%s\x1b[0m', "* :::::ERROR::::: Init: Set testData property failed");
                                return "Initiation failed";
                            });
                        } else if (returnCheck == 1) {
                            return TestBenchT.properties.testData.write(tester.codeGen.requests).then(() => {
                                return "Initiation was successful, bu no interactions were found."
                            }).catch(() => {
                                console.log('\x1b[36m%s\x1b[0m', "* :::::ERROR::::: Init: Set testData property failed");
                                return "Initiation failed";
                            });
                        } else {
                            return "Initiation failed";
                        }
                    } else {
                        return "Initiation failed, Thing under Test is an empty string.";
                    }
                }).catch(() => {
                    console.log('\x1b[36m%s\x1b[0m', "* :::::ERROR::::: Init: Get tutTD property failed");
                    return "Initiation failed";
                });
            }).catch(() => {
                console.log('\x1b[36m%s\x1b[0m', "* :::::ERROR::::: Init: Get config property failed");
                return "Initiation failed";
            });
        });
    // Tests the tut. If input true, logMode is on.
    TestBenchT.addAction("testThing", {
            input: {
                type: "boolean"
            },
            output: {
                type: "boolean"
            }
        },
        (logMode: boolean) => {
            return TestBenchT.properties.testData.read().then((data) => {
                fs.writeFileSync(testConfig.TestDataLocation, JSON.stringify(data, null, ' '));
                console.log('\x1b[36m%s\x1b[0m', '* ------ START OF TESTTHING METHOD ------');
                return tester.testThing(testConfig.Repetitions, testConfig.Scenarios, logMode).then(testReport => {
                    testReport.printResults();
                    testReport.storeReport(testConfig.TestReportsLocation, tutName);
                    return TestBenchT.properties.testReport.write(testReport.getResults()).then(() => true, () => false);
                }).catch(() => {
                    console.log('\x1b[36m%s\x1b[0m', "* :::::ERROR::::: TestThing method went wrong");
                    return false;
                });
            }).catch(() => {
                console.log('\x1b[36m%s\x1b[0m', "* :::::ERROR::::: TestThing: Get test data property failed");
                return false;
            });
        });

    TestBenchT.expose().then(() => {
        console.info(TestBenchT.name + " ready");
    });
}).catch(err => {
    console.log('\x1b[36m%s\x1b[0m', "* :::::ERROR::::: Servient startup failed");
});