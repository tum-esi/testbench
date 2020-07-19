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
import {Servient} from '@node-wot/core';
import {Thing} from '@node-wot/td-tools';
import * as wot from 'wot-typescript-definitions';
import * as Utils from './utilities'
import { TestReport } from './TestReport'
import { testConfig } from './utilities'
var timers = require("timers")

export class Tester {
	private tutTd: Thing; //the TD that belongs to the Thing under Test
	private testConfig: testConfig; //the file that describes various locations of the files that are needed. Must be configured by the user
	public codeGen: Utils.CodeGenerator; //this will generate the requests to be sent to the tut
	public testReport: TestReport; //after the testing, this will contain the bare results
	private tut: wot.ConsumedThing; // the thing under test

	//this is a basic constructor, it is planned to change to incorporate more things into the initiate function
	constructor(tC: testConfig, tutTd: Thing, tut: wot.ConsumedThing) {
		this.testConfig = tC;
		this.tutTd = tutTd;
		this.tut = tut;
	}

	// generates Schemas, generates fake data, adds TestReport instance
	public initiate(logMode: boolean): number {
		if (logMode) console.log('\x1b[36m%s\x1b[0m', "* Initiation has started");
		let check = 0;
		try {
			check = Utils.generateSchemas(this.tutTd, this.testConfig.SchemaLocation, logMode);
			if (logMode) console.log('\x1b[36m%s\x1b[0m', '* Finished schema generation.');
		} catch (Error) {
			if (logMode) console.log("Schema Generation Error" + Error);
		}
		try {
			this.codeGen = new Utils.CodeGenerator(this.tutTd, this.testConfig)
			if (logMode) console.log('\x1b[36m%s\x1b[0m', '* Finished code generation');
		} catch (Error) {
			if (logMode) console.log("Utils.CodeGenerator Initialization Error" + Error);
		}
		//The test report gets initialized and the first cycle and scenarios are added
		//This means that single tests are possible to be seen in the test report
		this.testReport = new TestReport();
		if (logMode) console.log('\x1b[36m%s\x1b[0m', "* Initialization finished");
		return check;
	}

