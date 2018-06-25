/*
This class is used for testing an IoT thing that hosts a Thing Description. 
The testing is based on the Thing Description but the configuration needs to be made with the test-config file.
This file has to be in the parent directory and needs to have the interface testConfig
Also a file with the contents of the requests need to be provided, the location should be specified in the test config file.
After that you can choose to test a single interaction or a the whole Thing Description.
It is possible to define multiple test scenarios with each having different requests to be sent
After the test a test report can be generated and analyzed to get more meaning of the results.
!!! tut means Thing Under Test
*/

import fs = require('fs');
// import _ from 'wot-typescript-definitions';// global W3C WoT Scripting API definitions
import Servient from 'node-wot/packages/core';
import {Thing} from 'node-wot/packages/td-tools';
import * as TD from 'node-wot/packages/td-tools';
import * as TDParser from 'node-wot/packages/td-tools';
import * as tdHelpers from 'node-wot/packages/td-tools'
import * as TdFunctions from './tdFunctions'
import { CodeGenerator } from './DataGenerator'
import { TestReport } from './TestReport'
import * as SchemaValidator from './SchemaValidator'
import { testConfig } from './v2-test-bench'
import timers = require("timers")

export class Tester {
    private tutTd: Thing; //the TD that belongs to the Thing under Test
    private testConfig: testConfig; //the file that describes various locations of the files that are needed. Must be configured by the user
    public codeGen: CodeGenerator; //this will generate the requests to be sent to the tut
    public testReport: TestReport; //after the testing, this will contain the bare results
    private tut: WoT.ConsumedThing; // the thing under test

    //this is a basic constructor, it is planned to change to incorporate more things into the initiate function
    constructor(tC: testConfig, tutTd: Thing, tut: WoT.ConsumedThing) {
        this.testConfig = tC;
        this.tutTd = tutTd;
        this.tut = tut;
    }

    // Currently: Does basic initiations for the codeGenerator, testReport and generates the JSON Schemas from the TD
    // End Goal: Fetching the thing under test
    // This can be called by using the Initiate action of the test bench
    public initiate():boolean {
        console.log('\x1b[36m%s\x1b[0m', "* Initiation has started")
        //Generating JSON Schemas for input and output Data of each interaction. Go into the function to find explanations
        try {
            console.log('\x1b[36m%s\x1b[0m', '* Starting schema generation')
            TdFunctions.generateSchemas(this.tutTd, this.testConfig.SchemaLocation);
            console.log('\x1b[36m%s\x1b[0m', '* Done with generate schema')
        } catch (Error) {
            throw "Schema Generation Error" + Error
        }

        //initiliazing this class doesnt do much
        try {
            console.log('\x1b[36m%s\x1b[0m', '* Starting code generation')
            this.codeGen = new CodeGenerator(this.tutTd, this.testConfig)
            console.log('\x1b[36m%s\x1b[0m', '* done with code generation')
        } catch (Error) {
            throw "CodeGenerator Initialization Error" + Error
        }
        //The test report gets initialized and the first cycle and scenarios are added
        //This means that single tests are possible to be seen in the test report
        this.testReport = new TestReport();
        console.log('\x1b[36m%s\x1b[0m', "* Initialization finished")
        return true;
    }

    // -----TODO thing of timers to cause event
    public testEvent(testCycle: number, actionName: string, testScenario: number, interactionIndex:number,logMode: boolean): Promise<any> {
        // testing event function

        return new Promise(function (resolve, reject) {
            // implement event testing here:
            resolve(true);
        });
    }

