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
    return new Promise((resolve) => setTimeout(resolve, ms))
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

class DeferredPromise {
    resolve
    reject
    _promise
    then
    catch
    constructor() {
        this._promise = new Promise((resolve, reject) => {
            // assign the resolve and reject functions to `this`
            // making them usable on the class instance
            this.resolve = resolve
            this.reject = reject
        })
        // bind `then` and `catch` to implement the same interface as Promise
        this.then = this._promise.then.bind(this._promise)
        this.catch = this._promise.catch.bind(this._promise)
        this[Symbol.toStringTag] = "Promise"
    }
}

export class Tester {
    private tutTd: wot.ThingDescription //the TD that belongs to the Thing under Test
    private testConfig: testConfig //the file that describes various locations of the files that are needed. Must be configured by the user
    public codeGen: Utils.CodeGenerator //this will generate the requests to be sent to the tut
    public testReport: TestReport //after the testing, this will contain the bare results
    private tut: wot.ConsumedThing // the thing under test
    private logMode: boolean // True if logMode is enabled, false otherwise.

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
    private log(message: string): void {
        if (this.logMode) console.log("\x1b[36m%s\x1b[0m", message)
    }

    /**
     * Generates Schemas and fake data. Adds TestReport instance.
     * @param logMode True if logMode is enabled, false otherwise.
     */
    public initiate(logMode: boolean): number {
        this.log("* Initiation has started")
        let check = 0
        try {
            check = Utils.generateSchemas(this.tutTd, this.testConfig.SchemaLocation, logMode)
            this.log("* Finished schema generation.")
        } catch (Error) {
            this.log("Schema Generation Error" + Error)
        }
        try {
            this.codeGen = new Utils.CodeGenerator(this.tutTd, this.testConfig)
            this.log("* Finished code generation")
        } catch (Error) {
            if (logMode) console.log("Utils.CodeGenerator Initialization Error" + Error)
        }
        //The test report gets initialized and the first cycle and scenarios are added
        //This means that single tests are possible to be seen in the test report
        this.testReport = new TestReport()
        this.log("* Initialization finished")
        return check
    }

    async generateTestData(interactionName: string, testScenario: number, schemaType: Utils.SchemaType): Promise<generatedTestDataContainer> {
        let toSend: JSON
        // Generating the message to send.
        var passed = false
        var result = new Result(200)
        try {
            toSend = this.codeGen.findRequestValue(this.testConfig.TestDataLocation, testScenario, schemaType, interactionName)
            this.log("* Successfully created payload: " + JSON.stringify(toSend, null, " "))
        } catch (error) {
            this.log("* Problem while trying to create payload:\n  " + error)
            result = new Result(12, "Cannot create payload: " + error)
        }
        // Validating the request against a schema. Validator returns an array that describes the error. This array is empty when there is no error.
        // Necessary because the requests are user written and can contain errors.
        if (toSend != null) {
            let errors: Array<any> = Utils.validateRequest(interactionName, toSend, this.testConfig.SchemaLocation, "EventSubscription")
            if (errors) {
                //meaning that there is a validation error
                this.log("* Created payload is not valid: Created Payload: " + toSend + "Errors: " + errors)
                result = new Result(13, "Created payload was invalid: " + JSON.stringify(errors))
            } else {
                this.log("* Created payload is valid")
                passed = true
            }
        }
        return new generatedTestDataContainer(toSend, passed, result)
    }

    public async testEvent(testCycle: number, testScenario: number, eventName: string, interaction: any): Promise<boolean> {
        var self = this
        var container: EventTestReportContainer = new EventTestReportContainer(testCycle, testScenario, eventName)
        container = await this.testObserveOrEvent(container, interaction, Utils.InteractionType.Event)
        let messageAddition = "not "
        if (container.passed == true) {
            messageAddition = ""
        }
        self.log("* Test for " + eventName + " was " + messageAddition + "passed.")
        self.testReport.addMessage(testCycle, testScenario, container)
        return true
    }