	// -----TODO thing of timers to cause event
	public testEvent(testCycle: number, actionName: string, interaction: wot.EventFragment, testScenario: number, interactionIndex: number,logMode: boolean): Promise<any> {
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
	public testAction(testCycle: number, actionName: string, interaction: wot.ActionFragment, testScenario: number, interactionIndex: number, logMode: boolean): Promise<any> {
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
				resolve(true);
			}
			//validating request against a schema. Validator returns an array that describes the error. This array is empty when there is no error
			//a first thinking would say that it shouldnt be necessary but since the requests are user written, there can be errors there as well.
			if (toSend != null) {
				let errors: Array<any> = Utils.validateRequest(actionName, toSend, self.testConfig.SchemaLocation, "Action");
				if (errors) { //meaning that there is a validation error
					if (logMode) console.log('\x1b[36m%s\x1b[0m', "* Created request is not valid for " + actionName + "\nMessage is " + toSend + "\nError is " + errors);
					self.testReport.addMessage(testCycle, testScenario, actionName, false, toSend, JSON.parse("\"nothing\""), 13, "Created message has bad format: " + JSON.stringify(errors));
					resolve(true);
				} else {
					if (logMode) console.log('\x1b[36m%s\x1b[0m', "* Created request is valid for: " + actionName);
				}
			}
			//invoking the action
			try {
				if (logMode) console.log('\x1b[36m%s%s\x1b[0m', "* Invoking action " + actionName + " with data:", JSON.stringify(toSend, null, ' '));
				// Apply a timeout of 5 seconds to doSomething
				// TO DO: no repeat the same thing twice
				if(toSend!=null){
					let invokeAction = Utils.promiseTimeout(self.testConfig.ActionTimeout, self.tut.invokeAction(actionName, toSend));
					invokeAction.then((res: any) => {
						if (interaction.hasOwnProperty('output')) { //the action doesnt have to answer something back
							let answer = res;
							if (logMode) console.log('\x1b[36m%s%s\x1b[0m', "* Answer is:", JSON.stringify(answer, null, ' '));
							try {
								let temp: JSON = answer;
							} catch (error) {
								if (logMode) console.log('\x1b[36m%s\x1b[0m', "* Response is not in JSON format");
								self.testReport.addMessage(testCycle, testScenario, actionName, false, toSend, answer, 15, "Response is not in JSON format: " + error);
								resolve(true);
							}
							//validating the response against its schema, same as before
							let errorsRes: Array<any> = Utils.validateResponse(actionName, answer, self.testConfig.SchemaLocation, 'Action');
							if (errorsRes) { //meaning that there is a validation error
								if (logMode) console.log('\x1b[36m%s\x1b[0m', "* Received response is not valid for: " + actionName);
								self.testReport.addMessage(testCycle, testScenario, actionName, false, toSend, answer, 16, "Received response is not valid, " + JSON.stringify(errorsRes));
								resolve(true);
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
					}).catch((error) => {
						self.testReport.addMessage(testCycle, testScenario, actionName, false, toSend, answer, 999, "Invoke Action Error: " + error);
						resolve(true);
					});
				} else {
					let invokeAction = Utils.promiseTimeout(self.testConfig.ActionTimeout, self.tut.invokeAction(actionName));
					invokeAction.then((res: any) => {
						if (interaction.hasOwnProperty('output')) { //the action doesnt have to answer something back
							let answer = res;
							if (logMode) console.log('\x1b[36m%s%s\x1b[0m', "* Answer is:", JSON.stringify(answer, null, ' '));
							try {
								let temp: JSON = answer;
							} catch (error) {
								if (logMode) console.log('\x1b[36m%s\x1b[0m', "* Response is not in JSON format");
								self.testReport.addMessage(testCycle, testScenario, actionName, false, toSend, answer, 15, "Response is not in JSON format: " + error);
								resolve(true);
							}
							//validating the response against its schema, same as before
							let errorsRes: Array<any> = Utils.validateResponse(actionName, answer, self.testConfig.SchemaLocation, 'Action');
							if (errorsRes) { //meaning that there is a validation error
								if (logMode) console.log('\x1b[36m%s\x1b[0m', "* Received response is not valid for: " + actionName);
								self.testReport.addMessage(testCycle, testScenario, actionName, false, toSend, answer, 16, "Received response is not valid, " + JSON.stringify(errorsRes));
								resolve(true);
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
					}).catch((error) => {
						self.testReport.addMessage(testCycle, testScenario, actionName, false, toSend, answer, 999, "Invoke Action Error: " + error);
						resolve(true);
					});
				}
			} catch (Error) { // in case there is a problem with the invoke of the action
				if (logMode) console.log("* Response receiving for  " + actionName + "is unsuccesful, continuing with other scenarios");
				self.testReport.addMessage(testCycle, testScenario, actionName, false, toSend, JSON.parse("\"nothing\""), 10, "Problem invoking the action" + Error);
				resolve(true);
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
	public testProperty(testCycle: number, propertyName: string, interaction: wot.PropertyFragment, testScenario: number, interactionIndex:number, logMode: boolean): Promise<any> {
		var self = this;
		return new Promise(function (resolve, reject) {
			let isWritable: boolean = !(interaction.readOnly);
			let isReadable: boolean = !(interaction.writeOnly);
			let toSend: JSON;
			let data: JSON;
			let data2: JSON;
			//getting the property value
			if (logMode) console.log('\x1b[36m%s\x1b[0m', "* First Read Property");
			if (logMode && isReadable) console.log('\x1b[36m%s\x1b[0m', "* Property is readable");
			if (logMode && !isReadable) console.log('\x1b[36m%s\x1b[0m', "* Property not readable");
			if (logMode && isWritable) console.log('\x1b[36m%s\x1b[0m', "* Property is writable");
			if (logMode && !isWritable) console.log('\x1b[36m%s\x1b[0m', "* Property not writable");
			if (isReadable) {
				let curPropertyData: any = self.tut.readProperty(propertyName).then((res: any) => {
					data = res;
					if (logMode) console.log('\x1b[36m%s%s\x1b[0m', "* DATA AFTER FIRST READ PROPERTY:", JSON.stringify(data, null, ' '));
					//validating the property value with its Schemas
					let errorsProp: Array<any> = Utils.validateResponse(propertyName, data, self.testConfig.SchemaLocation, "Property");
					if (errorsProp) { //meaning that there is a validation error
						if (logMode) console.log('\x1b[36m%s%s\x1b[0m', "* Received response is not valid for: " + propertyName, errorsProp);
						self.testReport.addMessage(testCycle, testScenario, propertyName, false, JSON.parse("\"nothing\""), data, 35, "Received response is not valid, " + JSON.stringify(errorsProp));
						resolve(true);
					} else {
						if (logMode) console.log('\x1b[36m%s\x1b[0m', "* Received response is valid for: " + propertyName);
					}
					if (!isWritable) {
						// if it is not writable, we are done here! 
						if (logMode) console.log('\x1b[36m%s\x1b[0m', "* Property test of " + propertyName + " is succesful: no write, first response is schema valid")
						self.testReport.addMessage(testCycle, testScenario, propertyName, true, JSON.parse("\"nothing\""), data, 200, "");
						resolve(true);
					}

				}).catch((error: any) => { //problem in the node-wot level
					if (logMode) console.log('\x1b[36m%s\x1b[0m', "* Problem fetching first time property: " + propertyName);
					console.log("ERROR is: ", error)
					self.testReport.addMessage(testCycle, testScenario, propertyName, false, JSON.parse("\"nothing\""), JSON.parse("\"nothing\""), 30, "Couldnt fetch property");
					reject(true);
				});
			}
			if (isWritable) { //if we can write into the property, it means that we can test whether we can write and get back the same type
				//the same value will be expected but a spceial error case will be written if it is not the same since maybe the value is changing very fast
				if (logMode) console.log('\x1b[36m%s%s\x1b[0m', "* Testing the write functionality for:", propertyName);
				//generating the message to send 
				try {
					toSend = self.codeGen.findRequestValue(self.testConfig.TestDataLocation, testScenario, interactionIndex, propertyName);
					if (logMode) console.log('\x1b[36m%s%s\x1b[0m', '* Created value to send:', JSON.stringify(toSend, null, ' '));
				} catch (Error) {
					if (logMode) console.log('\x1b[36m%s\x1b[0m', "* Cannot create message for " + propertyName + ", look at the previous message to identify the problem");
					self.testReport.addMessage(testCycle, testScenario, propertyName, false, toSend, JSON.parse("\"nothing\""), 40, "Cannot create message: " + Error);
					resolve(true);
				}

				//validating request against a schema, same as the action. Since the requests are written by the user there can be errors
				//Pay attention that validateResponse is called because writing to a property is based on its outputData
				let errors: Array<any> = Utils.validateResponse(propertyName, toSend, self.testConfig.SchemaLocation, "Property");
				if (errors) { //meaning that there is a validation error
					if (logMode) console.log('\x1b[36m%s\x1b[0m', "* Created request is not valid for " + propertyName + "\nMessage is " + toSend + "\nError is " + errors);
					self.testReport.addMessage(testCycle, testScenario, propertyName, false, toSend,
						JSON.parse("\"nothing\""), 41, "Created message has bad format: " + JSON.stringify(errors));
					resolve(true);
				} else {
					if (logMode) console.log('\x1b[36m%s\x1b[0m', "* Created request is valid for: " + propertyName);
				}

				//setting the property, aka writing into it
				if (logMode) console.log('\x1b[36m%s%s\x1b[0m', "* Writing to property " + propertyName + " with data:", JSON.stringify(toSend, null, ' '));
				self.tut.writeProperty(propertyName, toSend).then(() => {
					if (!isReadable) {
						if (logMode) console.log('\x1b[36m%s\x1b[0m', "* Property test of " + propertyName + " is succesful: no read")
						self.testReport.addMessage(testCycle, testScenario, propertyName, true, toSend, JSON.parse("\"nothing\""), 200, "");
						resolve(true);
					}
					//now reading and hoping to get the same value
					let curPropertyData2: any = self.tut.readProperty(propertyName).then((res2: any) => {
						data2 = res2;
						if (logMode) console.log('\x1b[36m%s%s\x1b[0m', "* For the second one, gotten propery data is:", JSON.stringify(data2, null, ' '));
						//validating the gotten value (this shouldnt be necessary since the first time was correct but it is here nonetheless)

						let errorsProp2: Array<any> = Utils.validateResponse(propertyName, data2, self.testConfig.SchemaLocation, "Property")

						if (errorsProp2) { //meaning that there is a validation error
							if (logMode) console.log('\x1b[36m%s%s\x1b[0m', "* Received second response is not valid for: " + propertyName, errorsProp2);
							//here for the received, two response values are put
							self.testReport.addMessage(testCycle, testScenario, propertyName, false, toSend,
								JSON.parse("[" + JSON.stringify(data) + "," + JSON.stringify(data2) + "]"), 45,
								"Received second response is not valid, " + JSON.stringify(errorsProp2));
							resolve(true);
						} else { //if there is no validation error we can test if the value we've gotten is the same as the one we wrote
							if (logMode) console.log('\x1b[36m%s\x1b[0m', "* Received second response is valid for: " + propertyName);
							if (JSON.stringify(data2) == JSON.stringify(toSend)) {
								// wohoo everything is fine
								if (logMode) console.log('\x1b[36m%s\x1b[0m', "* Property test of " + propertyName + " is succesful: write works & second get property successful");
								if (logMode) console.log('\x1b[36m%s\x1b[0m', "* The value gotten after writing is the same for the property: " + propertyName);
								self.testReport.addMessage(testCycle, testScenario, propertyName, true, toSend,
									JSON.parse("[" + JSON.stringify(data) + "," + JSON.stringify(data2) + "]"), 201, "");
								resolve(true);
							} else {
								//maybe the value changed between two requests...
								if (logMode) console.log('\x1b[36m%s\x1b[0m', "* Property test of " + propertyName + " is succesful: write works, fetch not matching");
								self.testReport.addMessage(testCycle, testScenario, propertyName, false, toSend,
									JSON.parse("[" + JSON.stringify(data) + "," + JSON.stringify(data2) + "]"), 46,
									"The second get didn't match the write");
								resolve(true);
							}
						}
					}).catch((error: any) => { //problem in the node-wot level
						if (logMode) console.log('\x1b[36m%s\x1b[0m', "* Problem second time fetching property " + propertyName + "in the second get");
						self.testReport.addMessage(testCycle, testScenario, propertyName, false, JSON.parse("\"nothing\""), 
							JSON.parse("[" + JSON.stringify(data) + "," + JSON.stringify("\"nothing\"") + "]"), 31,
							"Couldnt fetch property in the second get" + error);
						reject(true);
					});
				}).catch((error: any) => {
					if (logMode) console.log('\x1b[36m%s\x1b[0m', "* Couldn't set the property: " + propertyName);
					self.testReport.addMessage(testCycle, testScenario, propertyName, false, toSend,
						JSON.parse("[" + JSON.stringify(data) + "," + JSON.stringify("\"nothing\"") + "]"), 32,
						"Problem setting property" + Error);
					resolve(true);
				});
			}
		});
	}

	private testInteraction(testCycle: number, testScenario: number, interactionIndex: number , interactionName: string, logMode: boolean): Promise<any> {
		var self = this;
		return new Promise(function (resolve, reject) {
			let interaction = Utils.getInteractionByName(self.tutTd, interactionName);
			console.log('interaction pattern:', interaction[0], 'interaction:', interaction[1])
			if (interaction[0] == 'Property') {
				if (logMode) console.log('\x1b[36m%s%s%s\x1b[0m', "* ..................... Testing Property:", interactionName, ".................");
				self.testProperty(testCycle, interactionName, interaction[1], testScenario, interactionIndex, logMode).then((curBool) => {
					if (logMode) console.log('\x1b[36m%s%s%s\x1b[0m', "* ..................... End Testing Property:", interactionName, ".................");
					resolve(curBool);
				}).catch((curBool) => {
					if (logMode) console.log('\x1b[36m%s%s%s\x1b[0m', "* Error in testing property ", interactionName, ", check previous messages")
					reject(curBool);
				});
			} else if (interaction[0] == 'Action') {
				if (logMode) console.log('\x1b[36m%s%s%s\x1b[0m', "* ..................... Testing Action:", interactionName, ".................");
				self.testAction(testCycle, interactionName, interaction[1], testScenario, interactionIndex, logMode).then((curBool) => {
					if (logMode) console.log('\x1b[36m%s%s%s\x1b[0m', "* ..................... End Testing Action:", interactionName, ".................");
					resolve(curBool);
				}).catch((curBool) => {
					if (logMode) console.log('\x1b[36m%s%s%s\x1b[0m', "* Error in testing action ", interactionName, ", check previous messages")
					reject(curBool);
				});
			} else if (interaction[0] == 'Event') {
				if (logMode) console.log('\x1b[36m%s%s%s\x1b[0m', "* ..................... Testing Event: ", interactionName, ".................");
				self.testEvent(testCycle, interactionName, interaction[1], testScenario, interactionIndex, logMode).then((curBool) => {
					if (logMode) console.log('\x1b[36m%s%s%s\x1b[0m', "* ..................... End Testing Event: ", interactionName, ".................");
					resolve(curBool);
				}).catch((curBool) => {
					if (logMode) console.log('\x1b[36m%s%s%s\x1b[0m', "* Error in testing event ", interactionName, ", check previous messages")
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
		var self = this;
		let interactionList: Array<string> = [];
		for (var key in self.tutTd.properties) {interactionList.push(key)};
		for (var key in self.tutTd.actions) {interactionList.push(key)};
		for (var key in self.tutTd.events) {interactionList.push(key)};

		return new Promise(function (resolve, reject) {
			let promise: Promise<any> = Promise.resolve();
			interactionList.forEach((interactionName, index) => {
				promise = promise.then(() => {
					return self.testInteraction(testCycle, testScenario, index, interactionName, logMode);
				});
			});
			//in the end the return value indicates if at least one interaction failed
			promise.then(() => {
				if (logMode) console.log('\x1b[36m%s%s%s\x1b[0m', "* ------------- Test Scenario nb", testScenario, " has finished -------------")
				resolve();
			}).catch((error:Error) => {
				if (logMode) console.log('\x1b[36m%s%s%s%s\x1b[0m', "* Test Scenario nb", testScenario, " has finished with an error:", error)
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