    /*
    This method test the action given in the parameters. 
    logMode toggles between outputting every single step and error into the terminal. TRUE outputs to the terminal
    testScenario number is related to the json file that contains the requests to be sent. In this file, in the array of interaction names,
    you can put different json values that will be sent to the thing
    */
    public testAction(testCycle: number, actionName: string, testScenario: number, interactionIndex:number, logMode: boolean): Promise<any> {
        var self = this;
        return new Promise(function (resolve, reject) {
            let toSend: JSON;
            let answer: JSON;
            //generating the message to send 
            try {
                toSend = self.codeGen.findRequestValue(self.testConfig.TestDataLocation, testScenario, interactionIndex, actionName);
                if (logMode) console.log('\x1b[36m%s%s\x1b[0m', '* Created value to send :', JSON.stringify(toSend, null, ' '));
            } catch (Error) {
                if (logMode) console.log('\x1b[36m%s\x1b[0m', "* Cannot create message for " + actionName + ", look at the previous message to identify the problem");
                self.testReport.addMessage(testCycle, testScenario, actionName, false, toSend, JSON.parse("\"nothing\""), 12, "Cannot create message: " + Error);
                resolve(false);
            }
            //validating request against a schema. Validator returns an array that describes the error. This array is empty when there is no error
            //a first thinking would say that it shouldnt be necessary but since the requests are user written, there can be errors there as well.
            if (toSend != null) {
                let errors: Array<any> = SchemaValidator.validateRequest(actionName, toSend, self.testConfig.SchemaLocation, "Action");
                if (errors.length > 0) { //meaning that there is a validation error
                    if (logMode) console.log('\x1b[36m%s\x1b[0m', "* Created request is not valid for " + actionName + "\nMessage is " + toSend + "\nError is " + errors);
                    self.testReport.addMessage(testCycle, testScenario, actionName, false, toSend, JSON.parse("\"nothing\""), 13, "Created message has bad format: " + JSON.stringify(errors));
                    resolve(false);
                } else {
                    if (logMode) console.log('\x1b[36m%s\x1b[0m', "* Created request is valid for: " + actionName);
                }
            }
            //invoking the action
            try {
                if (logMode) console.log('\x1b[36m%s%s\x1b[0m', "* Invoking action " + actionName + " with data:", JSON.stringify(toSend, null, ' '));
                self.tut.invokeAction(actionName, toSend).then((res: any) => {
                    let curAction: TD.Interaction = tdHelpers.findInteractionByName(self.tutTd, actionName);
                    if (curAction.hasOwnProperty("outputSchema")) { //the action doesnt have to answer something back
                        answer = res;
                        if (logMode) console.log('\x1b[36m%s%s\x1b[0m', "* Answer is:", JSON.stringify(answer, null, ' '));
                        //the actual parsing is done at the validation method so this is just an error check. SHOULD be removed later on
                        try {
                            let temp: JSON = answer;
                        } catch (error) {
                            // if (logMode) logger.error("Response is not in JSON format");
                            if (logMode) console.log('\x1b[36m%s\x1b[0m', "* Response is not in JSON format");
                            self.testReport.addMessage(testCycle, testScenario, actionName, false, toSend, answer, 15, "Response is not in JSON format: " + error);
                            resolve(false);
                        }
                        //validating the response against its schema, same as before
                        let errorsRes: Array<any> = SchemaValidator.validateResponse(actionName, answer, self.testConfig.SchemaLocation, 'Action');
                        if (errorsRes.length > 0) { //meaning that there is a validation error
                            if (logMode) console.log('\x1b[36m%s\x1b[0m', "* Received response is not valid for: " + actionName);
                            self.testReport.addMessage(testCycle, testScenario, actionName, false, toSend, answer, 16, "Received response is not valid, " + JSON.stringify(errorsRes));
                            resolve(false);
                        } else {
                            if (logMode) console.log('\x1b[36m%s\x1b[0m', "* Received response is valid for: " + actionName);
                        }
                        //if nothing is wrong, putting a good result
                        if (logMode) console.log('\x1b[36m%s%s\x1b[0m', "* ", actionName + " is succesful");
                        self.testReport.addMessage(testCycle, testScenario, actionName, true, toSend, answer, 100, "");
                        resolve(true);
                    } else { // in case there is no answer needed it is a succesful test as well
                        if (logMode) console.log('\x1b[36m%s%s\x1b[0m', "* ", actionName + " is succesful without return value");
                        self.testReport.addMessage(testCycle, testScenario, actionName, true, toSend, JSON.parse("\"nothing\""), 101, "no return value needed");
                        resolve(true);
                    }

                })
            } catch (Error) { // in case there is a problem with the invoke of the action
                if (logMode) console.log("* Response receiving for  " + actionName + "is unsuccesful, continuing with other scenarios");
                self.testReport.addMessage(testCycle, testScenario, actionName, false, toSend, JSON.parse("\"nothing\""), 10, "Problem invoking the action" + Error);
                resolve(false);
            }
        });
    }

