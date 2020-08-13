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
import * as wot from "wot-typescript-definitions"
import * as Utils from "./utilities"
import {
    TestReport,
    ActionTestReportContainer,
    PropertyTestReportContainer,
    MiniTestReport,
    Result,
    Payload,
    EventTestReportContainer,
    InteractionTestReportContainer,
    EventData,
    EventDataReport,
} from "./TestReport"
import { testConfig } from "./utilities"

function sleep(ms) {
    return new Promise((resolve, reject) => setTimeout(resolve, ms))
}

class generatedTestDataContainer {
    generatedData: any
    passed: boolean
    result: Result

    constructor(generatedData: any, passed: boolean, result: Result) {
        this.generatedData = generatedData
        this.passed = passed
        this.result = result
    }
}

export class Tester {
    private tutTd: wot.ThingDescription //the TD that belongs to the Thing under Test
    private testConfig: testConfig //the file that describes various locations of the files that are needed. Must be configured by the user
    public codeGen: Utils.CodeGenerator //this will generate the requests to be sent to the tut
    public testReport: TestReport //after the testing, this will contain the bare results
    private tut: wot.ConsumedThing // the thing under test

    /**
     * This is a basic constructor, it is planned to change to incorporate more things into the initiate function.
     * @param tC The testConfig.
     * @param tut The Thing under test.
     */
    constructor(tC: testConfig, tut: wot.ConsumedThing) {
        this.testConfig = tC
        this.tutTd = tut.getThingDescription()
        this.tut = tut
    }

    /**
     * Generates Schemas and fake data. Adds TestReport instance.
     * @param logMode True if logMode is enabled, false otherwise.
     */
    public initiate(logMode: boolean): number {
        if (logMode) console.log("\x1b[36m%s\x1b[0m", "* Initiation has started")
        let check = 0
        try {
            check = Utils.generateSchemas(this.tutTd, this.testConfig.SchemaLocation, logMode)
            if (logMode) console.log("\x1b[36m%s\x1b[0m", "* Finished schema generation.")
        } catch (Error) {
            if (logMode) console.log("Schema Generation Error" + Error)
        }
        try {
            this.codeGen = new Utils.CodeGenerator(this.tutTd, this.testConfig)
            if (logMode) console.log("\x1b[36m%s\x1b[0m", "* Finished code generation")
        } catch (Error) {
            if (logMode) console.log("Utils.CodeGenerator Initialization Error" + Error)
        }
        //The test report gets initialized and the first cycle and scenarios are added
        //This means that single tests are possible to be seen in the test report
        this.testReport = new TestReport()
        if (logMode) console.log("\x1b[36m%s\x1b[0m", "* Initialization finished")
        return check
    }

    async generateTestData(interactionName: string, testScenario: number, interactionIndex: number, logMode: boolean): Promise<generatedTestDataContainer> {
        let toSend: JSON
        // Generating the message to send.
        var passed = false
        var result = new Result(200)
        try {
            toSend = this.codeGen.findRequestValue(this.testConfig.TestDataLocation, 9, interactionIndex, interactionName)
            if (logMode) console.log("\x1b[36m%s%s\x1b[0m", "* Successfully created payload: ", JSON.stringify(toSend, null, " "))
        } catch (Error) {
            if (logMode) console.log("\x1b[36m%s\x1b[0m", "* Problem while trying to create payload: " + Error)
            result = new Result(12, "Cannot create payload: " + Error)
        }
        // Validating the request against a schema. Validator returns an array that describes the error. This array is empty when there is no error.
        // Necessary because the requests are user written and can contain errors.
        if (toSend != null) {
            let errors: Array<any> = Utils.validateRequest(interactionName, toSend, this.testConfig.SchemaLocation, "EventSubscription")
            if (errors) {
                //meaning that there is a validation error
                if (logMode) console.log("\x1b[36m%s\x1b[0m", "* Created payload is not valid: Created Payload: " + toSend + "Errors: " + errors)
                result = new Result(13, "Created payload was invalid: " + JSON.stringify(errors))
            } else {
                if (logMode) console.log("\x1b[36m%s\x1b[0m", "* Created payload is valid")
                passed = true
            }
        }
        return new generatedTestDataContainer(toSend, passed, result)
    }

