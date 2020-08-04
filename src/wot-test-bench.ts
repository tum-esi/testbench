import * as wot from 'wot-typescript-definitions';
import {Servient} from '@node-wot/core';
import {HttpServer} from '@node-wot/binding-http';
import {HttpClientFactory} from '@node-wot/binding-http';
import {HttpsClientFactory} from '@node-wot/binding-http';
import {FileClientFactory} from '@node-wot/binding-file';
import {MqttClientFactory} from '@node-wot/binding-mqtt';
import {CoapServer} from '@node-wot/binding-coap';
import {CoapClientFactory} from '@node-wot/binding-coap';
import {CoapsClientFactory} from '@node-wot/binding-coap';
import {Tester} from './Tester';
import {testConfig} from './utilities';
import {parseArgs, configPath, tdPaths} from './config';
const fs = require('fs');
let configFile = 'default-config.json';
if (process.argv.length > 2) {
    parseArgs(tdPaths);
    configFile = configPath;
}
//getting the test config and extraction anything possible
let testConfig: testConfig = JSON.parse(fs.readFileSync(configFile, 'utf8'));
const tbName: string = testConfig['TBname'];
const tutName = '';

//creating the Test Bench as a servient.
//It will test the Thing as a client and interact with the tester as a Server
const srv = new Servient();
// srv.addCredentials(testConfig.credentials);
console.log(srv);
const httpServer =
    typeof testConfig.http.port === 'number'
        ? new HttpServer(testConfig.http)
        : new HttpServer();
const coapServer =
    typeof testConfig.coap.port === 'number'
        ? new CoapServer(testConfig.coap.port)
        : new CoapServer();
srv.addServer(httpServer);
srv.addServer(coapServer);
srv.addClientFactory(new FileClientFactory());
srv.addClientFactory(new HttpClientFactory(testConfig.http));
srv.addClientFactory(new HttpsClientFactory(testConfig.http));
srv.addClientFactory(new CoapClientFactory());
srv.addClientFactory(new CoapsClientFactory());
srv.addClientFactory(new MqttClientFactory());