    /*
    This method tests the property given in the parameters
    logMode toggles between outputting every single step and error into the terminal. TRUE outputs to the terminal
    testScenario number is related to the json file that contains the requests to be sent. In this file, in the array of interaction names,
    you can put different json values that will be sent to the thing
    First the property values are fetched from the thing. Then if the property is writable, a value from the requests is written to the property
    Then property values are fetched again. Here it is hoped that the value is the same as the written one but if the value changes in between it will
    be different. This is recorded as an error but has a specific error case number. This basically tests if the property is really writable
    */
    public testProperty(testCycle: number, propertyName: string, testScenario: number, interactionIndex:number, logMode: boolean): Promise<any> {
        var self = this;
        return new Promise(function (resolve, reject) {
            let isWritable: boolean; //is the property we are testing now writable
            try {
                let curProperty: TD.Interaction = tdHelpers.findInteractionByName(self.tutTd, propertyName);
                isWritable = curProperty.writable;
                if (logMode) console.log('\x1b[36m%s%s\x1b[0m', '* Checking if property is writable:', isWritable);

            } catch (error) {
                if (logMode) console.log('\x1b[36m%s\x1b[0m', "* The property " + propertyName + " doesn't exist in the TD");
                self.testReport.addMessage(testCycle, testScenario, propertyName, false, JSON.parse("\"nothing\""), JSON.parse("\"nothing\""), 33, "The property doesn't exist in the TD");
                resolve(false);
            }
            //getting the property value
            let curPropertyData: any = self.tut.readProperty(propertyName).then((res: any) => {
                let data: JSON = res;
                if (logMode) console.log('\x1b[36m%s%s\x1b[0m', "* DATA AFTER FIRST READ PROPERTY:", JSON.stringify(data, null, ' '));
                //validating the property value with its Schemas
                let errorsProp: Array<any> = SchemaValidator.validateResponse(propertyName, data, self.testConfig.SchemaLocation, "Property");

                if (errorsProp.length > 0) { //meaning that there is a validation error
                    if (logMode) console.log('\x1b[36m%s%s\x1b[0m', "* Received response is not valid for: " + propertyName, errorsProp);
                    self.testReport.addMessage(testCycle, testScenario, propertyName, false, JSON.parse("\"nothing\""), data, 35, "Received response is not valid, " + JSON.stringify(errorsProp));
                    resolve(false);
                } else {
                    if (logMode) console.log('\x1b[36m%s\x1b[0m', "* Received response is valid for: " + propertyName);
                }
                if (!isWritable) {
                    // if it is not writable, we are done here! 
                    if (logMode) console.log('\x1b[36m%s\x1b[0m', "* Property test of " + propertyName + " is succesful: no write, first response is schema valid")
                    self.testReport.addMessage(testCycle, testScenario, propertyName, true, JSON.parse("\"nothing\""), data, 200, "");
                    resolve(true);
                }
                if (isWritable) { //if we can write into the property, it means that we can test whether we can write and get back the same type
                    //the same value will be expected but a spceial error case will be written if it is not the same since maybe the value is changing very fast
                    if (logMode) console.log('\x1b[36m%s%s\x1b[0m', "* Testing the write functionality for:", propertyName);
                    let toSend: JSON;
                    let answer: JSON;
                    //generating the message to send 
                    try {
                        toSend = self.codeGen.findRequestValue(self.testConfig.TestDataLocation, testScenario, interactionIndex, propertyName);
                        if (logMode) console.log('\x1b[36m%s%s\x1b[0m', '* Created value to send:', JSON.stringify(toSend, null, ' '));
                    } catch (Error) {
                        if (logMode) console.log('\x1b[36m%s\x1b[0m', "* Cannot create message for " + propertyName + ", look at the previous message to identify the problem");
                        self.testReport.addMessage(testCycle, testScenario, propertyName, false, toSend, JSON.parse("\"nothing\""), 40, "Cannot create message: " + Error);
                        resolve(false);
                    }

                    //validating request against a schema, same as the action. Since the requests are written by the user there can be errors
                    //Pay attention that validateResponse is called because writing to a property is based on its outputData
                    let errors: Array<any> = SchemaValidator.validateResponse(propertyName, toSend, self.testConfig.SchemaLocation, "Property");
                    if (errors.length > 0) { //meaning that there is a validation error
                        if (logMode) console.log('\x1b[36m%s\x1b[0m', "* Created request is not valid for " + propertyName + "\nMessage is " + toSend + "\nError is " + errors);
                        self.testReport.addMessage(testCycle, testScenario, propertyName, false, toSend, JSON.parse("\"nothing\""), 41, "Created message has bad format: " + JSON.stringify(errors));
                        resolve(false);
                    } else {
                        if (logMode) console.log('\x1b[36m%s\x1b[0m', "* Created request is valid for: " + propertyName);
                    }

                    //setting the property, aka writing into it
                    if (logMode) console.log('\x1b[36m%s%s\x1b[0m', "* Writing to property " + propertyName + " with data:", JSON.stringify(toSend, null, ' '));
                    self.tut.writeProperty(propertyName, toSend).then(() => {
                        //now reading and hoping to get the same value
                        let curPropertyData2: any = self.tut.readProperty(propertyName).then((res2: any) => {
                            let data2: JSON = res2;
                            if (logMode) console.log('\x1b[36m%s%s\x1b[0m', "* For the second one, gotten propery data is:", JSON.stringify(data2, null, ' '));
                            //validating the gotten value (this shouldnt be necessary since the first time was correct but it is here nonetheless)

                            let errorsProp2: Array<any> = SchemaValidator.validateResponse(propertyName, data2, self.testConfig.SchemaLocation, "Property")

                            if (errorsProp2.length > 0) { //meaning that there is a validation error
                                if (logMode) console.log('\x1b[36m%s%s\x1b[0m', "* Received second response is not valid for: " + propertyName, errorsProp2);
                                //here for the received, two response values are put
                                self.testReport.addMessage(testCycle, testScenario, propertyName, false, toSend, JSON.parse("[" + JSON.stringify(data) + "," + JSON.stringify(data2) + "]"), 45, "Received second response is not valid, " + JSON.stringify(errorsProp2));
                                resolve(false);
                            } else { //if there is no validation error we can test if the value we've gotten is the same as the one we wrote
                                if (logMode) console.log('\x1b[36m%s\x1b[0m', "* Received second response is valid for: " + propertyName);
                                if (JSON.stringify(data2) == JSON.stringify(toSend)) {
                                    // wohoo everything is fine
                                    if (logMode) console.log('\x1b[36m%s\x1b[0m', "* Property test of " + propertyName + " is succesful: write fetch successful");
                                    if (logMode) console.log('\x1b[36m%s\x1b[0m', "* The value gotten after writing is the same for the property: " + propertyName);
                                    self.testReport.addMessage(testCycle, testScenario, propertyName, true, toSend, JSON.parse("[" + JSON.stringify(data) + "," + JSON.stringify(data2) + "]"), 201, "");
                                    resolve(true);
                                } else {
                                    //maybe the value changed between two requests...
                                    if (logMode) console.log('\x1b[36m%s\x1b[0m', "* Property test of " + propertyName + " is succesful: write works, fetch not matching");
                                    self.testReport.addMessage(testCycle, testScenario, propertyName, false, toSend, JSON.parse("[" + JSON.stringify(data) + "," + JSON.stringify(data2) + "]"), 46, "The second get didn't match the write");
                                    resolve(false);
                                }
                            }
                        }).catch((error: any) => { //problem in the node-wot level
                            if (logMode) console.log('\x1b[36m%s\x1b[0m', "* Problem second time fetching property " + propertyName + "in the second get");
                            self.testReport.addMessage(testCycle, testScenario, propertyName, false, JSON.parse("\"nothing\""), JSON.parse("\"nothing\""), 31, "Couldnt fetch property in the second get" + error);
                            reject(false);
                        });
                    }).catch((error: any) => {
                        if (logMode) console.log('\x1b[36m%s\x1b[0m', "* Couldn't set the property: " + propertyName);
                        self.testReport.addMessage(testCycle, testScenario, propertyName, false, toSend, JSON.parse("\"nothing\""), 32, "Problem setting property" + Error);
                        resolve(false);
                    });
                }
            }).catch((error: any) => { //problem in the node-wot level
                if (logMode) console.log('\x1b[36m%s\x1b[0m', "* Problem fetching first time property: " + propertyName);
                self.testReport.addMessage(testCycle, testScenario, propertyName, false, JSON.parse("\"nothing\""), JSON.parse("\"nothing\""), 30, "Couldnt fetch property");
                reject(false);
            });
        });
    }