    // -----TODO thing of timers to cause event
    public testEvent(
        testCycle: number,
        eventName: string,
        interaction: any,
        testScenario: number,
        interactionIndex: number,
        logMode: boolean
    ): Promise<boolean> {
        var self = this
        var container: EventTestReportContainer = new EventTestReportContainer(testCycle, testScenario, eventName)
        var indexOfEventData: number = 0
        var subscribed: boolean = false
        //self.testReport.results[container.testCycle][container.testScenario].push(container.getPrintableMessage())
        //self.testReport.addMessage(container)

        return new Promise(function (resolve) {
            testSubscribeEvent()
                .then(() => testUnsubscribeEvent())
                .then(() => {
                    if (container.eventDataReport.received.length < 1) {
                        container.eventDataReport.result = new Result(100, "Never received any data => No checks could be made.")
                    }
                })
                .then(() => {
                    if (container.passed == true) {
                        if (logMode) console.log("\x1b[36m%s%s\x1b[0m", "* Test for ", eventName + " was successful.")
                    }
                    self.testReport.addMessage(testCycle, testScenario, container)
                    resolve(true)
                })
        })

        async function testUnsubscribeEvent(): Promise<boolean> {
            return new Promise(async function (resolve) {
                let toSend = null
                // Trying to Unsubscribe from the Event
                if (logMode) console.log("\x1b[36m%s%s\x1b[0m", "* Trying to unsubscribe from " + eventName + " with data: ", JSON.stringify(toSend, null, " "))
                // Testing cancellation only makes sense if subscription worked.
                if (subscribed) {
                    self.tut
                        .unsubscribeEvent(eventName)
                        .then(() => {
                            console.log("\x1b[36m%s\x1b[0m", "* Successfully unsubscribed from " + eventName)
                            container.cancellationReport.passed = true
                            container.cancellationReport.result = new Result(200)
                        })
                        .catch((error) => {
                            if (logMode) console.log("\x1b[36m%s\x1b[0m", "* Problem when trying to unsubscribe from event: " + eventName + ": " + error)
                            container.passed = false
                            container.cancellationReport.result = new Result(20, "Problem when trying to unsubscribe from event: " + error)
                        })
                        .finally(() => {
                            resolve(true)
                        })
                } else {
                    // If Subscription failed Cancellation can not work.
                    await handleNeverSubscribed()
                    resolve(true)
                    async function handleNeverSubscribed() {
                        if (logMode)
                            console.log(
                                "\x1b[36m%s\x1b[0m",
                                "* Problem when trying to unsubscribe from " +
                                    eventName +
                                    ": The testbench was never subscribed to the event (see previous messages and subscriptionReport)."
                            )
                        container.passed = false
                        container.cancellationReport.passed = false
                        container.cancellationReport.result = new Result(
                            50,
                            "Problem when trying to unsubscribe: The testbench was never subscribed to the event (see subscriptionReport)."
                        )
                    }
                }
            })
        }

        function handleReceivedData(receivedData: any) {
            let receivedTimeStamp = new Date()
            if (indexOfEventData < self.testConfig.EventAndObservePOptions.MaxAmountRecvData || self.testConfig.EventAndObservePOptions == null) {
                if (interaction.hasOwnProperty("data")) {
                    if (logMode)
                        console.log("\x1b[36m%s%s\x1b[0m", "* Received event data [index: " + indexOfEventData + "]: ", JSON.stringify(receivedData, null, " "))
                    try {
                        let temp: JSON = receivedData
                    } catch (jsonError) {
                        if (logMode) console.log("\x1b[36m%s\x1b[0m", "* Received event data [index: " + indexOfEventData + "] is not in JSON format")
                        container.passed = false
                        container.eventDataReport.passed = false
                        let result = new Result(15, "* Received data [index: " + indexOfEventData + "] is not in JSON format: " + jsonError)
                        container.eventDataReport.received.push(new EventData(receivedTimeStamp, receivedData, result))
                        ++indexOfEventData
                        return
                    }
                    //validating the response against its schema
                    let validationError: Array<any> = Utils.validateResponse(eventName, receivedData, self.testConfig.SchemaLocation, "EventData")
                    if (validationError) {
                        //meaning that there is a validation error
                        if (logMode) console.log("\x1b[36m%s\x1b[0m", "* Received event data [index: " + indexOfEventData + "] is not valid.")
                        container.passed = false
                        container.eventDataReport.passed = false
                        let result = new Result(16, "* Received data [index: " + indexOfEventData + "] is not valid: " + JSON.stringify(validationError))
                        container.eventDataReport.received.push(new EventData(receivedTimeStamp, receivedData, result))
                    } else {
                        if (logMode) console.log("\x1b[36m%s\x1b[0m", "* Received event data [index: " + indexOfEventData + "] is valid.")
                        container.eventDataReport.received.push(new EventData(receivedTimeStamp, receivedData, new Result(200)))
                    }
                }
            }
        }

        async function testSubscribeEvent(): Promise<boolean> {
            let toSend = null
            // let generatedTestDataContainer = await self.generateTestData(eventName, testScenario, interactionIndex, logMode)
            // let toSend = generatedTestDataContainer.generatedData
            // if (!generatedTestDataContainer.passed) {
            //     container.passed = generatedTestDataContainer.passed
            //     // TODO deal with not able to generate needed data for subscription
            // }
            // container.subscriptionReport.result = generatedTestDataContainer.result
            if (logMode) console.log("\x1b[36m%s%s\x1b[0m", "* Trying to subscribe to " + eventName + " with data: ", JSON.stringify(toSend, null, " "))
            let sendTimeStamp = new Date()
            // Trying to Subscribe to the Event
            try {
                await self.tut.subscribeEvent(eventName, (eventData) => {
                    handleReceivedData(eventData)
                })
            } catch (error) {
                if (logMode) console.log("\x1b[36m%s\x1b[0m", "* Problem when trying to subscribe to event " + eventName + ": " + error)
                container.passed = false
                container.subscriptionReport.result = new Result(10, "Problem when trying to subscribe: " + error)
                return true
            }
            container.subscriptionReport.sent = new Payload(sendTimeStamp, toSend)
            if (logMode) console.log("\x1b[36m%s%s\x1b[0m", "* Successfully subscribed to " + eventName + " with data: ", JSON.stringify(toSend, null, " "))
            subscribed = true
            container.subscriptionReport.passed = true
            container.subscriptionReport.result = new Result(200)
            await sleep(self.testConfig.EventAndObservePOptions.MsListenAsynchronous)
            //setTimeout(() => {}, self.testConfig.EventAndObservePOptions.MsListenAsynchronous)
            return true
        }
    }