    private async testObserveOrEvent(
        preContainer: EventTestReportContainer,
        interaction: any,
        testMode: Utils.InteractionType.Event | Utils.InteractionType.Property
    ): Promise<EventTestReportContainer> {
        enum SubscriptionStatus {
            Timeout,
            Error,
            Successful,
        }
        var self = this
        const eventName = preContainer.name
        var container: EventTestReportContainer = preContainer
        var indexOfEventData: number = -1
        var subscriptionStatus: SubscriptionStatus = SubscriptionStatus.Error
        var earlyListenTimeout = new DeferredPromise()

        await testSubscribeEvent()
        await testUnsubscribeEvent()
        if (container.eventDataReport.received.length < 1) {
            container.eventDataReport.result = new Result(100, "Never received any data, thus no checks could be made.")
        }
        var postContainer = preContainer
        return postContainer

        async function testUnsubscribeEvent(): Promise<boolean> {
            let toSend = null
            self.log("* Trying to unsubscribe from " + eventName + " with data: " + JSON.stringify(toSend, null, " "))

            switch (subscriptionStatus) {
                case SubscriptionStatus.Error:
                    // If Subscription failed Cancellation can not work.
                    self.log(
                        "* Problem when trying to unsubscribe from " +
                            eventName +
                            ": The testbench was never subscribed due to a subscription error (see previous messages and subscriptionReport)."
                    )
                    container.passed = true
                    container.cancellationReport.passed = true
                    container.cancellationReport.result = new Result(
                        100,
                        "Subscription cancellation test not possible: The testbench was never subscribed to the event due to a subscription error (see subscriptionReport)."
                    )
                    break
                case SubscriptionStatus.Timeout:
                    // Due to not knowing if subscription failed or subscription was successful but no events were emitted, this case needs
                    // his own handling.
                    self.log(
                        "* Problem when trying to unsubscribe from " +
                            eventName +
                            ": The testbench was never subscribed or was subscribed but never received any eventData (see previous messages, subscriptionReport and eventDataReport)."
                    )
                    container.passed = true
                    container.cancellationReport.passed = true
                    container.cancellationReport.result = new Result(
                        100,
                        "Subscription cancellation test not possible: Timeout during subscription (see subscriptionReport)."
                    )
                    try {
                        // Necessary in case subscription was successful but subscription provider started emitting only after the subscribeTimeout was reached.
                        // The testbench would still be subscribed and thus receiving the events.
                        this.log(
                            "* The following output of node-wot describes unsubscribing from the event but this output is identical for " +
                                "unsuccessful subscription and successful subscription with no emitted event."
                        )
                        if (testMode == Utils.InteractionType.Event) await self.tut.unsubscribeEvent(eventName)
                        else await self.tut.unobserveProperty(eventName)
                    } catch (error) {}
                    break
                case SubscriptionStatus.Successful:
                    // Testing cancellation only makes sense if subscription worked.
                    let sendTimeStamp = new Date()
                    container.cancellationReport.sent = new Payload(sendTimeStamp)
                    try {
                        // Trying to Unsubscribe/Stop observing from the event/property.
                        if (testMode == Utils.InteractionType.Event) await self.tut.unsubscribeEvent(eventName)
                        else await self.tut.unobserveProperty(eventName)
                    } catch (error) {
                        self.log("* Error while canceling subscription from event: " + eventName + ":\n  " + error)
                        container.passed = false
                        container.cancellationReport.passed = false
                        container.cancellationReport.result = new Result(20, "Error while canceling subscription: " + error)
                        return true
                    }
                    container.cancellationReport.received = new Payload(new Date())
                    self.log("* Successfully cancelled subscription from " + eventName)
                    container.cancellationReport.passed = true
                    container.cancellationReport.result = new Result(200)
                    break
            }
            return
        }

        async function handleReceivedData(receivedData: any): Promise<void> {
            let receivedTimeStamp = new Date()
            ++indexOfEventData
            // Stop recording if maximum number of recorded EventData is reached.
            if (indexOfEventData >= self.testConfig.EventAndObservePOptions.MaxAmountRecvData) {
                // Stop Listening for Data.
                earlyListenTimeout.resolve()
                return
            }
            // Stop handling if sent TD does not have "data"
            if (testMode == Utils.InteractionType.Event && !interaction.hasOwnProperty("data")) {
                return
            }
            self.log("* Received event data [index: " + indexOfEventData + "]: " + JSON.stringify(receivedData, null, " "))
            try {
                let temp: JSON = receivedData
            } catch (jsonError) {
                self.log("* Received event data [index: " + indexOfEventData + "] is not in JSON format")
                container.passed = false
                container.eventDataReport.passed = false
                let result = new Result(15, "* Received data [index: " + indexOfEventData + "] is not in JSON format: " + jsonError)
                container.eventDataReport.received.push(new EventData(receivedTimeStamp, receivedData, result))
                return
            }
            //validating the response against its schema
            var validationError: Array<any>
            if (testMode == Utils.InteractionType.Event)
                validationError = Utils.validateResponse(eventName, receivedData, self.testConfig.SchemaLocation, Utils.SchemaType.EventData)
            else validationError = Utils.validateResponse(eventName, receivedData, self.testConfig.SchemaLocation, Utils.SchemaType.Property)
            if (validationError) {
                //meaning that there is a validation error
                self.log("* Received event data [index: " + indexOfEventData + "] is not valid.")
                container.passed = false
                container.eventDataReport.passed = false
                let result = new Result(16, "* Received data [index: " + indexOfEventData + "] is not valid: " + JSON.stringify(validationError))
                container.eventDataReport.received.push(new EventData(receivedTimeStamp, receivedData, result))
            } else {
                self.log("* Received event data [index: " + indexOfEventData + "] is valid.")
                container.eventDataReport.received.push(new EventData(receivedTimeStamp, receivedData, new Result(200)))
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
            self.log("* Trying to subscribe to " + eventName + " with data: " + JSON.stringify(toSend, null, " "))

            async function timeout(ms: number): Promise<SubscriptionStatus> {
                await sleep(1000)
                return SubscriptionStatus.Timeout
            }
            var subscriptionError = null
            async function subscribeEvent(): Promise<SubscriptionStatus> {
                try {
                    if (testMode == Utils.InteractionType.Event) {
                        await self.tut.subscribeEvent(eventName, (eventData) => {
                            handleReceivedData(eventData)
                        })
                    } else {
                        await self.tut.observeProperty(eventName, (eventData) => {
                            handleReceivedData(eventData)
                        })
                    }
                } catch (error) {
                    subscriptionError = error
                    return SubscriptionStatus.Error
                }
                return SubscriptionStatus.Successful
            }

            container.subscriptionReport.sent = new Payload(new Date())
            // Trying to Subscribe to the Event
            subscriptionStatus = await Promise.race([subscribeEvent(), timeout(2000)])
            switch (subscriptionStatus) {
                case SubscriptionStatus.Error:
                    self.log("* Problem when trying to subscribe to event " + eventName + ": " + subscriptionError)
                    container.passed = false
                    container.subscriptionReport.passed = false
                    container.subscriptionReport.result = new Result(10, "Problem when trying to subscribe: " + subscriptionError)
                    break
                case SubscriptionStatus.Timeout:
                    self.log(
                        "* Timed out when trying to subscribe to " +
                            eventName +
                            ". Due to the design of node-wot this can mean either the subscription was unsuccessful or " +
                            "the subscription was successful but no eventData was received."
                    )
                    container.passed = true
                    container.subscriptionReport.passed = true
                    container.subscriptionReport.result = new Result(
                        100,
                        "Timeout when subscribing: Due to the design of node-wot this can mean either the subscription was unsuccessful or it was successful but no eventData was received."
                    )
                    break
                case SubscriptionStatus.Successful:
                    let receivedTimeStamp = new Date()
                    container.subscriptionReport.received = new Payload(receivedTimeStamp)
                    self.log("* Successfully subscribed to " + eventName + " with data: " + JSON.stringify(toSend, null, " "))
                    container.subscriptionReport.passed = true
                    container.subscriptionReport.result = new Result(200)
                    //await sleep(self.testConfig.EventAndObservePOptions.MsListenAsynchronous)
                    await Promise.race([sleep(self.testConfig.EventAndObservePOptions.MsListenAsynchronous), earlyListenTimeout])
                    break
            }
            return
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
     */
    public testAction(testCycle: number, testScenario: number, actionName: string, interaction: any): Promise<boolean> {
        var self = this
        var container = new ActionTestReportContainer(testCycle, testScenario, actionName)

        return new Promise(function (resolve) {
            testAction().then(() => {
                self.testReport.addMessage(testCycle, testScenario, container)
                if (container.passed == true) {
                    self.log("* Test for " + actionName + " was successful.")
                }
                resolve(true)
            })
        })

        function testAction(): Promise<boolean> {
            return new Promise(function (resolve) {
                let toSend: JSON
                //generating the message to send
                try {
                    toSend = self.codeGen.findRequestValue(self.testConfig.TestDataLocation, testScenario, Utils.SchemaType.Action, actionName)
                    self.log("* Created value to send :" + JSON.stringify(toSend, null, " "))
                } catch (Error) {
                    self.log("* Cannot create for " + actionName + ", look at the previous message to identify the problem")
                    container.passed = false
                    container.report.result = new Result(12, "Cannot create message: " + Error)
                    resolve(true)
                }
                //validating request against a schema. Validator returns an array that describes the error. This array is empty when there is no error
                //a first thinking would say that it shouldn't be necessary but since the requests are user written, there can be errors there as well.
                if (toSend != null) {
                    let errors: Array<any> = Utils.validateRequest(actionName, toSend, self.testConfig.SchemaLocation, Utils.SchemaType.Action)
                    if (errors) {
                        //meaning that there is a validation error
                        self.log("* Created request is not valid for " + actionName + "\nMessage is " + toSend + "\nError is " + errors)
                        container.passed = false
                        container.report.result = new Result(13, "Created message has bad format: " + JSON.stringify(errors))
                        resolve(true)
                    } else {
                        self.log("* Created request is valid for: " + actionName)
                    }
                }
                //invoking the action
                try {
                    self.log("* Trying to invoke action " + actionName + " with data:" + JSON.stringify(toSend, null, " "))
                    // Try to invoke the action.
                    const invokedAction = self.tryToInvokeAction(actionName, toSend)
                    invokedAction[1]
                        .then((res: any) => {
                            let responseTimeStamp = new Date()
                            container.report.sent = new Payload(invokedAction[0], toSend) //sentTimeStamp, Payload
                            self.log("* Invoked action " + actionName + " with data: " + JSON.stringify(toSend, null, " "))
                            if (interaction.hasOwnProperty("output")) {
                                //the action doesn't have to answer something back
                                let answer = res
                                container.report.received = new Payload(responseTimeStamp, answer)
                                self.log("* Answer is:" + JSON.stringify(answer, null, " "))
                                try {
                                    let temp: JSON = answer
                                } catch (error) {
                                    self.log("* Response is not in JSON format")
                                    container.passed = false
                                    container.report.result = new Result(15, "Response is not in JSON format: " + error)
                                    resolve(true)
                                }
                                //validating the response against its schema, same as before
                                let errorsRes: Array<any> = Utils.validateResponse(actionName, answer, self.testConfig.SchemaLocation, "Action")
                                if (errorsRes) {
                                    //meaning that there is a validation error
                                    self.log("* Received response is not valid for: " + actionName)
                                    container.passed = false
                                    container.report.result = new Result(16, "Received response is not valid, " + JSON.stringify(errorsRes))
                                    resolve(true)
                                } else {
                                    self.log("* Received response is valid for: " + actionName)
                                    //if nothing is wrong, putting a good result
                                    container.report.result = new Result(200)
                                    resolve(true)
                                }
                            } else {
                                // in case there is no answer needed it is a successful test as well
                                self.log("* " + actionName + " is successful without return value")
                                container.report.result = new Result(201, "no return value needed")
                                resolve(true)
                            }
                        })
                        .catch((error) => {
                            self.log("* Problem when trying to invoke action " + actionName + ":\n  " + error)
                            container.passed = false
                            container.report.result = new Result(999, "Invoke Action Error: " + error)
                            resolve(true)
                        })
                } catch (Error) {
                    // in case there is a problem with the invoke of the action
                    self.log("* Response receiving for  " + actionName + "is unsuccessful, continuing with other scenarios")
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
     */
    public async testProperty(testCycle: number, testScenario: number, propertyName: string, interaction: any): Promise<boolean> {
        var self = this
        var container = new PropertyTestReportContainer(testCycle, testScenario, propertyName)
        let isWritable: boolean = !interaction.readOnly
        let isReadable: boolean = !interaction.writeOnly
        let isObservable: boolean = interaction.observable

        if (isReadable) self.log("* Property is readable")
        else self.log("* Property is not readable")
        if (isWritable) self.log("* Property is writable")
        else self.log("* Property is not writable")

        var preContainer: EventTestReportContainer = new EventTestReportContainer(testCycle, testScenario, propertyName)
        try {
            if (isReadable) await testReadProperty()
            if (isWritable) await testWriteProperty()
            if (isObservable) container.observePropertyReport = await this.testObserveOrEvent(preContainer, interaction, Utils.InteractionType.Property)
        } catch (error) {
            container.passed = false
            self.testReport.addMessage(testCycle, testScenario, container)
            throw error
        }
        self.testReport.addMessage(testCycle, testScenario, container)
        if (container.passed == true) {
            self.log("* Test for " + propertyName + " was successful.")
        }
        return

        /**
         * Tests the ReadProperty of a property. TestResults are written into container. Returns true if an error on node-wot level occurred.
         * @return A boolean indicating if an error on node-wot level occurred.
         */
        function testReadProperty(): Promise<boolean> {
            return new Promise(function (resolve, reject) {
                let data: JSON
                self.log("* Testing the read functionality for: " + propertyName)
                container.readPropertyReport = new MiniTestReport(false)
                self.tut
                    .readProperty(propertyName)
                    .then((res: any) => {
                        let responseTimeStamp = new Date()
                        data = res
                        container.readPropertyReport.received = new Payload(responseTimeStamp, res)
                        self.log("* Data after first read property: " + JSON.stringify(data, null, " "))
                        //validating the property value with its Schemas
                        let errorsProp: Array<any> = Utils.validateResponse(propertyName, data, self.testConfig.SchemaLocation, "Property")
                        if (errorsProp) {
                            //meaning that there is a validation error
                            self.log("* Received response is not valid for: " + propertyName + errorsProp)
                            container.passed = false
                            container.readPropertyReport.result = new Result(35, "Received response is not valid, " + JSON.stringify(errorsProp))
                        } else {
                            self.log("* Received response is valid for: " + propertyName)
                            container.readPropertyReport.passed = true
                            container.readPropertyReport.result = new Result(200)
                        }
                    })
                    .then(() => {
                        self.log("* Read functionality test of " + propertyName + " is successful: first get property is schema valid")
                        resolve(true)
                    })
                    .catch((error: any) => {
                        //problem in the node-wot level
                        self.log("* Error when fetching property " + propertyName + " for the first time: \n  " + error)
                        container.passed = false
                        container.readPropertyReport.passed = false
                        container.readPropertyReport.result = new Result(30, "Could not fetch property")
                        reject(new Error("Problem in the node-wot level."))
                    })
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
                let data2: JSON
                let toSend: JSON
                self.log("* Testing the write functionality for: " + propertyName)
                container.writePropertyReport = new MiniTestReport(false)
                //generating the message to send
                try {
                    toSend = self.codeGen.findRequestValue(self.testConfig.TestDataLocation, testScenario, Utils.SchemaType.Property, propertyName)
                    self.log("* Created value to send: " + JSON.stringify(toSend, null, " "))
                } catch (Error) {
                    self.log("* Cannot create message for " + propertyName + ", look at the previous message to identify the problem")
                    container.passed = false
                    container.writePropertyReport.result = new Result(40, "Cannot create message: " + Error)
                    resolve(true)
                }
                //validating request against a schema, same as the action. Since the requests are written by the user there can be errors
                //Pay attention that validateResponse is called because writing to a property is based on its outputData
                let errors: Array<any> = Utils.validateResponse(propertyName, toSend, self.testConfig.SchemaLocation, "Property")
                if (errors) {
                    //meaning that there is a validation error
                    self.log("* Created request is not valid for " + propertyName + "\nMessage is " + toSend + "\nError is " + errors)
                    container.passed = false
                    container.readPropertyReport.result = new Result(41, "Created message has bad format: " + JSON.stringify(errors))
                    resolve(true)
                } else {
                    self.log("* Created request is valid for: " + propertyName)
                }

                //setting the property, aka writing into it
                self.log("* Writing to property " + propertyName + " with data: " + JSON.stringify(toSend, null, " "))
                let sendTimeStamp = new Date()
                self.tut
                    .writeProperty(propertyName, toSend)
                    .then(() => {
                        container.writePropertyReport.sent = new Payload(sendTimeStamp, toSend)
                        if (!isReadable) {
                            self.log("* Property test of " + propertyName + " is successful: no read")
                            container.writePropertyReport.passed = true
                            container.writePropertyReport.result = new Result(200)
                            resolve(true)
                        } else {
                            //now reading and hoping to get the same value
                            self.tut
                                .readProperty(propertyName)
                                .then((res2: any) => {
                                    let responseTimeStamp = new Date()
                                    data2 = res2
                                    self.log("* Data after second read property: " + JSON.stringify(data2, null, " "))
                                    //validating the gotten value (this shouldn't be necessary since the first time was correct but it is here nonetheless)

                                    let errorsProp2: Array<any> = Utils.validateResponse(propertyName, data2, self.testConfig.SchemaLocation, "Property")

                                    if (errorsProp2) {
                                        //meaning that there is a validation error
                                        self.log("* Received second response is not valid for: " + propertyName + errorsProp2)
                                        //here for the received, two response values are put
                                        container.passed = false
                                        container.writePropertyReport.received = new Payload(responseTimeStamp, data2)
                                        container.writePropertyReport.result = new Result(
                                            45,
                                            "Received second response is not valid, " + JSON.stringify(errorsProp2)
                                        )
                                    } else {
                                        //if there is no validation error we can test if the value we've gotten is the same as the one we wrote
                                        self.log("* Received second response is valid for: " + propertyName)
                                        container.writePropertyReport.passed = true
                                        if (JSON.stringify(data2) == JSON.stringify(toSend)) {
                                            // Everything is fine.
                                            self.log(
                                                "* Write functionality test of " +
                                                    propertyName +
                                                    " is successful: write works and second get property successful"
                                            )
                                            self.log("* The return value of the second get property (after writing) did match the write for: " + propertyName)
                                            container.writePropertyReport.received = new Payload(responseTimeStamp, data2)
                                            container.writePropertyReport.result = new Result(200)
                                        } else {
                                            //maybe the value changed between two requests...
                                            self.log("* Write functionality test of " + propertyName + " is successful: write works, fetch not matching")
                                            container.writePropertyReport.received = new Payload(responseTimeStamp, data2)
                                            container.writePropertyReport.result = new Result(
                                                100,
                                                "The return value of the second get property (after writing) did not match the write"
                                            )
                                        }
                                    }
                                })
                                .then(() => {
                                    resolve(true)
                                })
                                .catch((error: any) => {
                                    // Problem in the node-wot level.
                                    self.log("* Error when fetching property " + propertyName + " for the second time: \n  " + error)
                                    container.passed = false
                                    container.writePropertyReport.passed = false
                                    container.writePropertyReport.result = new Result(31, "Could not fetch property in the second get" + error)
                                    reject(new Error("Problem in the node-wot level."))
                                })
                        }
                    })
                    .catch((error: any) => {
                        self.log("* Couldn't set the property: " + propertyName)
                        container.passed = false
                        container.writePropertyReport.passed = false
                        container.writePropertyReport.result = new Result(32, "Problem setting property" + error)
                        resolve(true)
                    })
            })
        }
    }

    getAllInteractionOfType(interactionType: Utils.InteractionType) {
        let interactionList: Array<string> = []
        if (interactionType == Utils.InteractionType.Property) interactionList = Object.keys(this.tutTd.properties)
        else if (interactionType == Utils.InteractionType.Action) interactionList = Object.keys(this.tutTd.actions)
        else if (interactionType == Utils.InteractionType.Event) interactionList = Object.keys(this.tutTd.events)
        return interactionList
    }

    async testInteraction(testCycle: number, testScenario: number, interactionName: string, interactionType: Utils.InteractionType) {
        let interaction = Utils.getInteractionByName(this.tutTd, interactionName)
        if (this.logMode) console.log("interaction pattern of " + interactionType + ":", interaction[1])
        this.log("* ..................... Testing " + interactionType + ":" + interactionName + ".................")
        try {
            if (interactionType == Utils.InteractionType.Property) await this.testProperty(testCycle, testScenario, interactionName, interaction[1])
            else if (interactionType == Utils.InteractionType.Action) await this.testAction(testCycle, testScenario, interactionName, interaction[1])
            else if (interactionType == Utils.InteractionType.Event) await this.testEvent(testCycle, testScenario, interactionName, interaction[1])
        } catch (error) {
            this.log("* Error when testing " + interactionType + " " + interactionName + " (see previous messages).")
            throw error
        }
        this.log("* ..................... End Testing " + interactionType + ":" + interactionName + ".................")
        return
    }

    async secondTestingPhase(repetitionNumber: number) {
        this.log("* ---------------------- Start of Second Test Phase: Synchronous Listening ---------------------------")
        this.testReport.addTestCycle()
        this.testReport.addTestScenario()
        try {
            // Generating List of testFunctions to run synchronously.
            let interactionList: Array<Promise<any>> = []
            let propertyList: Array<string> = this.getAllInteractionOfType(Utils.InteractionType.Property)
            for (let interactionName of propertyList) {
                interactionList.push(this.testInteraction(repetitionNumber, 0, interactionName, Utils.InteractionType.Property))
            }
            let eventList: Array<string> = this.getAllInteractionOfType(Utils.InteractionType.Event)
            for (let interactionName of eventList) {
                interactionList.push(this.testInteraction(repetitionNumber, 0, interactionName, Utils.InteractionType.Event))
            }
            // Awaiting all of those testFunctions.
            await Promise.all(interactionList)
        } catch (error) {
            console.log(error)
            this.log("* ------------------------- Error in second Test Phase -----------------------------------")
            return
        }
        this.log("* ------------------------- Second Test Phase finished without an error. -----------------------------------")
        return
    }

    async testAllInteractionsOfTypeSequentially(testCycle: number, testScenario: number, interactionType: Utils.InteractionType) {
        // Get all interactions for type.
        let interactionList: Array<string> = this.getAllInteractionOfType(interactionType)

        // Test all interaction sequentially
        for (let interactionName of interactionList) {
            await this.testInteraction(testCycle, testScenario, interactionName, interactionType)
        }
        return
    }

    /**
     * This method tests all the messages with the values of one given scenario
     * Actions and Properties are all tested
     * The return value needs to be changed and made into a Promise
     * @param testCycle The number indicating the testCycle.
     * @param testScenario The number indicating the testScenario.
     */
    public async testScenario(testCycle: number, testScenario: number): Promise<any> {
        var self = this
        try {
            await this.testAllInteractionsOfTypeSequentially(testCycle, testScenario, Utils.InteractionType.Property)
            await this.testAllInteractionsOfTypeSequentially(testCycle, testScenario, Utils.InteractionType.Action)
            await this.testAllInteractionsOfTypeSequentially(testCycle, testScenario, Utils.InteractionType.Event)
        } catch (error) {
            self.log("* Error in Test Scenario " + testScenario + " (see previous messages):\n  " + error.stack)
            throw error
        }
        return
    }

    public testCycle(cycleNumber: number, scenarioNumber: number): Promise<any> {
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
                    return self.testScenario(cycleNumber, scenarioNb)
                })
            })
            promise
                .then(() => {
                    self.log("* Test Cycle " + cycleNumber + " has finished without an error.")
                    resolve()
                })
                .catch(() => {
                    self.log("* Error in Test Cycle " + cycleNumber + " (see previous messages).")
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
        this.logMode = logMode
        var self = this
        let reps: Array<number> = []
        for (var i = 0; i < repetition; i++) {
            reps[i] = i
        }
        return new Promise(function (resolve, reject) {
            let promise = Promise.resolve()
            reps.forEach((repNb) => {
                promise = promise.then(() => {
                    self.log("* Cycle " + repNb + ", testing all scenarios")
                    self.testReport.addTestCycle()
                    return self.testCycle(repNb, scenarioNumber)
                })
            })
            promise
                .then(() => {
                    self.log("* First Test Phase has finished without an error.")
                    resolve(self.testReport)
                })
                .catch(() => {
                    self.log("* Testing the Thing has finished with an error (see previous messages).")
                    reject()
                })
        })
    }
}