    private testInteraction(testCycle: number, testScenario: number, interactionIndex:number , interaction: TD.Interaction, logMode: boolean): Promise<any> {
        var self = this;
        // console.log('\x1b[36m%s\x1b[0m', '* ******* TESTING INTERACTION:', interaction);
        return new Promise(function (resolve, reject) {
            let pattern: string = String(interaction.pattern);
            if (pattern == 'Property') {
                let propName: string = interaction.name;
                if (logMode) console.log('\x1b[36m%s%s%s\x1b[0m', "* ..................... Testing Property:", propName, ".................");
                self.testProperty(testCycle, propName, testScenario, interactionIndex, logMode).then((curBool) => {
                    if (logMode) console.log('\x1b[36m%s%s%s\x1b[0m', "* ..................... End Testing Property:", propName, ".................");
                    resolve(curBool);
                }).catch((curBool) => {
                    if (logMode) console.log('\x1b[36m%s%s%s\x1b[0m', "* Error in testing property ", propName, ", check previous messages")
                    reject(curBool);
                });
            } else if (pattern == 'Action') {
                let actName: string = interaction.name;
                if (logMode) console.log('\x1b[36m%s%s%s\x1b[0m', "* ..................... Testing Action:", actName, ".................");
                self.testAction(testCycle, actName, testScenario, interactionIndex, logMode).then((curBool) => {
                    if (logMode) console.log('\x1b[36m%s%s%s\x1b[0m', "* ..................... End Testing Action:", actName, ".................");
                    resolve(curBool);
                }).catch((curBool) => {
                    if (logMode) console.log('\x1b[36m%s%s%s\x1b[0m', "* Error in testing action ", actName, ", check previous messages")
                    reject(curBool);
                });
            } else if (pattern == 'Event') {    
                let eveName: string = interaction.name;
                if (logMode) console.log('\x1b[36m%s%s%s\x1b[0m', "* ..................... Testing Event: ", eveName, ".................");
                self.testEvent(testCycle, eveName, testScenario, interactionIndex, logMode).then((curBool) => {
                    if (logMode) console.log('\x1b[36m%s%s%s\x1b[0m', "* ..................... End Testing Event: ", eveName, ".................");
                    resolve(curBool);
                }).catch((curBool) => {
                    if (logMode) console.log('\x1b[36m%s%s%s\x1b[0m', "* Error in testing event ", eveName, ", check previous messages")
                    reject(curBool);
                });
            } else {
                if (logMode) console.log('\x1b[36m%s\x1b[0m', "* Asked for something other than Action or Property or Event")
                reject(false);
            }
        });
    }
    /*
        This method tests all the messages with the values of one given scenario
        Actions and Properties are all tested
        The return value needs to be changed and made into a Promise
    */
    public testScenario(testCycle: number, testScenario: number, logMode: boolean): Promise<any> {
        let interactionsLength: number = this.tutTd.interaction.length; //how many interactions we have to test
        let interactionList: Array<string> = [];
        for (var i = 0; i < interactionsLength; i++) {
            let curInter: TD.Interaction = this.tutTd.interaction[i];
            interactionList.push(curInter.name);
        }

        var self = this;
        return new Promise(function (resolve, reject) {
            let promise: Promise<any> = Promise.resolve();
            interactionList.forEach((interactionName,index) => {
                promise = promise.then(() => {
                    return self.testInteraction(testCycle, testScenario, index, tdHelpers.findInteractionByName(self.tutTd, interactionName), logMode);
                });
            });
            //in the end the return value indicates if at least one interaction failed
            promise.then(() => {
                if (logMode) console.log('\x1b[36m%s%s%s\x1b[0m', "* ------------- Test Scenario nb", testScenario, " has finished -------------")
                resolve();
            }).catch((error:Error) => {
                if (logMode) console.log('\x1b[36m%s%s%s\x1b[0m', "* Test Scenario nb", testScenario, " has finished with an error")
                reject(error);
            });
        });

    }