    /**
     * Invokes the specified action either with or without a payload. The returned Promise times out after 5 Seconds if no
     * answer is received.
     * @param actionName: The name of the action to invoke.
     * @param toSend: The payload to send to invoke the action.
     */
    private tryToInvokeAction(actionName: string, toSend?: JSON): [Date, Promise<any>] {
        if (toSend != null) {
            return [new Date(), Utils.promiseTimeout(this.testConfig.ActionTimeout, this.tut.invokeAction(actionName, toSend))]
        }
        return [new Date(), Utils.promiseTimeout(this.testConfig.ActionTimeout, this.tut.invokeAction(actionName))]
    }

    /**
     * This method test the action given in the parameters.
     * logMode toggles between outputting every single step and error into the terminal. TRUE outputs to the terminal
     * testScenario number is related to the json file that contains the requests to be sent. In this file, in the array of interaction names,
     * you can put different json values that will be sent to the thing
     * @param testCycle The number indicating the testCycle.
     * @param actionName The string indicating the name of the action.
     * @param interaction An interaction object containing further information about the tested interaction.
     * @param testScenario The number indicating the testScenario.
     * @param interactionIndex The number indicating the interactionNumber.
     * @param logMode True if logMode is enabled, false otherwise.
     */
    public testAction(
        testCycle: number,
        actionName: string,
        interaction: any,
        testScenario: number,
        interactionIndex: number,
        logMode: boolean
    ): Promise<boolean> {
        var self = this
        var container = new ActionTestReportContainer(testCycle, testScenario, actionName)

        return new Promise(function (resolve, reject) {
            testAction().then(() => {
                self.testReport.addMessage(testCycle, testScenario, container)
                if (container.passed == true) {
                    if (logMode) console.log("\x1b[36m%s%s\x1b[0m", "* Test for ", actionName + " was successful.")
                }
                resolve(true)
            })
        })

        function testAction(): Promise<boolean> {
            return new Promise(function (resolve) {
                let toSend: JSON
                //generating the message to send
                try {
                    toSend = self.codeGen.findRequestValue(self.testConfig.TestDataLocation, testScenario, interactionIndex, actionName)
                    if (logMode) console.log("\x1b[36m%s%s\x1b[0m", "* Created value to send :", JSON.stringify(toSend, null, " "))
                } catch (Error) {
                    if (logMode)
                        console.log("\x1b[36m%s\x1b[0m", "* Cannot create for " + actionName + ", look at the previous message to identify the problem")
                    container.passed = false
                    container.report.result = new Result(12, "Cannot create message: " + Error)
                    resolve(true)
                }
                //validating request against a schema. Validator returns an array that describes the error. This array is empty when there is no error
                //a first thinking would say that it shouldn't be necessary but since the requests are user written, there can be errors there as well.
                if (toSend != null) {
                    let errors: Array<any> = Utils.validateRequest(actionName, toSend, self.testConfig.SchemaLocation, "Action")
                    if (errors) {
                        //meaning that there is a validation error
                        if (logMode)
                            console.log(
                                "\x1b[36m%s\x1b[0m",
                                "* Created request is not valid for " + actionName + "\nMessage is " + toSend + "\nError is " + errors
                            )
                        container.passed = false
                        container.report.result = new Result(13, "Created message has bad format: " + JSON.stringify(errors))
                        resolve(true)
                    } else {
                        if (logMode) console.log("\x1b[36m%s\x1b[0m", "* Created request is valid for: " + actionName)
                    }
                }
                //invoking the action
                try {
                    if (logMode)
                        console.log("\x1b[36m%s%s\x1b[0m", "* Trying to invoke action " + actionName + " with data:", JSON.stringify(toSend, null, " "))
                    // Try to invoke the action.
                    const invokedAction = self.tryToInvokeAction(actionName, toSend)
                    invokedAction[1]
                        .then((res: any) => {
                            let responseTimeStamp = new Date()
                            container.report.sent = new Payload(invokedAction[0], toSend) //sentTimeStamp, Payload
                            if (logMode)
                                console.log("\x1b[36m%s%s\x1b[0m", "* Invoked action " + actionName + " with data: ", JSON.stringify(toSend, null, " "))
                            if (interaction.hasOwnProperty("output")) {
                                //the action doesn't have to answer something back
                                let answer = res
                                container.report.received = new Payload(responseTimeStamp, answer)
                                if (logMode) console.log("\x1b[36m%s%s\x1b[0m", "* Answer is:", JSON.stringify(answer, null, " "))
                                try {
                                    let temp: JSON = answer
                                } catch (error) {
                                    if (logMode) console.log("\x1b[36m%s\x1b[0m", "* Response is not in JSON format")
                                    container.passed = false
                                    container.report.result = new Result(15, "Response is not in JSON format: " + error)
                                    resolve(true)
                                }
                                //validating the response against its schema, same as before
                                let errorsRes: Array<any> = Utils.validateResponse(actionName, answer, self.testConfig.SchemaLocation, "Action")
                                if (errorsRes) {
                                    //meaning that there is a validation error
                                    if (logMode) console.log("\x1b[36m%s\x1b[0m", "* Received response is not valid for: " + actionName)
                                    container.passed = false
                                    container.report.result = new Result(16, "Received response is not valid, " + JSON.stringify(errorsRes))
                                    resolve(true)
                                } else {
                                    if (logMode) console.log("\x1b[36m%s\x1b[0m", "* Received response is valid for: " + actionName)
                                    //if nothing is wrong, putting a good result
                                    container.report.result = new Result(200)
                                    resolve(true)
                                }
                            } else {
                                // in case there is no answer needed it is a successful test as well
                                if (logMode) console.log("\x1b[36m%s%s\x1b[0m", "* ", actionName + " is successful without return value")
                                container.report.result = new Result(201, "no return value needed")
                                resolve(true)
                            }
                        })
                        .catch((error) => {
                            if (logMode) console.log("\x1b[36m%s%s\x1b[0m", "* Problem when trying to invoke action " + actionName + ": " + error)
                            container.passed = false
                            container.report.result = new Result(999, "Invoke Action Error: " + error)
                            resolve(true)
                        })
                } catch (Error) {
                    // in case there is a problem with the invoke of the action
                    if (logMode)
                        console.log("\x1b[36m%s%s\x1b[0m", "* Response receiving for  " + actionName + "is unsuccessful, continuing with other scenarios")
                    container.passed = false
                    container.report.result = new Result(10, "Problem invoking the action" + Error)
                    resolve(true)
                }
            })
        }
    }

