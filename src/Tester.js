"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
const tdHelpers = require("@node-wot/td-tools/src/td-helpers");
const TdFunctions = require("./tdFunctions");
const CodeGenerator_1 = require("./CodeGenerator");
const TestReport_1 = require("./TestReport");
const SchemaValidator = require("./SchemaValidator");
class Tester {
    //this is a basic constructor, it is planned to change to incorporate more things into the initiate function
    constructor(tC, tutTd, tut) {
        this.testConfig = tC;
        this.tutTd = tutTd;
        this.tut = tut;
        console.log('-----------------------------------------------');
        console.log(tC);
        console.log(tutTd);
        console.log(tut);
        console.log('***********************************************');
    }
    // Currently: Does basic initiations for the codeGenerator, testReport and generates the JSON Schemas from the TD
    // End Goal: Fetching the thing under test
    // This can be called by using the Initiate action of the test bench
    initiate() {
        console.log("Initiation has started");
        //Generating JSON Schemas for input and output Data of each interaction. Go into the function to find explanations
        try {
            console.log('trying');
            TdFunctions.generateSchemas(this.tutTd, this.testConfig.SchemaLocation);
            console.log('done with generate schema');
        }
        catch (Error) {
            throw "Schema Generation Error" + Error;
        }
        //initiliazing this class doesnt do much
        try {
            console.log('trying code generation');
            this.codeGen = new CodeGenerator_1.CodeGenerator(this.tutTd, this.testConfig);
            console.log('done with code generation :)');
        }
        catch (Error) {
            throw "CodeGenerator Initialization Error" + Error;
        }
        //The test report gets initialized and the first cycle and scenarios are added
        //This means that single tests are possible to be seen in the test report
        this.testReport = new TestReport_1.TestReport();
        // this.testReport.addTestCycle();
        //this.testReport.addTestScenario();
        console.log("Initialization finished");
        return true;
    }
    // todo !!!
    testEvent() {
        // testing event function
    }
    /*
    This method test the action given in the parameters.
    logMode toggles between outputting every single step and error into the terminal. TRUE outputs to the terminal
    testScenario number is related to the json file that contains the requests to be sent. In this file, in the array of interaction names,
    you can put different json values that will be sent to the thing
    */
    //SHOULD BE changed with a version that return a promise
    testAction(testCycle, actionName, testScenario, interactionIndex, logMode) {
        var self = this;
        return new Promise(function (resolve, reject) {
            let toSend;
            let answer;
            //generating the message to send 
            try {
                toSend = self.codeGen.createRequest(actionName, testScenario, interactionIndex);
            }
            catch (Error) {
                // if (logMode) logger.error("Cannot create message for " + actionName + ", look at the previous message to identify the problem");
                if (logMode)
                    console.log("Cannot create message for " + actionName + ", look at the previous message to identify the problem");
                self.testReport.addMessage(testCycle, testScenario, actionName, false, toSend, JSON.parse("\"nothing\""), 12, "Cannot create message: " + Error);
                resolve(false);
            }
            //validating request against a schema. Validator returns an array that describes the error. This array is empty when there is no error
            //a first thinking would say that it shouldnt be necessary but since the requests are user written, there can be errors there as well.
            if (toSend != null) {
                let errors = SchemaValidator.validateRequest(actionName, toSend, self.testConfig.SchemaLocation);
                if (errors.length > 0) { //meaning that there is a validation error
                    // if (logMode) logger.error("Created request is not valid for " + actionName + "\nMessage is " + toSend + "\nError is " + errors);
                    if (logMode)
                        console.log("Created request is not valid for " + actionName + "\nMessage is " + toSend + "\nError is " + errors);
                    self.testReport.addMessage(testCycle, testScenario, actionName, false, toSend, JSON.parse("\"nothing\""), 13, "Created message has bad format: " + JSON.stringify(errors));
                    resolve(false);
                }
            }
            //invoking the action
            try {
                // if (logMode) logger.info("Invoking action " + actionName + " with toSend = ", toSend)
                if (logMode)
                    console.log("Invoking action " + actionName + " with toSend = ", toSend);
                self.tut.invokeAction(actionName, toSend).then((res) => {
                    let curAction = tdHelpers.findInteractionByName(self.tutTd, actionName);
                    if (curAction.hasOwnProperty("outputData")) { //the action doesnt have to answer something back
                        answer = res;
                        // if (logMode) logger.info("Answer is ", answer);
                        if (logMode)
                            console.log("Answer is ", answer);
                        //the actual parsing is done at the validation method so this is just an error check. SHOULD be removed later on
                        try {
                            let temp = answer;
                        }
                        catch (error) {
                            // if (logMode) logger.error("Response is not in JSON format");
                            if (logMode)
                                console.log("Response is not in JSON format");
                            self.testReport.addMessage(testCycle, testScenario, actionName, false, toSend, answer, 15, "Response is not in JSON format: " + error);
                            resolve(false);
                        }
                        //validating the response against its schema, same as before
                        let errorsRes = SchemaValidator.validateResponse(actionName, answer, self.testConfig.SchemaLocation);
                        if (errorsRes.length > 0) { //meaning that there is a validation error
                            // if (logMode) logger.error("Received response is not valid for  " + actionName);
                            if (logMode)
                                console.log("Received response is not valid for  " + actionName);
                            self.testReport.addMessage(testCycle, testScenario, actionName, false, toSend, answer, 16, "Received response is not valid, " + JSON.stringify(errorsRes));
                            resolve(false);
                        }
                        //if nothing is wrong, putting a good result
                        // if (logMode) logger.info(actionName + " is succesful");
                        if (logMode)
                            console.log(actionName + " is succesful");
                        self.testReport.addMessage(testCycle, testScenario, actionName, true, toSend, answer, 100, "");
                        resolve(true);
                    }
                    else { // in case there is no answer needed it is a succesful test as well
                        // if (logMode) logger.info(actionName + " is succesful without return value");
                        if (logMode)
                            console.log(actionName + " is succesful without return value");
                        self.testReport.addMessage(testCycle, testScenario, actionName, true, toSend, JSON.parse("\"nothing\""), 101, "no return value needed");
                        resolve(true);
                    }
                });
            }
            catch (Error) { // in case there is a problem with the invoke of the action
                // if (logMode) logger.error("Response receiving for  " + actionName + "is unsuccesful, continuing with other scenarios");
                if (logMode)
                    console.log("Response receiving for  " + actionName + "is unsuccesful, continuing with other scenarios");
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
    testProperty(testCycle, propertyName, testScenario, interactionIndex, logMode) {
        var self = this;
        return new Promise(function (resolve, reject) {
            let isWritable; //is the property we are testing now writable
            try {
                let curProperty = tdHelpers.findInteractionByName(self.tutTd, propertyName);
                isWritable = curProperty.writable;
                console.log('checking if property is writable:, ', isWritable);
            }
            catch (error) {
                if (logMode)
                    console.log("The property " + propertyName + " doesn't exist in the TD");
                self.testReport.addMessage(testCycle, testScenario, propertyName, false, JSON.parse("\"nothing\""), JSON.parse("\"nothing\""), 33, "The property doesn't exist in the TD");
                resolve(false);
            }
            //getting the property value
            let curPropertyData = self.tut.readProperty(propertyName).then((res) => {
                let data = res;
                if (logMode)
                    console.log("Gotten propery data is ", data);
                console.log('----lalala-----');
                //validating the property value with its Schemas
                // let errorsProp: Array<any> = SchemaValidator.validateResponse(propertyName, data, self.testConfig.SchemaLocation)
                // console.log('----lalala-----')
                // console.log(errorsProp)
                // if (errorsProp.length > 0) { //meaning that there is a validation error
                //     if (logMode) console.log("Received response is not valid for  " + propertyName, errorsProp);
                //     self.testReport.addMessage(testCycle, testScenario, propertyName, false, JSON.parse("\"nothing\""), data, 35, "Received response is not valid, " + JSON.stringify(errorsProp));
                //     resolve(false);
                // } else if (!isWritable) {
                //     // if it is not writable, we are done here! 
                //     if (logMode) console.log("Property test of " + propertyName + " is succesful")
                //     self.testReport.addMessage(testCycle, testScenario, propertyName, true, JSON.parse("\"nothing\""), data, 200, "");
                //     resolve(true);
                // }
                if (isWritable) { //if we can write into the property, it means that we can test whether we can write and get back the same type
                    //the same value will be expected but a spceial error case will be written if it is not the same since maybe the value is changing very fast
                    if (logMode)
                        console.log("Testing the write functionality for ", propertyName);
                    let toSend;
                    let answer;
                    //generating the message to send 
                    try {
                        console.log('-------**********_____________---------');
                        toSend = self.codeGen.createRequest(propertyName, testScenario, interactionIndex);
                        console.log('Value to Send : ', toSend);
                    }
                    catch (Error) {
                        if (logMode)
                            console.log("Cannot create message for " + propertyName + ", look at the previous message to identify the problem");
                        self.testReport.addMessage(testCycle, testScenario, propertyName, false, toSend, JSON.parse("\"nothing\""), 40, "Cannot create message: " + Error);
                        resolve(false);
                    }
                    //validating request against a schema, same as the action. Since the requests are written by the user there can be errors
                    //Pay attention that validateResponse is called because writing to a property is based on its outputData
                    // let errors: Array<any> = SchemaValidator.validateResponse(propertyName, toSend, self.testConfig.SchemaLocation);
                    // if (errors.length > 0) { //meaning that there is a validation error
                    //     if (logMode) console.log("Created request is not valid for " + propertyName + "\nMessage is " + toSend + "\nError is " + errors);
                    //     self.testReport.addMessage(testCycle, testScenario, propertyName, false, toSend, JSON.parse("\"nothing\""), 41, "Created message has bad format: " + JSON.stringify(errors));
                    //     resolve(false);
                    // }
                    //setting the property, aka writing into it
                    if (logMode)
                        console.log("Setting property " + propertyName + " with toSend = ", toSend);
                    self.tut.writeProperty(propertyName, toSend).then(() => {
                        //now reading and hoping to get the same value
                        let curPropertyData2 = self.tut.readProperty(propertyName).then((res2) => {
                            let data2 = res2;
                            if (logMode)
                                console.log("For the second one, gotten propery data is ", data2);
                            //validating the gotten value (this shouldnt be necessary since the first time was correct but it is here nonetheless)
                            // let errorsProp2: Array<any> = SchemaValidator.validateResponse(propertyName, data2, self.testConfig.SchemaLocation)
                            let errorsProp2 = [];
                            if (errorsProp2.length > 0) { //meaning that there is a validation error
                                if (logMode)
                                    console.log("Received second response is not valid for  " + propertyName, errorsProp2);
                                //here for the received, two response values are put
                                self.testReport.addMessage(testCycle, testScenario, propertyName, false, toSend, JSON.parse("[" + JSON.stringify(data) + "," + JSON.stringify(data2) + "]"), 45, "Received second response is not valid, " + JSON.stringify(errorsProp2));
                                resolve(false);
                            }
                            else { //if there is no validation error we can test if the value we've gotten is the same as the one we wrote
                                if (JSON.stringify(data2) == JSON.stringify(toSend)) {
                                    // wohoo everything is fine
                                    if (logMode)
                                        console.log("Property test of " + propertyName + " is succesful");
                                    if (logMode)
                                        console.log("The value gotten after writing is the same for the property " + propertyName);
                                    self.testReport.addMessage(testCycle, testScenario, propertyName, true, toSend, JSON.parse("[" + JSON.stringify(data) + "," + JSON.stringify(data2) + "]"), 201, "");
                                    resolve(true);
                                }
                                else {
                                    //maybe the value changed between two requests...
                                    if (logMode)
                                        console.log("Property test of " + propertyName + " is succesful BUT");
                                    if (logMode)
                                        console.log("The second get didn't match the write");
                                    self.testReport.addMessage(testCycle, testScenario, propertyName, false, toSend, JSON.parse("[" + JSON.stringify(data) + "," + JSON.stringify(data2) + "]"), 46, "The second get didn't match the write");
                                    resolve(false);
                                }
                            }
                        }).catch((error) => {
                            if (logMode)
                                console.log("Problem fetching property " + propertyName + "in the second get");
                            self.testReport.addMessage(testCycle, testScenario, propertyName, false, JSON.parse("\"nothing\""), JSON.parse("\"nothing\""), 31, "Couldnt fetch property in the second get" + error);
                            reject(false);
                        });
                    }).catch((error) => {
                        if (logMode)
                            console.log("Couldn't set the property " + propertyName);
                        self.testReport.addMessage(testCycle, testScenario, propertyName, false, toSend, JSON.parse("\"nothing\""), 32, "Problem setting property" + Error);
                        resolve(false);
                    });
                }
            }).catch((error) => {
                if (logMode)
                    console.log("Problem fetching property " + propertyName);
                self.testReport.addMessage(testCycle, testScenario, propertyName, false, JSON.parse("\"nothing\""), JSON.parse("\"nothing\""), 30, "Couldnt fetch property");
                reject(false);
            });
        });
    }
    testInteraction(testCycle, testScenario, interactionIndex, interaction, logMode) {
        var self = this;
        return new Promise(function (resolve, reject) {
            console.log(testCycle);
            console.log(testScenario);
            console.log(interactionIndex);
            console.log(interaction);
            console.log(logMode);
            console.log('------');
            console.log(interaction.semanticType);
            // if (interaction.semanticType.indexOf('Property') > -1) { //testing a property
            if (interaction.pattern == 'Property') {
                console.log('------&&&&&&');
                let propName = interaction.name;
                if (logMode)
                    console.log(" Testing Property ", propName); // the i alue is put just to be able to track the order
                self.testProperty(testCycle, propName, testScenario, interactionIndex, logMode).then((curBool) => {
                    resolve(curBool);
                }).catch((curBool) => {
                    if (logMode)
                        console.log("Error in testing property ", propName, ", check previous messages");
                    reject(curBool);
                });
            }
            else if (interaction.semanticType.indexOf("Action") > -1) { //testing an action
                let actName = interaction.name;
                if (logMode)
                    console.log(" Testing Action ", actName); // the i alue is put just to be able to track the order
                self.testAction(testCycle, actName, testScenario, interactionIndex, logMode).then((curBool) => {
                    resolve(curBool);
                }).catch((curBool) => {
                    if (logMode)
                        console.log("Error in testing action ", actName, ", check previous messages");
                    reject(curBool);
                });
            }
            else if (interaction.semanticType.indexOf("Event") > -1) { //testing an event
                let eveName = interaction.name;
                if (logMode)
                    console.log(" Testing Action ", actName); // the i alue is put just to be able to track the order
                self.testAction(testCycle, actName, testScenario, interactionIndex, logMode).then((curBool) => {
                    resolve(curBool);
                }).catch((curBool) => {
                    if (logMode)
                        console.log("Error in testing action ", actName, ", check previous messages");
                    reject(curBool);
                });
            }
            else {
                if (logMode)
                    console.log("Asked for something other than Action or Property");
                reject(false);
            }
        });
    }
    /*
        This method tests all the messages with the values of one given scenario
        Actions and Properties are all tested
        The return value needs to be changed and made into a Promise
    */
    testScenario(testCycle, testScenario, logMode) {
        let interactionsLength = this.tutTd.interaction.length; //how many interactions we have to test
        let returnBool = true; // the return value that indicates false even if only on interaction is tested to prove false
        /*for (var i = 0; i < interactionsLength; i++) {
            let curInter: TD.Interaction = this.tutTd.interaction[i];
            //iterating through the list of interactions in the order that they are listed in the TD

        }
        */
        //constructing the list of interactions for this scenario
        let interactionList = this.buildInteractionList(testScenario);
        var self = this;
        return new Promise(function (resolve, reject) {
            let promise = Promise.resolve();
            interactionList.forEach((interactionName, index) => {
                promise = promise.then(() => {
                    console.log('printing interaction name:', interactionName);
                    return self.testInteraction(testCycle, testScenario, index, tdHelpers.findInteractionByName(self.tutTd, interactionName), logMode);
                });
            });
            //in the end the return value indicates if at least one interaction failed
            promise.then(() => {
                if (logMode)
                    console.log("Test Scenario nb", testScenario, " has finished");
                resolve();
            }).catch((error) => {
                if (logMode)
                    console.log("Test Scenario nb", testScenario, " has finished with an error");
                reject(error);
            });
        });
    }
    testCycle(cycleNumber, logMode) {
        var self = this;
        let maxScenario = self.findMaxScenario(); //finding how many test scenarios are there to test
        let scenarios = [];
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
                if (logMode)
                    console.log("Test Cycle nb", cycleNumber, " has finished");
                resolve();
            }).catch(() => {
                if (logMode)
                    console.log("Test Cycle nb", cycleNumber, " has finished with an error");
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
    testThing(repetition, logMode) {
        var self = this;
        let reps = [];
        for (var i = 0; i < repetition; i++) {
            reps[i] = i;
        }
        return new Promise(function (resolve, reject) {
            let promise = Promise.resolve();
            reps.forEach(repNb => {
                promise = promise.then(() => {
                    if (logMode)
                        console.log("Cycle " + repNb + ", testing all scenarios");
                    self.testReport.addTestCycle();
                    return self.testCycle(repNb, logMode);
                });
            });
            promise.then(() => {
                if (logMode)
                    console.log("Testing the Thing has finished");
                resolve(self.testReport);
            }).catch(() => {
                if (logMode)
                    console.log("Testing the Thing has finished with an error");
                reject();
            });
        });
    }
    /*
        This function goes through the requests file to find which one has the most requests and this becomes the maxScenario
        value that is used in the TestThing method
    */
    findMaxScenario() {
        let reqLoc = this.testConfig.RequestsLocation;
        let requests = JSON.parse(fs.readFileSync(reqLoc, "utf8")); //fetching the requests
        //going through the array to find the biggest length
        let maxSize = 0;
        /*
        Object.getOwnPropertyNames(requests).forEach(function (val, idx, array) {
            let curSize: number = requests[val].length
            if (curSize > maxSize) {
                maxSize = curSize;
            }
        });
        */
        maxSize = requests.length;
        //console.log("max scenario is", maxSize)
        return maxSize;
    }
    buildInteractionList(scenario) {
        let reqLoc = this.testConfig.RequestsLocation;
        let requests = JSON.parse(fs.readFileSync(reqLoc, "utf8")); //fetching the requests
        let interactionList = [];
        requests[scenario].forEach((curScenario) => {
            interactionList.push(curScenario.interactionName);
        });
        //console.log("this scenarios interactions are", interactionList); 
        return interactionList;
    }
}
exports.Tester = Tester;