    public testCycle(cycleNumber: number, scenarioNumber: number, logMode: boolean): Promise<any> {
        var self = this;
        let maxScenario: number = scenarioNumber;
        let scenarios: Array<number> = [];
        for (var i = 0; i < maxScenario; i++) {
            scenarios[i] = i;
        }
        return new Promise(function (resolve, reject) {
            let promise = Promise.resolve();
            scenarios.forEach(scenarioNb => {
                promise = promise.then(() => {
                    self.testReport.addTestScenario();
                    return self.testScenario(cycleNumber, scenarioNb, logMode);
                });
            });
            promise.then(() => {
                if (logMode) console.log('\x1b[36m%s%s%s\x1b[0m', "* Test Cycle nb", cycleNumber, " has finished without an error")
                resolve();
            }).catch(() => {
                if (logMode) console.log('\x1b[36m%s%s%s\x1b[0m', "* Test Cycle nb", cycleNumber, " has finished with an error")
                reject();
            });
        });
    }

    /*
    This is the action that is accessible from the Thing Description. 
    Meaning that, after consumin the test bench, this action can be invoked to test the entirety of the Thing with many test scenarios and repetitions
    There is only a simple, repetitive call to test Scenario with adding arrays into the test report in between
    Also according to the repetition number specified in the test config, the same test can be done multiple times.

    It return the test report that has all the required functions to display the results
    */

    public testThing(repetition: number, scenarioNumber: number, logMode: boolean): Promise<TestReport> {
        var self = this;
        let reps: Array<number> = [];
        for (var i = 0; i < repetition; i++) {
            reps[i] = i;
        }
        return new Promise(function (resolve, reject) {
            let promise = Promise.resolve();
            reps.forEach(repNb => {
                promise = promise.then(() => {
                    if (logMode) console.log('\x1b[36m%s\x1b[0m', "* Cycle " + repNb + ", testing all scenarios")
                    self.testReport.addTestCycle();
                    return self.testCycle(repNb, scenarioNumber, logMode);
                });
            });
            promise.then(() => {
                if (logMode) console.log('\x1b[36m%s\x1b[0m', "* Testing the Thing has finished without an error")
                resolve(self.testReport);
            }).catch(() => {
                if (logMode) console.log('\x1b[36m%s\x1b[0m', "* Testing the Thing has finished with an error")
                reject();
            });
        });
    }
}