    /**
     * This method tests the property given in the parameters
     * logMode toggles between outputting every single step and error into the terminal. TRUE outputs to the terminal
     * testScenario number is related to the json file that contains the requests to be sent. In this file, in the array of interaction names,
     * you can put different json values that will be sent to the thing
     * First the property values are fetched from the thing. Then if the property is writable, a value from the requests is written to the property
     * Then property values are fetched again. Here it is hoped that the value is the same as the written one but if the value changes in between it will
     * be different. This is recorded as an error but has a specific error case number. This basically tests if the property is really writable
     * @param testCycle The number indicating the testCycle.
     * @param propertyName The string indicating the name of the property.
     * @param interaction An interaction object containing further information about the tested interaction.
     * @param testScenario The number indicating the testScenario.
     * @param interactionIndex The number indicating the interactionNumber.
     * @param logMode True if logMode is enabled, false otherwise.
     */
    public testProperty(
        testCycle: number,
        propertyName: string,
        interaction: any,
        testScenario: number,
        interactionIndex: number,
        logMode: boolean
    ): Promise<boolean> {
        var self = this
        var container = new PropertyTestReportContainer(testCycle, testScenario, propertyName)
        let isWritable: boolean = !interaction.readOnly
        let isReadable: boolean = !interaction.writeOnly

        if (logMode) {
            if (isReadable) console.log("\x1b[36m%s\x1b[0m", "* Property is readable")
            if (!isReadable) console.log("\x1b[36m%s\x1b[0m", "* Property is not readable")
            if (isWritable) console.log("\x1b[36m%s\x1b[0m", "* Property is writable")
            if (!isWritable) console.log("\x1b[36m%s\x1b[0m", "* Property is not writable")
        }

        return new Promise(function (resolve, reject) {
            testReadProperty()
                .then(() => testWriteProperty())
                .then(() => {
                    self.testReport.addMessage(testCycle, testScenario, container)
                    if (container.passed == true) {
                        if (logMode) console.log("\x1b[36m%s%s\x1b[0m", "* Test for ", propertyName + " was successful.")
                    }
                    resolve(true)
                })
                .catch((curBool) => {
                    container.passed = false
                    self.testReport.addMessage(testCycle, testScenario, container)
                    reject(curBool)
                })
        })

        /**
         * Tests the ReadProperty of a property. TestResults are written into container. Returns true if an error on node-wot level occurred.
         * @return A boolean indicating if an error on node-wot level occurred.
         */
        function testReadProperty(): Promise<boolean> {
            return new Promise(function (resolve, reject) {
                if (isReadable) {
                    let data: JSON
                    if (logMode) console.log("\x1b[36m%s%s\x1b[0m", "* Testing the read functionality for: ", propertyName)
                    container.readPropertyReport = new MiniTestReport(false)
                    self.tut
                        .readProperty(propertyName)
                        .then((res: any) => {
                            let responseTimeStamp = new Date()
                            data = res
                            container.readPropertyReport.received = new Payload(responseTimeStamp, res)
                            if (logMode) console.log("\x1b[36m%s%s\x1b[0m", "* Data after first read property: ", JSON.stringify(data, null, " "))
                            //validating the property value with its Schemas
                            let errorsProp: Array<any> = Utils.validateResponse(propertyName, data, self.testConfig.SchemaLocation, "Property")
                            if (errorsProp) {
                                //meaning that there is a validation error
                                if (logMode) console.log("\x1b[36m%s%s\x1b[0m", "* Received response is not valid for: " + propertyName, errorsProp)
                                container.passed = false
                                container.readPropertyReport.result = new Result(35, "Received response is not valid, " + JSON.stringify(errorsProp))
                            } else {
                                if (logMode) console.log("\x1b[36m%s\x1b[0m", "* Received response is valid for: " + propertyName)
                                container.readPropertyReport.passed = true
                                container.readPropertyReport.result = new Result(200)
                            }
                        })
                        .then(() => {
                            if (logMode)
                                console.log(
                                    "\x1b[36m%s\x1b[0m",
                                    "* Read functionality test of " + propertyName + " is successful: first get property is schema valid"
                                )
                            resolve(true)
                        })
                        .catch((error: any) => {
                            //problem in the node-wot level
                            if (logMode) console.log("\x1b[36m%s\x1b[0m", "* Problem fetching first time property: " + propertyName)
                            console.log("ERROR is: ", error)
                            container.passed = false
                            container.readPropertyReport.passed = false
                            container.readPropertyReport.result = new Result(30, "Could not fetch property")
                            reject(true)
                        })
                } else {
                    resolve(true)
                }
            })
        }

        /**
         * Tests the WriteProperty of a property. TestResults are written into container. Returns true if an error on node-wot level occurred.
         * @return A boolean indicating if an error on node-wot level occurred.
         */
        function testWriteProperty(): Promise<boolean> {
            //if we can write into the property, it means that we can test whether we can write and get back the same type
            //the same value will be expected but a special error case will be written if it is not the same since maybe the value is changing very fast
            return new Promise(function (resolve, reject) {
                if (isWritable) {
                    let data2: JSON
                    let toSend: JSON
                    if (logMode) console.log("\x1b[36m%s%s\x1b[0m", "* Testing the write functionality for: ", propertyName)
                    container.writePropertyReport = new MiniTestReport(false)
                    //generating the message to send
                    try {
                        toSend = self.codeGen.findRequestValue(self.testConfig.TestDataLocation, testScenario, interactionIndex, propertyName)
                        if (logMode) console.log("\x1b[36m%s%s\x1b[0m", "* Created value to send: ", JSON.stringify(toSend, null, " "))
                    } catch (Error) {
                        if (logMode)
                            console.log(
                                "\x1b[36m%s\x1b[0m",
                                "* Cannot create message for " + propertyName + ", look at the previous message to identify the problem"
                            )
                        container.passed = false
                        container.writePropertyReport.result = new Result(40, "Cannot create message: " + Error)
                        resolve(true)
                    }
                    //validating request against a schema, same as the action. Since the requests are written by the user there can be errors
                    //Pay attention that validateResponse is called because writing to a property is based on its outputData
                    let errors: Array<any> = Utils.validateResponse(propertyName, toSend, self.testConfig.SchemaLocation, "Property")
                    if (errors) {
                        //meaning that there is a validation error
                        if (logMode)
                            console.log(
                                "\x1b[36m%s\x1b[0m",
                                "* Created request is not valid for " + propertyName + "\nMessage is " + toSend + "\nError is " + errors
                            )
                        container.passed = false
                        container.readPropertyReport.result = new Result(41, "Created message has bad format: " + JSON.stringify(errors))
                        resolve(true)
                    } else {
                        if (logMode) console.log("\x1b[36m%s\x1b[0m", "* Created request is valid for: " + propertyName)
                    }

                    //setting the property, aka writing into it
                    if (logMode) console.log("\x1b[36m%s%s\x1b[0m", "* Writing to property " + propertyName + " with data: ", JSON.stringify(toSend, null, " "))
                    let sendTimeStamp = new Date()
                    self.tut
                        .writeProperty(propertyName, toSend)
                        .then(() => {
                            container.writePropertyReport.sent = new Payload(sendTimeStamp, toSend)
                            if (!isReadable) {
                                if (logMode) console.log("\x1b[36m%s\x1b[0m", "* Property test of " + propertyName + " is successful: no read")
                                container.writePropertyReport.passed = true
                                container.writePropertyReport.result = new Result(200)
                                resolve(true)
                            } else {
                                //now reading and hoping to get the same value
                                let curPropertyData2: any = self.tut
                                    .readProperty(propertyName)
                                    .then((res2: any) => {
                                        let responseTimeStamp = new Date()
                                        data2 = res2
                                        if (logMode) console.log("\x1b[36m%s%s\x1b[0m", "* Data after second read property: ", JSON.stringify(data2, null, " "))
                                        //validating the gotten value (this shouldn't be necessary since the first time was correct but it is here nonetheless)

                                        let errorsProp2: Array<any> = Utils.validateResponse(propertyName, data2, self.testConfig.SchemaLocation, "Property")

                                        if (errorsProp2) {
                                            //meaning that there is a validation error
                                            if (logMode)
                                                console.log("\x1b[36m%s%s\x1b[0m", "* Received second response is not valid for: " + propertyName, errorsProp2)
                                            //here for the received, two response values are put
                                            container.passed = false
                                            container.writePropertyReport.received = new Payload(responseTimeStamp, data2)
                                            container.writePropertyReport.result = new Result(
                                                45,
                                                "Received second response is not valid, " + JSON.stringify(errorsProp2)
                                            )
                                        } else {
                                            //if there is no validation error we can test if the value we've gotten is the same as the one we wrote
                                            if (logMode) console.log("\x1b[36m%s\x1b[0m", "* Received second response is valid for: " + propertyName)
                                            container.writePropertyReport.passed = true
                                            if (JSON.stringify(data2) == JSON.stringify(toSend)) {
                                                // wohoo everything is fine
                                                if (logMode)
                                                    console.log(
                                                        "\x1b[36m%s\x1b[0m",
                                                        "* Write functionality test of " +
                                                            propertyName +
                                                            " is successful: write works and second get property successful"
                                                    )
                                                if (logMode)
                                                    console.log(
                                                        "\x1b[36m%s\x1b[0m",
                                                        "* The return value of the second get property (after writing) did match the write for: " + propertyName
                                                    )
                                                container.writePropertyReport.received = new Payload(responseTimeStamp, data2)
                                                container.writePropertyReport.result = new Result(201)
                                            } else {
                                                //maybe the value changed between two requests...
                                                if (logMode)
                                                    console.log(
                                                        "\x1b[36m%s\x1b[0m",
                                                        "* Write functionality test of " + propertyName + " is successful: write works, fetch not matching"
                                                    )
                                                container.writePropertyReport.received = new Payload(responseTimeStamp, data2)
                                                container.writePropertyReport.result = new Result(
                                                    46,
                                                    "The return value of the second get property (after writing) did not match the write"
                                                )
                                            }
                                        }
                                    })
                                    .then(() => {
                                        resolve(true)
                                    })
                                    .catch((error: any) => {
                                        //problem in the node-wot level
                                        if (logMode)
                                            console.log("\x1b[36m%s\x1b[0m", "* Problem second time fetching property " + propertyName + "in the second get")
                                        container.passed = false
                                        container.writePropertyReport.passed = false
                                        container.writePropertyReport.result = new Result(31, "Could not fetch property in the second get" + error)
                                        reject(true)
                                    })
                            }
                        })
                        .catch((error: any) => {
                            if (logMode) console.log("\x1b[36m%s\x1b[0m", "* Couldn't set the property: " + propertyName)
                            container.passed = false
                            container.writePropertyReport.passed = false
                            container.writePropertyReport.result = new Result(32, "Problem setting property" + Error)
                            resolve(true)
                        })
                } else {
                    resolve(true)
                }
            })
        }
    }