srv.start().then(WoT => {
    console.log('\x1b[36m%s\x1b[0m', '* TestBench servient started');
    WoT.produce({
        title: tbName,
        description:
            'WoT Test Bench tests a Thing by getting its TD' +
            'and executing all of its interactions with data' +
            'generated in runtime. For simple use, invoke the' +
            'fastTest action with the TD of your Thing as' +
            'input data',
        '@context': [
            'https://www.w3.org/2019/wot/td/v1',
            {cov: 'http://www.example.org/coap-binding#'},
        ],
        properties: {
            testConfig: {
                type: 'string',
                writable: true,
                description:
                    '(Optional) Writing to this property configures' +
                    'the Test Bench. TDs with security schemes' +
                    'require this property to contain the security' +
                    'credentials',
            },
            testBenchStatus: {
                type: 'string',
                writable: false,
                description:
                    '(not finished) Shows the status of the test' +
                    'bench whether it is currently testing a device or not',
            },
            thingUnderTestTD: {
                type: 'string',
                writable: true,
                description:
                    'Write to this property in order to give the' +
                    'TD of your Thing to test. Not necessary for fastTest',
            },
            testData: {
                type: 'string',
                writable: true,
                description:
                    '(Optional) This property contains all the data' +
                    'that will be sent by the Test Bench to the Thing' +
                    'under Test. You can also write in custom data',
            },
            testReport: {
                type: 'string',
                writable: false,
                description:
                    'Contains all of the outputs of the testing.' +
                    'Not necessary for fastTest',
            },
        },
        actions: {
            fastTest: {
                input: {
                    type: 'string',
                },
                output: {
                    type: 'string',
                },
                description:
                    'Send a TD as input data and it will return' +
                    'a test report once the test has finished',
            },
            initiate: {
                input: {
                    type: 'boolean',
                }, // true sets logMode to active
                output: {
                    type: 'string',
                },
                description:
                    'By invoking this action, the test bench consumes' +
                    'the thing under test, generates data to be' +
                    'sent. Not necessary for fastTest',
            },
            testThing: {
                input: {
                    type: 'boolean',
                },
                output: {
                    type: 'boolean',
                },
                description:
                    'By invoking this action the testing starts' +
                    'and produces a test report that can be read.' +
                    'Not necessary for fastTest',
            },
        },
    })
        .then(TestBenchT => {
            let tester: Tester = null;
            // init property values
            TestBenchT.writeProperty('testConfig', testConfig);
            TestBenchT.writeProperty('testBenchStatus', '');
            TestBenchT.writeProperty('thingUnderTestTD', '');

            // set action handlers
            TestBenchT.setActionHandler('fastTest', (thingTD: string) => {
                //get the input
                return TestBenchT.writeProperty(
                    'thingUnderTestTD',
                    thingTD
                ).then(() => {
                    //write it into tutTD prop
                    //call initiate
                    return TestBenchT.invokeAction('initiate', true).then(
                        () => {
                            //call testThing
                            return TestBenchT.invokeAction(
                                'testThing',
                                true
                            ).then(() => {
                                //call testThing
                                return TestBenchT.readProperty('testReport');
                                //return the simplified version
                            });
                        }
                    );
                });
            });
            /* update config file, gets tutTD if not "", consume tutTD, adds
             Tester, set generated data to testData: */
            TestBenchT.setActionHandler('initiate', (logMode: boolean) => {
                return TestBenchT.writeProperty('testReport', '[]')
                    .then(() => {
                        return TestBenchT.readProperty('testConfig')
                            .then(newConf => {
                                testConfig = JSON.parse(
                                    JSON.stringify(newConf)
                                );

                                /* fs.writeFileSync('./default-config.json',
                                        JSON.stringify(testConfig, null, ' ')); */
                                srv.addCredentials(testConfig.credentials);
                                return TestBenchT.readProperty(
                                    'thingUnderTestTD'
                                )
                                    .then(async tutTD => {
                                        if (JSON.stringify(tutTD) != '') {
                                            const consumedTuT: wot.ConsumedThing = await WoT.consume(
                                                tutTD
                                            );
                                            tester = new Tester(
                                                testConfig,
                                                consumedTuT
                                            );
                                            const returnCheck = tester.initiate(
                                                logMode
                                            );
                                            if (returnCheck == 0) {
                                                return TestBenchT.writeProperty(
                                                    'testData',
                                                    tester.codeGen.requests
                                                )
                                                    .then(() => {
                                                        return 'Initiation was successful.';
                                                    })
                                                    .catch(() => {
                                                        console.log(
                                                            '\x1b[36m%s\x1b[0m',
                                                            '* :::::ERROR::::: Init:' +
                                                                'Set testData property failed'
                                                        );
                                                        return 'Initiation failed';
                                                    });
                                            } else if (returnCheck == 1) {
                                                return TestBenchT.writeProperty(
                                                    'testData',
                                                    tester.codeGen.requests
                                                )
                                                    .then(() => {
                                                        return (
                                                            'Initiation was successful,' +
                                                            'but no interactions were found.'
                                                        );
                                                    })
                                                    .catch(() => {
                                                        console.log(
                                                            '\x1b[36m%s\x1b[0m',
                                                            '* :::::ERROR:::::' +
                                                                'Init: Set testData' +
                                                                'property failed'
                                                        );
                                                        return 'Initiation failed';
                                                    });
                                            } else {
                                                return 'Initiation failed';
                                            }
                                        } else {
                                            return (
                                                'Initiation failed,' +
                                                'Thing under Test is an empty string.'
                                            );
                                        }
                                    })
                                    .catch(() => {
                                        console.log(
                                            '\x1b[36m%s\x1b[0m',
                                            '* :::::ERROR::::: Init: Get' +
                                                'tutTD property failed'
                                        );
                                        return 'Initiation failed';
                                    });
                            })
                            .catch(() => {
                                console.log(
                                    '\x1b[36m%s\x1b[0m',
                                    '* :::::ERROR::::: Init: Get' +
                                        'config property failed'
                                );
                                return 'Initiation failed';
                            });
                    })
                    .catch(() => {
                        console.log(
                            '\x1b[36m%s\x1b[0m',
                            '* :::::ERROR::::: Init: write' +
                                'testReport property failed'
                        );
                        return 'Could not reinitialize the test report';
                    });
            });
            // Tests the tut. If input true, logMode is on.
            TestBenchT.setActionHandler('testThing', (logMode: boolean) => {
                return TestBenchT.readProperty('testData')
                    .then(data => {
                        fs.writeFileSync(
                            testConfig.TestDataLocation,
                            JSON.stringify(data, null, ' ')
                        );
                        console.log(
                            '\x1b[36m%s\x1b[0m',
                            '* ------ START OF TESTTHING METHOD ------'
                        );
                        return tester
                            .testThing(
                                testConfig.Repetitions,
                                testConfig.Scenarios,
                                logMode
                            )
                            .then(testReport => {
                                testReport.printResults();
                                testReport.storeReport(
                                    testConfig.TestReportsLocation,
                                    tutName
                                );
                                return TestBenchT.writeProperty(
                                    'testReport',
                                    testReport.getResults()
                                ).then(
                                    () => true,
                                    () => false
                                );
                            })
                            .catch(() => {
                                console.log(
                                    '\x1b[36m%s\x1b[0m',
                                    '* :::::ERROR::::: TestThing' +
                                        'method went wrong'
                                );
                                return false;
                            });
                    })
                    .catch(() => {
                        console.log(
                            '\x1b[36m%s\x1b[0m',
                            '* :::::ERROR::::: TestThing: Get' +
                                'test data property failed'
                        );
                        return false;
                    });
            });

            TestBenchT.expose().then(() => {
                console.info(TestBenchT.getThingDescription().title + ' ready');
            });
        })
        .catch(err => {
            console.log(
                '\x1b[36m%s\x1b[0m',
                '* :::::ERROR::::: Servient' + 'startup failed'
            );
        });
});