    private testInteraction(testCycle: number, testScenario: number, interactionIndex: number, interactionName: string, logMode: boolean): Promise<any> {
        var self = this
        return new Promise(function (resolve, reject) {
            let interaction = Utils.getInteractionByName(self.tutTd, interactionName)
            console.log("interaction pattern:", interaction[0], "interaction:", interaction[1])
            if (interaction[0] == "Property") {
                if (logMode) console.log("\x1b[36m%s%s%s\x1b[0m", "* ..................... Testing Property:", interactionName, ".................")
                self.testProperty(testCycle, interactionName, interaction[1], testScenario, interactionIndex, logMode)
                    .then((curBool) => {
                        if (logMode) console.log("\x1b[36m%s%s%s\x1b[0m", "* ..................... End Testing Property:", interactionName, ".................")
                        resolve(curBool)
                    })
                    .catch((curBool) => {
                        if (logMode) console.log("\x1b[36m%s%s%s\x1b[0m", "* Error in testing property ", interactionName, ", check previous messages")
                        reject(curBool)
                    })
            } else if (interaction[0] == "Action") {
                if (logMode) console.log("\x1b[36m%s%s%s\x1b[0m", "* ..................... Testing Action:", interactionName, ".................")
                self.testAction(testCycle, interactionName, interaction[1], testScenario, interactionIndex, logMode)
                    .then((curBool) => {
                        if (logMode) console.log("\x1b[36m%s%s%s\x1b[0m", "* ..................... End Testing Action:", interactionName, ".................")
                        resolve(curBool)
                    })
                    .catch((curBool) => {
                        if (logMode) console.log("\x1b[36m%s%s%s\x1b[0m", "* Error in testing action ", interactionName, ", check previous messages")
                        reject(curBool)
                    })
            } else if (interaction[0] == "Event") {
                if (logMode) console.log("\x1b[36m%s%s%s\x1b[0m", "* ..................... Testing Event: ", interactionName, ".................")
                self.testEvent(testCycle, interactionName, interaction[1], testScenario, interactionIndex, logMode)
                    .then((curBool) => {
                        if (logMode) console.log("\x1b[36m%s%s%s\x1b[0m", "* ..................... End Testing Event: ", interactionName, ".................")
                        resolve(curBool)
                    })
                    .catch((curBool) => {
                        if (logMode) console.log("\x1b[36m%s%s%s\x1b[0m", "* Error in testing event ", interactionName, ", check previous messages")
                        reject(curBool)
                    })
            } else {
                if (logMode) console.log("\x1b[36m%s\x1b[0m", "* Asked for something other than Action or Property or Event")
                reject(false)
            }
        })
    }

    /**
     * This method tests all the messages with the values of one given scenario
     * Actions and Properties are all tested
     * The return value needs to be changed and made into a Promise
     * @param testCycle The number indicating the testCycle.
     * @param testScenario The number indicating the testScenario.
     * @param logMode True if logMode is enabled, false otherwise.
     */
    public testScenario(testCycle: number, testScenario: number, logMode: boolean): Promise<any> {
        var self = this
        let interactionList: Array<string> = []
        for (var key in self.tutTd.properties) {
            interactionList.push(key)
        }
        for (var key in self.tutTd.actions) {
            interactionList.push(key)
        }
        for (var key in self.tutTd.events) {
            interactionList.push(key)
        }

        return new Promise(function (resolve, reject) {
            let promise: Promise<any> = Promise.resolve()
            interactionList.forEach((interactionName, index) => {
                promise = promise.then(() => {
                    return self.testInteraction(testCycle, testScenario, index, interactionName, logMode)
                })
            })
            //in the end the return value indicates if at least one interaction failed
            promise
                .then(() => {
                    if (logMode) console.log("\x1b[36m%s%s%s\x1b[0m", "* ------------- Test Scenario nb", testScenario, " has finished -------------")
                    resolve()
                })
                .catch((error: Error) => {
                    if (logMode) console.log("\x1b[36m%s%s%s%s\x1b[0m", "* Test Scenario nb", testScenario, " has finished with an error:", error)
                    reject(error)
                })
        })
    }

    public testCycle(cycleNumber: number, scenarioNumber: number, logMode: boolean): Promise<any> {
        var self = this
        let maxScenario: number = scenarioNumber
        let scenarios: Array<number> = []
        for (var i = 0; i < maxScenario; i++) {
            scenarios[i] = i
        }
        return new Promise(function (resolve, reject) {
            let promise = Promise.resolve()
            scenarios.forEach((scenarioNb) => {
                promise = promise.then(() => {
                    self.testReport.addTestScenario()
                    return self.testScenario(cycleNumber, scenarioNb, logMode)
                })
            })
            promise
                .then(() => {
                    if (logMode) console.log("\x1b[36m%s%s%s\x1b[0m", "* Test Cycle nb", cycleNumber, " has finished without an error")
                    resolve()
                })
                .catch(() => {
                    if (logMode) console.log("\x1b[36m%s%s%s\x1b[0m", "* Test Cycle nb", cycleNumber, " has finished with an error")
                    reject()
                })
        })
    }

    /**
     * This is the action that is accessible from the Thing Description.
     * Meaning that, after consuming the test bench, this action can be invoked to test the entirety of the Thing with many test scenarios and repetitions
     * There is only a simple, repetitive call to test Scenario with adding arrays into the test report in between
     * Also according to the repetition number specified in the test config, the same test can be done multiple times.
     * @param repetition The number indicating the repetition.
     * @param testScenario The number indicating the testScenario.
     * @param logMode True if logMode is enabled, false otherwise.
     * @return The test report that has all the required functions to display the results.
     */
    public testThing(repetition: number, scenarioNumber: number, logMode: boolean): Promise<TestReport> {
        var self = this
        let reps: Array<number> = []
        for (var i = 0; i < repetition; i++) {
            reps[i] = i
        }
        return new Promise(function (resolve, reject) {
            let promise = Promise.resolve()
            reps.forEach((repNb) => {
                promise = promise.then(() => {
                    if (logMode) console.log("\x1b[36m%s\x1b[0m", "* Cycle " + repNb + ", testing all scenarios")
                    self.testReport.addTestCycle()
                    return self.testCycle(repNb, scenarioNumber, logMode)
                })
            })
            promise
                .then(() => {
                    if (logMode) console.log("\x1b[36m%s\x1b[0m", "* Testing the Thing has finished without an error")
                    resolve(self.testReport)
                })
                .catch(() => {
                    if (logMode) console.log("\x1b[36m%s\x1b[0m", "* Testing the Thing has finished with an error")
                    reject()
                })
        })
    }
}
