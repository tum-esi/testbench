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
import fetch from "node-fetch"
import * as fs from "fs"
import { JSONSchemaFaker as jsf } from "json-schema-faker"
import {
    TestReport,
    ActionTestReportContainer,
    PropertyTestReportContainer,
    MiniTestReport,
    Result,
    Payload,
    EventTestReportContainer,
    EventData,
    VulnerabilityReport,
} from "./TestReport"
import {
    usernames as defaultUsernames,
    usernames_short as defaultUsernamesShort,
    passwords as defaultPasswords,
    passwords_short as defaultPasswordsShort,
} from "./defaults"

export class Tester {
    private tutTd: wot.ThingDescription //the TD that belongs to the Thing under Test
    private testConfig: Utils.testConfig //the file that describes various locations of the files that are needed. Must be configured by the user
    public codeGen: Utils.CodeGenerator //this will generate the requests to be sent to the tut
    public testReport: TestReport //after the testing, this will contain the bare results
    public inputTestReport: object
    private tut: wot.ConsumedThing // the thing under test
    private logMode: boolean // True if logMode is enabled, false otherwise.

    /**
     * This is a basic constructor, it is planned to change to incorporate more things into the initiate function.
     * @param tC The testConfig.
     * @param tut The Thing under test.
     */
    constructor(tC: Utils.testConfig, tut: wot.ConsumedThing) {
        this.testConfig = tC
        this.tutTd = tut.getThingDescription()
        this.tut = tut
    }

    /**
     * Logs a message if the logMode is enabled.
     * @param message The message to log.
     */
    private log(message: string): void {
        if (this.logMode) Utils.logFormatted(message)
    }

    /**
     * Generates Schemas and fake data. Adds TestReport instance.
     * @param logMode True if logMode is enabled, false otherwise.
     */
    public initiate(logMode: boolean): number {
        this.log("Initiation has started")
        this.logMode = logMode
        let check = 0
        try {
            check = Utils.generateSchemas(this.tutTd, this.testConfig.SchemaLocation, logMode)
            this.log("Finished schema generation.")
        } catch (Error) {
            this.log("Schema Generation Error" + Error)
        }
        try {
            this.codeGen = new Utils.CodeGenerator(this.tutTd, this.testConfig)
            this.log("Finished code generation")
        } catch (Error) {
            this.log("Utils.CodeGenerator Initialization Error" + Error)
        }
        //building Input level Test Report
        try {
            //write fct that returns an array of objects which gets put into T3 ib the TB
            this.inputTestReport = Utils.createT3Report(this.codeGen.requests, this.codeGen.input_types)
        } catch (Error) {
            this.log("Initialization Input level Test Report Generation Error" + Error)
        }
        //The test report gets initialized and the first cycle and scenarios are added
        //This means that single tests are possible to be seen in the test report
        this.testReport = new TestReport()
        this.log("Initialization finished")
        return check
    }

    /**
     * Returns the generated Test Data. Logs the entire process if logMode is enabled. Returns a Tuple. First Tuple element is a Result object
     * containing a resultMessage and a resultID in case of failure. Result object is null otherwise. Second Tuple element is the generated Payload.
     * @param schemaType The SchemaType of the generated TestData to get.
     * @returns A Tuple. First Tuple element is a Result object containing a resultMessage and a resultID in case of failure. Result
     * object is null otherwise. Second Tuple element is the generated Payload.
     */
    async getGeneratedTestData(
        container: PropertyTestReportContainer | EventTestReportContainer | ActionTestReportContainer,
        schemaType: Utils.SchemaType
    ): Promise<[Result, JSON]> {
        let toSend: JSON
        // Generating the message to send.
        let result = null
        try {
            toSend = this.codeGen.findRequestValue(this.testConfig.TestDataLocation, container.testScenario, schemaType, container.name)
            this.log("Successfully created " + schemaType + " payload for " + container.name + ": " + JSON.stringify(toSend, null, " "))
        } catch (error) {
            this.log("Problem while trying to create " + schemaType + " payload for " + container.name + ":\n  " + error)
            result = new Result(12, "Cannot create payload: " + error)
        }
        // Validating the request against a schema. Validator returns an array that describes the error. This array is empty when there is no error.
        // Necessary because the requests are user written and can contain errors.
        if (toSend != null || schemaType != Utils.SchemaType.Action) {
            const errors: Array<any> = Utils.validateRequest(container.name, toSend, this.testConfig.SchemaLocation, schemaType)
            if (errors) {
                //meaning that there is a validation error
                this.log("Created " + schemaType + " payload for " + container.name + " is not valid: Created Payload: " + toSend + "Errors: " + errors)
                result = new Result(13, "Created payload was invalid: " + JSON.stringify(errors))
            } else {
                this.log("Created " + schemaType + " payload for " + container.name + " is valid")
            }
        }
        return [result, toSend]
    }

    /**
     * Tests an event. Logs the entire testing process. Adds a message containing the test results to the testReport.
     * @param testCycle The testCycle of the event to test.
     * @param testScenario The testScenario of the event to test.
     * @param eventName The name of the event to test.
     * @param interaction The interaction Object of the event to test.
     * @param listeningType The Listening Type (Either Synchronously or Asynchronously).
     */
    public async testEvent(testCycle: number, testScenario: number, eventName: string, interaction: any, listeningType: Utils.ListeningType): Promise<boolean> {
        const container: EventTestReportContainer = new EventTestReportContainer(testCycle, testScenario, eventName)
        await this.testObserveOrEvent(container, interaction, Utils.InteractionType.Event, listeningType)
        let messageAddition = "not "
        if (container.passed == true) {
            messageAddition = ""
        }
        this.log("Test for Event " + eventName + " was " + messageAddition + "passed.")
        return true
    }

    /**
     * Tests an Event or observeProperty. At first the the subscription is tested. The subscription has three possible outcomes Timeout, Error
     * and Successful. If subscription was successful the methods waits a defined timeframe. In this timeframe a provided callback checks
     * every bit of received Data. Afterwards the unsubscribe operation is tested. A container object is filled with the testResults during
     * the whole testing process and returned afterwards. Every step is logged if logMode is enabled.
     * @param container
     * @param interaction
     * @param testMode
     * @param listeningType
     */
    public async testObserveOrEvent(
        container: EventTestReportContainer,
        interaction: any,
        testMode: Utils.InteractionType.Event | Utils.InteractionType.Property,
        listeningType: Utils.ListeningType
    ): Promise<any> {
        // Used for referencing Tester itself for the functions under this function
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        const self = this
        // Initialize testing parameters.
        let eventConfig: { MaxAmountRecvData: number; MsListen: number; MsSubscribeTimeout: number }
        if (listeningType == Utils.ListeningType.Asynchronous) eventConfig = this.testConfig.EventAndObservePOptions.Asynchronous
        else eventConfig = this.testConfig.EventAndObservePOptions.Synchronous
        let indexOfEventData = -1
        const earlyListenTimeout = new Utils.DeferredPromise()
        const subscriptions: { [id: string]: wot.Subscription } = {}

        // Initialize message strings.
        const interactionName = container.name
        const interactionSpecifier = testMode + " " + interactionName
        const receivedDataMsg = "Received data for " + testMode + " " + interactionName + " "

        // Run Tests.
        enum SubscriptionStatus {
            Timeout,
            Error,
            Successful,
        }
        let subscriptionStatus: SubscriptionStatus = SubscriptionStatus.Error
        const status = await testSubscribe()
        await testUnsubscribe()

        // If no data was received, no checks could be made.
        if (container.eventDataReport.received.length < 1) {
            container.eventDataReport.result = new Result(100, "Never received any data, thus no checks could be made.")
        }
        return status

        /**
         * Tests the subscribe functionality.
         */
        async function testSubscribe(): Promise<any> {
            self.log("Trying to subscribe to " + interactionSpecifier + ".")

            async function timeout(): Promise<SubscriptionStatus> {
                await Utils.sleepInMs(eventConfig.MsSubscribeTimeout)
                return SubscriptionStatus.Timeout
            }
            let subscriptionError = null
            async function subscribe(): Promise<SubscriptionStatus> {
                try {
                    if (testMode == Utils.InteractionType.Event) {
                        subscriptions[interactionName] = await self.tut.subscribeEvent(interactionName, (eventData) => {
                            handleReceivedData(eventData)
                        })
                    } else {
                        subscriptions[interactionName] = await self.tut.observeProperty(interactionName, (eventData) => {
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
            // Trying to Subscribe to the Event. subscriptionStatus is set accordingly.
            subscriptionStatus = await Promise.race([subscribe(), timeout()])
            switch (subscriptionStatus) {
                case SubscriptionStatus.Error:
                    self.log("Problem when trying to subscribe to " + interactionSpecifier + ": " + subscriptionError)
                    container.passed = false
                    container.subscriptionReport.passed = false
                    container.subscriptionReport.result = new Result(10, "Problem when trying to subscribe: " + subscriptionError)
                    break
                case SubscriptionStatus.Timeout:
                    self.log(
                        "Timed out when trying to subscribe to " +
                            interactionSpecifier +
                            ". Due to the design of node-wot this can mean either the subscription was unsuccessful or " +
                            "the subscription was successful but no data was received."
                    )
                    container.passed = true
                    container.subscriptionReport.passed = true
                    container.subscriptionReport.result = new Result(
                        100,
                        "Timeout when subscribing: Due to the design of node-wot this can mean either the subscription was unsuccessful or it was successful but no data was received."
                    )
                    break
                case SubscriptionStatus.Successful:
                    self.log("Successfully subscribed to " + interactionSpecifier + ".")
                    container.subscriptionReport.passed = true
                    container.subscriptionReport.result = new Result(200)
                    await Promise.race([Utils.sleepInMs(eventConfig.MsListen), earlyListenTimeout])
                    break
            }
            return subscriptionStatus
        }

        /**
         * Records received data and checks if it is valid.
         * @param receivedData The received data package.
         */
        async function handleReceivedData(receivedData: any): Promise<void> {
            receivedData = await receivedData.value()
            const receivedTimeStamp = new Date()
            ++indexOfEventData
            // Stop recording if maximum number of recorded data packages is reached.
            if (eventConfig.MaxAmountRecvData != null) {
                if (indexOfEventData >= eventConfig.MaxAmountRecvData) {
                    // Stop Listening for Data.
                    earlyListenTimeout.resolve()
                    return
                }
            }
            // Stop handling if sent TD does not have "data" for event.
            if (testMode == Utils.InteractionType.Event && !Object.prototype.hasOwnProperty.call(interaction, "data")) {
                // receivedData === undefined if event was emitted without payload. This is correct as long as event has no "data" property.
                if (receivedData === undefined) {
                    self.log("Received as expected empty event with no payload.")
                    const result = new Result(200, "Received as expected empty event with no payload.")
                    container.eventDataReport.received.push(new EventData(receivedTimeStamp, null, result))
                    return
                }
                // Received unexpected event data (no "data" property for this event in the TD).
                container.passed = false
                container.eventDataReport.passed = false
                try {
                    const temp: JSON = receivedData
                } catch (error) {
                    // received data is not JSON
                    self.log(
                        receivedDataMsg +
                            "[index: " +
                            indexOfEventData +
                            "]: received unexpected (no data property for this even in the TD), non JSON conformal data."
                    )
                    const result = new Result(98, "Received unexpected (no data property for this event in TD), non JSON conformal return value.")
                    container.eventDataReport.received.push(
                        new EventData(
                            receivedTimeStamp,
                            JSON.parse(JSON.stringify("NOT the actual data: The received data was not JSON conformal: " + error)),
                            result
                        )
                    )
                    return
                }
                self.log(
                    receivedDataMsg +
                        "[index: " +
                        indexOfEventData +
                        ']: received unexpected (no data property for this event in TD) data: "' +
                        JSON.stringify(receivedData, null, " ") +
                        '"'
                )
                const result = new Result(99, "Received unexpected (no data property for this event in TD) event data.")
                container.eventDataReport.received.push(new EventData(receivedTimeStamp, receivedData, result))
                return
            }
            self.log(receivedDataMsg + "[index: " + indexOfEventData + "]: " + JSON.stringify(receivedData, null, " "))
            // Checking if data package has JSON format.
            try {
                const temp: JSON = receivedData
            } catch (jsonError) {
                self.log(receivedDataMsg + "[index: " + indexOfEventData + "] is not in JSON format")
                container.passed = false
                container.eventDataReport.passed = false
                const result = new Result(15, "Received data [index: " + indexOfEventData + "] is not in JSON format: " + jsonError)
                container.eventDataReport.received.push(
                    new EventData(
                        receivedTimeStamp,
                        JSON.parse(JSON.stringify("NOT the actual data: The received data was not JSON conformal: " + jsonError)),
                        result
                    )
                )
                return
            }
            // Checking if data package validates against its schema.
            let validationError: Array<any>
            if (testMode == Utils.InteractionType.Event)
                validationError = Utils.validateResponse(interactionName, receivedData, self.testConfig.SchemaLocation, Utils.SchemaType.EventData)
            else validationError = Utils.validateResponse(interactionName, receivedData, self.testConfig.SchemaLocation, Utils.SchemaType.Property)
            if (validationError) {
                self.log(receivedDataMsg + "[index: " + indexOfEventData + "] is not valid.")
                container.passed = false
                container.eventDataReport.passed = false
                const result = new Result(16, "Received data [index: " + indexOfEventData + "] is not valid: " + JSON.stringify(validationError))
                container.eventDataReport.received.push(new EventData(receivedTimeStamp, receivedData, result))
            } else {
                // Otherwise data package is valid.
                self.log(receivedDataMsg + "[index: " + indexOfEventData + "] is valid.")
                container.eventDataReport.received.push(new EventData(receivedTimeStamp, receivedData, new Result(200)))
            }
        }

        /**
         * Tests the unsubscribe functionality.
         */
        async function testUnsubscribe(): Promise<boolean> {
            self.log("Trying to unsubscribe from " + interactionSpecifier + ".")

            // Different actions are needed depending on the subscriptionStatus.
            switch (subscriptionStatus) {
                case SubscriptionStatus.Error:
                    // If Subscription failed Cancellation can not work.
                    self.log(
                        "Problem when trying to unsubscribe from " +
                            interactionSpecifier +
                            ": The testbench was never subscribed due to a subscription error (see previous messages and subscriptionReport)."
                    )
                    container.passed = true
                    container.cancellationReport.passed = true
                    container.cancellationReport.result = new Result(
                        100,
                        "Subscription cancellation test not possible: The testbench was never subscribed to " +
                            testMode +
                            " due to a subscription error (see subscriptionReport)."
                    )
                    break
                case SubscriptionStatus.Timeout:
                    // Due to not knowing if subscription failed or subscription was successful but no events were emitted, this case needs
                    // his own handling.
                    self.log(
                        "Problem when trying to unsubscribe from " +
                            interactionSpecifier +
                            ": The testbench was never subscribed or was subscribed but never received any data (see previous messages, subscriptionReport and eventDataReport/observedDataReport)."
                    )
                    container.passed = true
                    container.cancellationReport.passed = true
                    container.cancellationReport.result = new Result(
                        100,
                        "Subscription cancellation test not possible: Timeout during subscription (see subscriptionReport)."
                    )
                    try {
                        // In this case cancelling subscription is necessary because if subscription was successful but subscription
                        // provider starts emitting only after the subscribeTimeout was reached the testbench would still be subscribed and
                        // thus receiving the data packages.
                        self.log(
                            "The following output of node-wot describes unsubscribing from " +
                                interactionSpecifier +
                                " but due to the design of node-wot this output is identical for " +
                                "unsuccessful subscription and successful subscription with no emitted event."
                        )

                        await subscriptions[interactionName].stop()
                    } catch {
                        // TODO: fill this block or get rid of it
                    }
                    break
                case SubscriptionStatus.Successful:
                    {
                        // Testing cancellation only makes sense if subscription worked.
                        const sendTimeStamp = new Date()
                        try {
                            // Trying to Unsubscribe/Stop observing from the event/property.
                            await subscriptions[interactionName].stop()
                        } catch (error) {
                            // If unsubscribing/unobserving threw an error.
                            self.log("Error while canceling subscription from " + interactionSpecifier + ":\n  " + error)
                            container.passed = false
                            container.cancellationReport.sent = new Payload(sendTimeStamp)
                            container.cancellationReport.passed = false
                            container.cancellationReport.result = new Result(20, "Error while canceling subscription: " + error)
                            return true
                        }
                        // Successfully unsubscribed/unobserved.
                        self.log("Successfully cancelled subscription from " + interactionSpecifier)
                        container.cancellationReport.sent = new Payload(sendTimeStamp)
                        container.cancellationReport.passed = true
                        container.cancellationReport.result = new Result(200)
                        break
                    }
                    return
            }
        }
    }

    /**
     * Invokes the specified action either with or without a payload. The returned promise times out after a specified amount of Seconds if
     * no answer is received.
     * @param actionName: The name of the action to invoke.
     * @param toSend: The payload to send to invoke the action.
     * @returns A Tuple containing the timestamp when the Action was invoked and the Promise that resolves after successful action invoke or
     * rejects after timeout.
     */
    private tryToInvokeAction(actionName: string, toSend?: JSON): [Date, Promise<any>] {
        if (toSend != null) {
            return [new Date(), Utils.promiseTimeout(this.testConfig.ActionTimeout, this.tut.invokeAction(actionName, toSend))]
        }
        return [new Date(), Utils.promiseTimeout(this.testConfig.ActionTimeout, this.tut.invokeAction(actionName))]
    }

    /**
     * Tests an action. At first the the needed data to invoke the action is queried. Then the action is invoked and the output is validated.
     * Every step and/or thrown error is documented in the ActionTestReportContainer object and logged if logMode is enabled.
     * @param testCycle The number indicating the testCycle.
     * @param actionName The string indicating the name of the action.
     * @param interaction An interaction object containing further information about the tested interaction.
     * @param testScenario The number indicating the testScenario.
     */
    public async testAction(testCycle: number, testScenario: number, actionName: string, interaction: any): Promise<void> {
        // Used for referencing Tester itself for the functions under this function
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        const self = this
        const container = new ActionTestReportContainer(testCycle, testScenario, actionName)

        await testAction()
        self.testReport.addMessage(testCycle, testScenario, container)
        if (container.passed == true) self.log("Test for " + actionName + " was successful.")
        else self.log("Test for " + actionName + " was not successful.")
        return

        async function testAction(): Promise<void> {
            // Querying the generated payload to write.
            const [result, toSend] = await self.getGeneratedTestData(container, Utils.SchemaType.Action)
            if (result != null) {
                container.report.result = result
                container.passed = false
                return
            }
            try {
                self.log("Trying to invoke action " + actionName + " with data:" + JSON.stringify(toSend, null, " "))
                let invokedAction: any
                let output: wot.InteractionOutput
                let receivedData: any
                // Try to invoke the action.
                try {
                    invokedAction = self.tryToInvokeAction(actionName, toSend)
                    output = await invokedAction[1]
                    receivedData = await output.value()
                } catch (error) {
                    // Error when trying to invoke the action.
                    self.log("Problem when trying to invoke action " + actionName + ":\n  " + error)
                    container.passed = false
                    container.report.result = new Result(999, "Invoke Action Error: " + error)
                    return
                }
                const responseTimeStamp = new Date()
                container.report.sent = new Payload(invokedAction[0], toSend) //sentTimeStamp, Payload
                self.log("Invoked action " + actionName + " with data: " + JSON.stringify(toSend, null, " "))
                if (!Object.prototype.hasOwnProperty.call(interaction, "output")) {
                    // No data received as expected.
                    if (receivedData === undefined) {
                        self.log(actionName + " did as expected not have a return value. Test is successful.")
                        container.report.received = null
                        container.report.result = new Result(201, "The event did as expected not have a return value.")
                        return
                    }
                    // Received data despite not expecting any.
                    container.passed = false
                    try {
                        const temp: JSON = receivedData
                    } catch (error) {
                        // received data is not JSON
                        self.log(actionName + "received unexpected (action did not have an output property in TD), non JSON conformal return value.")
                        container.report.received = JSON.parse(JSON.stringify("NOT the actual data: The received data was not JSON conformal."))
                        container.report.result = new Result(
                            98,
                            "Received unexpected (action did not have an output property in TD), non JSON conformal return value."
                        )
                        return
                    }
                    self.log(
                        actionName +
                            "received unexpected (action did not have an output property in TD) return value: " +
                            JSON.stringify(receivedData, null, " ")
                    )
                    container.report.received = receivedData
                    container.report.result = new Result(99, "Received unexpected (action did not have an output property in TD) return value.")
                    return
                }
                // Testing the invokeAction output.
                container.report.received = new Payload(responseTimeStamp, receivedData)
                self.log("Answer is:" + JSON.stringify(receivedData, null, " "))
                // Checking if data package has JSON format.
                try {
                    const temp: JSON = receivedData
                } catch (error) {
                    self.log("Response is not in JSON format")
                    container.passed = false
                    container.report.received = JSON.parse(JSON.stringify("NOT the actual data: The received data was not JSON conformal."))
                    container.report.result = new Result(15, "Response is not in JSON format: " + error)
                    return
                }
                // Checking if data package validates against its schema.
                const errorsRes: Array<any> = Utils.validateResponse(actionName, receivedData, self.testConfig.SchemaLocation, Utils.SchemaType.Action)
                if (errorsRes) {
                    self.log("Received response is not valid for: " + actionName)
                    container.passed = false
                    container.report.result = new Result(16, "Received response is not valid, " + JSON.stringify(errorsRes))
                    return
                } else {
                    // Otherwise output is valid.
                    self.log("Received response is valid for: " + actionName)
                    container.report.result = new Result(200)
                    return
                }
            } catch (Error) {
                // In case there is a problem with the invoke of the action.
                self.log("Response receiving for  " + actionName + "is unsuccessful, continuing with other scenarios")
                container.passed = false
                container.report.result = new Result(10, "Problem invoking the action" + Error)
                return
            }
        }
    }

    /**
     * Tests a property. If the property is readable/writeable/observable the functionality is tested in this error. Every step
     * and/or thrown error is documented in the PropertyTestReportContainer object and logged if logMode is enabled.
     * @param testCycle The number indicating the testCycle.
     * @param testScenario The number indicating the testScenario.
     * @param propertyName The string indicating the name of the property.
     * @param interaction An interaction object containing further information about the tested interaction.
     * @param listeningType The Listening Type (Either Synchronously or Asynchronously).
     */
    public async testProperty(
        testCycle: number,
        testScenario: number,
        propertyName: string,
        interaction: any,
        listeningType: Utils.ListeningType
    ): Promise<void> {
        // Used for referencing Tester itself for the functions under this function
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        const self = this
        // Check and log functionalities of the property.
        const container = new PropertyTestReportContainer(testCycle, testScenario, propertyName)
        const isWritable = !interaction.readOnly
        const isReadable = !interaction.writeOnly
        const isObservable: boolean = interaction.observable

        if (isReadable) self.log("Property " + propertyName + " is readable")
        else self.log("Property " + propertyName + " is not readable")
        if (isWritable) self.log("Property " + propertyName + " is writable")
        else self.log("Property " + propertyName + " is not writable")
        if (isObservable) self.log("Property " + propertyName + " is observable")
        else self.log("Property " + propertyName + " is not observable")

        try {
            // Test each property functionality if it is enabled.
            if (isReadable) await testReadProperty()
            if (isWritable) await testWriteProperty()
            if (isObservable) {
                container.observePropertyReport = new EventTestReportContainer(testCycle, testScenario, propertyName)
                await self.testObserveOrEvent(container.observePropertyReport, interaction, Utils.InteractionType.Property, listeningType)
                if (!container.observePropertyReport.passed) container.passed = false
            }
        } catch (error) {
            container.passed = false
            self.testReport.addMessage(testCycle, testScenario, container)
            throw error
        }
        self.testReport.addMessage(testCycle, testScenario, container)
        if (container.passed == true) {
            self.log("Test for Property " + propertyName + " was successful.")
        }
        return

        /**
         * Tests the read functionality of a property. TestResults are written into container. Throws an error if an error occurred in the
         * node-wot level.
         * @returns A boolean indicating if an error on node-wot level occurred.
         */
        async function testReadProperty(): Promise<void> {
            let data: JSON
            self.log("Testing the read functionality for Property: " + propertyName)
            container.readPropertyReport = new MiniTestReport(false)
            container.readPropertyReport.sent = new Payload(new Date())
            let res: any
            let responseTimeStamp: Date
            // Trying to read the property.
            try {
                res = await self.tut.readProperty(propertyName)
                responseTimeStamp = new Date()
                data = await res.value()
            } catch (error) {
                // Error in the node-wot level.
                self.log("Error when fetching Property " + propertyName + " for the first time: \n  " + error)
                container.passed = false
                container.readPropertyReport.passed = false
                container.readPropertyReport.result = new Result(30, "Could not fetch property")
                // throw new Error("Problem in the node-wot level.")
                return
            }
            container.readPropertyReport.received = new Payload(responseTimeStamp, data)
            self.log("Data after first read property: " + JSON.stringify(data, null, " "))
            // Checking if data package validates against its schema.
            const errorsProp: Array<any> = Utils.validateResponse(propertyName, data, self.testConfig.SchemaLocation, Utils.SchemaType.Property)
            if (errorsProp) {
                self.log("Received response is not valid for Property: " + propertyName + errorsProp)
                container.passed = false
                container.readPropertyReport.result = new Result(35, "Received response is not valid, " + JSON.stringify(errorsProp))
            } else {
                self.log("Received response is valid for Property: " + propertyName)
                container.readPropertyReport.passed = true
                container.readPropertyReport.result = new Result(200)
            }
            // Read functionality test was passed.
            self.log("Read functionality test of Property " + propertyName + " is successful: first get property is schema valid")
            return
        }

        /**
         * Tests the WriteProperty of a property by writing to the property and reading this property immediately afterwards. TestResults
         * are written into container. Throws an error if an error occurred in node-wot level.
         */
        async function testWriteProperty(): Promise<void> {
            self.log("Testing the write functionality for Property: " + propertyName)
            container.writePropertyReport = new MiniTestReport(false)
            // Querying the generated payload to write.
            const [result, toSend] = await self.getGeneratedTestData(container, Utils.SchemaType.Property)
            if (result != null) {
                container.writePropertyReport.result = result
                container.passed = false
                return
            }

            // Trying to write the property.
            self.log("Writing to property " + propertyName + " with data: " + JSON.stringify(toSend, null, " "))
            const sendTimeStamp = new Date()
            try {
                await self.tut.writeProperty(propertyName, toSend)
            } catch (error) {
                // Error when trying to write the property.
                self.log("Couldn't set the Property: " + propertyName)
                container.passed = false
                container.writePropertyReport.passed = false
                container.writePropertyReport.result = new Result(32, "Problem setting property" + error)
                return
            }
            container.writePropertyReport.sent = new Payload(sendTimeStamp, toSend)
            if (!isReadable) {
                // If property is not readable no further checks are possible, thus the test is passed.
                self.log("Property test of " + propertyName + " is successful: no read")
                container.writePropertyReport.passed = true
                container.writePropertyReport.result = new Result(200)
                return
            }
            // Reading the property and checking if written and read value are identical.
            let res2: any
            try {
                res2 = await self.tut.readProperty(propertyName)
            } catch (error) {
                // Error in the node-wot level.
                self.log("Error when fetching Property " + propertyName + " for the second time: \n  " + error)
                container.passed = false
                container.writePropertyReport.passed = false
                container.writePropertyReport.result = new Result(31, "Could not fetch property in the second get" + error)
                // throw new Error("Problem in the node-wot level.")
                return
            }

            const responseTimeStamp = new Date()
            const data2: JSON = await res2.value()
            self.log("Data after second read property for " + propertyName + ": " + JSON.stringify(data2, null, " "))
            // Checking if the read value validates against the property schema (this shouldn't be necessary since the first time was
            // correct but it is here nonetheless).
            const errorsProp2: Array<any> = Utils.validateResponse(propertyName, data2, self.testConfig.SchemaLocation, Utils.SchemaType.Property)
            if (errorsProp2) {
                self.log("Received second response is not valid for Property: " + propertyName + errorsProp2)
                container.passed = false
                container.writePropertyReport.received = new Payload(responseTimeStamp, data2)
                container.writePropertyReport.result = new Result(45, "Received second response is not valid, " + JSON.stringify(errorsProp2))
                return
            }
            // Checking if the read value is identical to the written one.
            self.log("Received second response is valid for Property: " + propertyName)
            container.writePropertyReport.passed = true
            if (JSON.stringify(data2) == JSON.stringify(toSend)) {
                // Values are identical, thus the test is passed.
                self.log("Write functionality test of Property " + propertyName + " is successful: write works and second get property successful")
                self.log("The return value of the second get property (after writing) did match the write for Property: " + propertyName)
                container.writePropertyReport.received = new Payload(responseTimeStamp, data2)
                container.writePropertyReport.result = new Result(200)
                return
            }
            // If the values are not identical but can change really fast thus the test is also passed.
            self.log("Write functionality test of Property " + propertyName + " is successful: write works, fetch not matching")
            container.writePropertyReport.received = new Payload(responseTimeStamp, data2)
            container.writePropertyReport.result = new Result(100, "The return value of the second get property (after writing) did not match the write")
            return
        }
    }

    /**
     * Returns a string array of all interactions of the given type. Array is empty if there are no interactions of this type.
     * @param interactionType The type of the queried interactions.
     * @returns A string array of the interactions of this type. Array is empty if no interactions of this type exist.
     */
    getAllInteractionOfType(interactionType: Utils.InteractionType): Array<string> {
        let interactionList: Array<string> = []
        if (interactionType == Utils.InteractionType.Property) interactionList = Object.keys(this.tutTd.properties)
        else if (interactionType == Utils.InteractionType.Action) interactionList = Object.keys(this.tutTd.actions)
        else if (interactionType == Utils.InteractionType.Event) interactionList = Object.keys(this.tutTd.events)
        return interactionList
    }

    /**
     * Tests an interaction and logs the testing process. Throws an error if the test encounters a fatal error.
     * @param testCycle The number indicating the testCycle.
     * @param testScenario The number indicating the testScenario.
     * @param interactionName The string indicating the name of the interaction.
     * @param interactionType The type of the interaction.
     * @param listeningType The Listening Type (Either Synchronously or Asynchronously).
     */
    async testInteraction(
        testCycle: number,
        testScenario: number,
        interactionName: string,
        interactionType: Utils.InteractionType,
        listeningType: Utils.ListeningType
    ) {
        const interaction = Utils.getInteractionByName(this.tutTd, interactionType, interactionName)
        if (this.logMode && listeningType == Utils.ListeningType.Asynchronous) console.log("interaction pattern of " + interactionType + ":", interaction)
        this.log("..................... Testing " + interactionType + ": " + interactionName + ".................")
        try {
            if (interactionType == Utils.InteractionType.Property) await this.testProperty(testCycle, testScenario, interactionName, interaction, listeningType)
            else if (interactionType == Utils.InteractionType.Action) await this.testAction(testCycle, testScenario, interactionName, interaction)
            else if (interactionType == Utils.InteractionType.Event) await this.testEvent(testCycle, testScenario, interactionName, interaction, listeningType)
        } catch (error) {
            this.log("Error when testing " + interactionType + " " + interactionName + " (see previous messages).")
            throw error
        }
        this.log("..................... End Testing " + interactionType + ": " + interactionName + ".................")
        return
    }

    /**
     * Tests all interactions of a specified type sequentially.
     * @param testCycle The number indicating the testCycle.
     * @param testScenario The number indicating the testScenario.
     * @param interactionType The type of the interactions.
     */
    async testAllInteractionsOfTypeSequentially(testCycle: number, testScenario: number, interactionType: Utils.InteractionType) {
        // Get all interactions for type.
        const interactionList: Array<string> = this.getAllInteractionOfType(interactionType)

        // Test all interaction sequentially
        for (const interactionName of interactionList) {
            await this.testInteraction(testCycle, testScenario, interactionName, interactionType, Utils.ListeningType.Asynchronous)
        }
        return
    }

    /**
     * Tests all interactions of this Thing with the for this testingScenario generated data. The report destination for each subTestReport
     * in the testReport is specified through the testCycle and testScenario parameters.
     * @param testCycle The number indicating the testCycle.
     * @param testScenario The number indicating the testScenario.
     */
    public async testScenario(testCycle: number, testScenario: number): Promise<any> {
        try {
            await this.testAllInteractionsOfTypeSequentially(testCycle, testScenario, Utils.InteractionType.Property)
            await this.testAllInteractionsOfTypeSequentially(testCycle, testScenario, Utils.InteractionType.Action)
            await this.testAllInteractionsOfTypeSequentially(testCycle, testScenario, Utils.InteractionType.Event)
        } catch (error) {
            this.log("Error in Test Scenario " + testScenario + " (see previous messages):\n  " + error.stack)
            throw error
        }
        return
    }

    /**
     * Runs a single testCycle.
     * @param cycleNumber The number specifying the testCycle.
     * @param scenarioNumber The number of scenarios to be run in this testCycle.
     */
    public async testCycle(cycleNumber: number, scenarioNumber: number): Promise<any> {
        const maxScenario: number = scenarioNumber

        try {
            for (let scenarioNb = 0; scenarioNb < maxScenario; scenarioNb++) {
                this.testReport.addTestScenario()
                await this.testScenario(cycleNumber, scenarioNb)
            }
        } catch {
            this.log("Error in Test Cycle " + cycleNumber + " (see previous messages).")
            throw Error
        }

        this.log("Test Cycle " + cycleNumber + " has finished without an error.")
        return
    }

    /**+
     * This is the action that is accessible from the Thing Description.
     * Meaning that, after consuming the test bench, this action can be invoked to test the entirety of the Thing with many test scenarios and repetitions
     * There is only a simple, repetitive call to test Scenario with adding arrays into the test report in between
     * Also according to the repetition number specified in the test config, the same test can be done multiple times.
     * @param repetition The number indicating the repetition.
     * @param testScenario The number indicating the testScenario.
     * @param logMode True if logMode is enabled, false otherwise.
     * @return The testReport object containing the test results and all functions required to display and store the results.
     */
    public async firstTestingPhase(repetition: number, scenarioNumber: number, logMode: boolean): Promise<TestReport> {
        this.logMode = logMode

        try {
            for (let repNb = 0; repNb < repetition; repNb++) {
                this.log("Cycle " + repNb + ", testing all scenarios")
                this.testReport.addTestCycle()
                await this.testCycle(repNb, scenarioNumber)
            }
        } catch {
            this.log("Testing the Thing has finished with an error (see previous messages).")
            throw Error
        }

        this.log("First Test Phase has finished without an error.")
        return this.testReport
    }

    /**
     * The second testing phase. Reruns all tests with a listening phase (observable properties and events). This time the testing is
     * happening synchronously. Returns when all tests resolved or a fatal error occurred.
     * @param repetitionNumber The number of repetitions in the whole test. Indicates the index of the second test phase report in the
     * testReport object.
     */
    async secondTestingPhase(repetitionNumber: number): Promise<boolean> {
        const propertyWithObserveList: Array<string> = []
        // Check if at least one observable property exists.
        for (const interactionName of this.getAllInteractionOfType(Utils.InteractionType.Property)) {
            const interaction: any = Utils.getInteractionByName(this.tutTd, Utils.InteractionType.Property, interactionName)
            if (interaction.observable) propertyWithObserveList.push(interactionName)
        }
        const eventList: Array<string> = this.getAllInteractionOfType(Utils.InteractionType.Event)
        // Nothing to do if no events and no observable properties exist.
        if (!propertyWithObserveList.length && !eventList.length) return false
        this.log("---------------------- Start of Second Test Phase: Synchronous Listening ---------------------------")
        this.testReport.addTestCycle()
        this.testReport.addTestScenario()
        try {
            // Generating List of testFunctions to run synchronously.
            const interactionList: Array<Promise<any>> = []
            for (const propertyName of propertyWithObserveList) {
                interactionList.push(this.testInteraction(repetitionNumber, 0, propertyName, Utils.InteractionType.Property, Utils.ListeningType.Synchronous))
            }
            for (const eventName of eventList) {
                interactionList.push(this.testInteraction(repetitionNumber, 1, eventName, Utils.InteractionType.Event, Utils.ListeningType.Synchronous))
            }
            // Awaiting all of those testFunctions.
            await Promise.all(interactionList)
        } catch (error) {
            console.log(error)
            this.log("------------------------- Error in second Test Phase -----------------------------------")
            // FIXME: Why does this return true?
            return true
        }
        this.log("------------------------- Second Test Phase finished without an error. -----------------------------------")
        return true
    }

    public async testVulnerabilities(fastMode: boolean) {
        // Read TD from the property.
        const td = this.tutTd

        // Arrays to store pre-determined set of credentials.
        let pwArray: Array<string> = []
        let idArray: Array<string> = []

        if (fastMode) {
            pwArray = defaultPasswordsShort
            idArray = defaultUsernamesShort
        } else {
            pwArray = defaultPasswords
            idArray = defaultUsernames
        }

        let scheme: string // Underlying security scheme.
        let schemeName: string // Covering name for security scheme.

        const report: VulnerabilityReport = new VulnerabilityReport()

        // Variables to pass credentials or token.
        let username: string
        let password: string
        let token: string

        // Assuming single security scheme.
        if (Array.isArray(td["security"])) {
            if (td["security"].length !== 1) {
                throw "Error: multiple security schemes cannot be tested for now."
            } else {
                schemeName = td["security"][0]
                scheme = td["securityDefinitions"][schemeName]["scheme"]
            }
        } else {
            schemeName = td["security"]
            scheme = td["securityDefinitions"][schemeName]["scheme"]
        }

        // try {
        //     // Reading common passwords & usernames.
        //     let passwords: string
        //     let ids: string

        //     if (fastMode) {
        //         // This is the case when 'testVulnerabilities' is called from the 'fastTest' action. Uses short lists in order not to take a long time.
        //         passwords = fs.readFileSync(path.join("assets", "passwords-short.txt"), "utf-8")
        //         ids = fs.readFileSync(path.join("assets", "usernames-short.txt"), "utf-8")
        //     } else {
        //         passwords = fs.readFileSync("assets/passwords.txt", "utf-8")
        //         ids = fs.readFileSync("assets/usernames.txt", "utf-8")
        //     }

        //     const pwLines: Array<string> = passwords.split(/\r?\n/)
        //     const idLines: Array<string> = ids.split(/\r?\n/)

        //     pwLines.forEach((line) => pwArray.push(line))
        //     idLines.forEach((line) => idArray.push(line))
        // } catch (err) {
        //     console.error("Error while trying to read usernames and passwords:", err)
        //     process.exit(1)
        // }
        /**
         * The main brute-forcing function.
         * @param myURL URL to be tested.
         * @param options Options for the required HTTP(s) request.
         * @param location Determines where credentials will be stored.
         */
        async function isPredictable(myURL: URL, options: object, location?: string): Promise<boolean> {
            for (const id of idArray) {
                for (const pw of pwArray) {
                    switch (scheme) {
                        case "basic":
                            if (location === "header") {
                                options["headers"]["Authorization"] = "Basic " + Buffer.from(id + ":" + pw).toString("base64")
                            } // TODO: Add other "in" parameters.
                            else throw "Currently auth. info can only be stored at the header."
                            break
                        case "oauth2":
                            options["body"].set("client_id", id)
                            options["body"].set("client_secret", pw)
                            break
                    }
                    const result: any = await fetch(myURL.toString(), options)
                    if (result.ok) {
                        username = id
                        password = pw

                        if (scheme == "oauth2") token = (await result.json())["access_token"]
                        return true
                    }
                }
            }
            // Will return false if no id-pw pair passes, indicating not-weak credentials.
            return false
        }
        /**
         * Tries sending requests with types other than the given one.
         * @param type input type of InteractionAffordance, if exists.
         * @param myURL URL of the related form.
         * @param options Request options.
         */
        async function typeFuzz(type: string, myURL: URL, options: object) {
            const accepts: Array<string> = []

            try {
                if (type != "object") {
                    options["body"] = JSON.stringify({ key: "value" })
                    const response = await fetch(myURL.toString(), options)
                    if (response.ok) accepts.push("object")
                }
                if (type != "array") {
                    options["body"] = JSON.stringify([1, 2, 3])
                    const response = await fetch(myURL.toString(), options)
                    if (response.ok) accepts.push("array")
                }
                if (type != "string") {
                    options["body"] = "TYPEFUZZ"
                    const response = await fetch(myURL.toString(), options)
                    if (response.ok) accepts.push("string")
                }
                if (type != "integer") {
                    options["body"] = JSON.stringify(42)
                    const response = await fetch(myURL.toString(), options)
                    if (response.ok) accepts.push("integer")
                }
                if (type != "number") {
                    options["body"] = JSON.stringify(2.71828182846)
                    const response = await fetch(myURL.toString(), options)
                    if (response.ok) accepts.push("number")
                }
                if (type != "boolean") {
                    options["body"] = JSON.stringify(true)
                    const response = await fetch(myURL.toString(), options)
                    if (response.ok) accepts.push("boolean")
                }
            } catch (e) {
                console.log(e)
                throw "typeFuzz() resulted in an error:"
            }
            return accepts
        }
        /**
         * Return credentials of tut, if exists.
         */
        function getCredentials(): string {
            try {
                const creds: object = JSON.parse(fs.readFileSync("default-config.json", "utf8"))["credentials"][td["id"]]

                if (creds != undefined) {
                    if (scheme == "basic") return Buffer.from(creds["username"] + ":" + creds["password"]).toString("base64")
                    if (scheme == "oauth2") return creds["token"]
                } else return null
            } catch (e) {
                console.log("error: " + e)
            }
        }
        /**
         * Simple function to create HTTP(s) request options from given parameters.
         */
        function createRequestOptions(url: URL, op: string): object {
            return {
                hostname: url.hostname,
                path: url.pathname,
                port: url.port,
                headers: {},
                method: op,
            }
        }
        /**
         * Returns the related form of the InteractionAffordance with given op.
         */
        function getForm(op: string, forms: Array<any>) {
            for (let i = 0; i < forms.length; i++) {
                if (forms[i]["op"].includes(op)) return forms[i]
            }
            return null
        }
        switch (scheme) {
            case "basic": {
                let location: string // The 'in' parameter of the TD Spec.
                report.scheme = "basic"

                if (!td["securityDefinitions"][schemeName]["in"]) {
                    // Default value.
                    location = "header"
                } else {
                    location = td["securityDefinitions"][schemeName]["in"] as string
                }

                if (td["properties"] != undefined) {
                    // Properties exist.
                    const properties: any = Object.values(td["properties"])

                    for (let i = 0; i < properties.length; i++) {
                        const property: any = properties[i]

                        // Creating propertyReport with the name of the property.
                        report.createVulnPropertyReport(Object.keys(td["properties"])[i])
                        report.propertyReports[i].createSecurityReport()

                        if (!property.writeOnly) {
                            // Property can be read, supposedly?
                            try {
                                // First tries to 'readproperty'.
                                let form = getForm("readproperty", property.forms)

                                // Check if the interaction has a different security scheme.
                                if (form["security"] != undefined) {
                                    if (Array.isArray(form["security"])) {
                                        if (!form["security"].includes(schemeName)) throw "Testing multiple security schemes are not currently available."
                                    } else if (form["security"] != schemeName) throw "Testing multiple security schemes are not currently available."
                                }

                                let propertyURL: URL = new URL(form["href"])

                                // Checking to see if any binding other than http(s) is used.
                                if (!propertyURL.toString().startsWith("http")) {
                                    report.propertyReports[i].addDescription(
                                        "Currently only HTTP(s) bindings are supported. Thus, property could not be tested."
                                    )
                                    continue
                                }
                                // Extracting http(s) method, if exists.
                                let method: string = form["htv:methodName"]

                                // Default method for 'readproperty'
                                if (method == null) method = "GET"

                                let propertyOptions: object = createRequestOptions(propertyURL, method)

                                // Brute-forcing with 'GET' requests, with the help of above lines.
                                const weakCredentials: boolean = await isPredictable(propertyURL, propertyOptions, location)
                                const creds: string = getCredentials()

                                if (weakCredentials || creds != null) {
                                    // Have credentials: either from brute-force or they are already given.
                                    report.propertyReports[i].security.passedDictionaryAttack = !weakCredentials

                                    report.propertyReports[i].createSafetyReport()

                                    if (!weakCredentials) {
                                        // Bruteforce failed, test 'readproperty' with given credentials.
                                        propertyOptions["headers"]["Authorization"] = "Basic " + creds

                                        // Making sure that the property is readable.
                                        const isReadable = await fetch(propertyURL.toString(), propertyOptions)
                                        if (isReadable.ok) report.propertyReports[i].isReadable(true)

                                        report.propertyReports[i].addDescription("Not weak username-password")
                                    } else {
                                        // If brute-force successes it is already readable.
                                        report.propertyReports[i].isReadable(true)
                                        report.propertyReports[i].addDescription("Weak username-password")
                                        report.propertyReports[i].addCredentials(username, password)
                                    }
                                    // Trying to 'writeproperty' with different types.
                                    form = getForm("writeproperty", property.forms)

                                    // This time 'form' can be null in case 'property' is 'readOnly'.
                                    if (form != null) {
                                        propertyURL = new URL(form["href"])

                                        if (!propertyURL.toString().startsWith("http")) {
                                            report.propertyReports[i].addDescription(
                                                "Currently only HTTP(s) bindings are supported. Thus, write tests for the property could not be conducted."
                                            )
                                            continue
                                        }

                                        method = form["htv:methodName"]

                                        if (method == null) method = "PUT"

                                        propertyOptions = createRequestOptions(propertyURL, method)

                                        let contentType: string = form["contentType"]

                                        if (contentType == undefined) contentType = "application/json"
                                        propertyOptions["headers"]["Content-Type"] = contentType

                                        if (!weakCredentials) propertyOptions["headers"]["Authorization"] = "Basic " + creds
                                        else propertyOptions["headers"]["Authorization"] = "Basic " + Buffer.from(username + ":" + password).toString("base64")

                                        // Types that should not be normally allowed.
                                        const types: string[] = await typeFuzz(property.type, propertyURL, propertyOptions)
                                        types.forEach((type) => report.propertyReports[i].addType(type))

                                        // Trying to write the real type, if cannot write any exceptional type.
                                        if (types.length == 0) {
                                            propertyOptions["body"] = JSON.stringify(jsf.generate(property))

                                            const isWritable = await fetch(propertyURL.toString(), propertyOptions)
                                            if (isWritable.ok) report.propertyReports[i].isWritable(true)
                                        } else report.propertyReports[i].isWritable(true)
                                    }
                                } else
                                    report.propertyReports[i].addDescription(
                                        "TestBench could not find the credentials, neither from brute-forcing nor from given config file. Thus, could not test safety of property."
                                    )
                            } catch (e) {
                                throw "::::ERROR::::: Brute-forcing property resulted in error:" + e
                            }
                        } else {
                            // Property is 'writeonly'.
                            try {
                                // First tries to 'writeproperty', then tries to 'readproperty'.
                                const form = getForm("writeproperty", property.forms)

                                // Check if the interaction has a different security scheme.
                                if (form["security"] != undefined) {
                                    if (Array.isArray(form["security"])) {
                                        if (!form["security"].includes(schemeName)) throw "Testing multiple security schemes are not currently available."
                                    } else if (form["security"] != schemeName) throw "Testing multiple security schemes are not currently available."
                                }

                                const propertyURL: URL = new URL(form["href"])

                                // Checking to see if any binding other than http(s) is used.
                                if (!propertyURL.toString().startsWith("http")) {
                                    report.propertyReports[i].addDescription(
                                        "Currently only HTTP(s) bindings are supported. Thus, property could not be tested."
                                    )
                                    continue
                                }
                                // Extracting http(s) method, if exists.
                                let method: string = form["htv:methodName"]

                                // Default method for 'writeproperty'
                                if (method == null) method = "PUT"

                                // Creating the needed request options object and filling it.
                                const propertyOptions: object = createRequestOptions(propertyURL, method)
                                let contentType: string = form["contentType"]

                                // Default value of 'contentType'.
                                if (contentType == undefined) contentType = "application/json"

                                propertyOptions["headers"]["Content-Type"] = contentType
                                propertyOptions["body"] = JSON.stringify(jsf.generate(property))

                                const weakCredentials: boolean = await isPredictable(propertyURL, propertyOptions, location)
                                const creds: string = getCredentials()

                                if (weakCredentials || creds != null) {
                                    // Have credentials.
                                    report.propertyReports[i].security.passedDictionaryAttack = !weakCredentials
                                    report.propertyReports[i].createSafetyReport()

                                    if (!weakCredentials) {
                                        // Credentials provided via config file.
                                        propertyOptions["headers"]["Authorization"] = "Basic " + creds

                                        // Trying to 'writeproperty' with the provided credentials.
                                        const isWritable = await fetch(propertyURL.toString(), propertyOptions)
                                        if (isWritable.ok) report.propertyReports[i].isWritable(true)

                                        report.propertyReports[i].addDescription("Not weak username-password")
                                    } else {
                                        // The case where dictionary attack found out the username and password.
                                        report.propertyReports[i].addDescription("Weak username-password")
                                        report.propertyReports[i].isWritable(true)
                                        report.propertyReports[i].addCredentials(username, password)
                                    }
                                    // Types that should not be normally allowed.
                                    const types: string[] = await typeFuzz(property.type, propertyURL, propertyOptions)
                                    types.forEach((type) => report.propertyReports[i].addType(type))

                                    // Trying to 'readproperty'
                                    propertyOptions["method"] = "GET"
                                    delete propertyOptions["body"]

                                    const isReadable: any = await fetch(propertyURL.toString(), propertyOptions)
                                    if (isReadable.ok) report.propertyReports[i].isReadable(true)
                                } else
                                    report.propertyReports[i].addDescription(
                                        "TestBench could not find the credentials, neither from brute-forcing nor from given config file. Thus, could not test safety of property."
                                    )
                            } catch (e) {
                                throw "::::ERROR::::: Brute-forcing property resulted in error:" + e
                            }
                        }
                    }
                }
                if (td["actions"] != undefined) {
                    const actions: Array<any> = Object.values(td["actions"])

                    for (let i = 0; i < actions.length; i++) {
                        const action: any = actions[i]

                        // Create action report with the name of the action.
                        report.createVulnActionReport(Object.keys(td["actions"])[i])
                        report.actionReports[i].createSecurityReport()

                        const form = getForm("invokeaction", action.forms) // Cannot be null.

                        // Check if the interaction has a different security scheme.
                        if (form["security"] != undefined) {
                            if (Array.isArray(form["security"])) {
                                if (!form["security"].includes(schemeName)) throw "Testing multiple security schemes are not currently available."
                            } else if (form["security"] != schemeName) throw "Testing multiple security schemes are not currently available."
                        }

                        const myURL: URL = new URL(form["href"])

                        if (!myURL.toString().startsWith("http")) {
                            report.actionReports[i].addDescription("Currently only HTTP(s) bindings are supported. Thus, action could not be tested.")
                            continue
                        }

                        // Extracting http(s) method, if exists.
                        let method: string = form["htv:methodName"]
                        // Default method for 'invokeaction'
                        if (method == undefined) method = "POST"

                        const actionOptions = createRequestOptions(myURL, method)

                        if (action.input != undefined)
                            // Fill body appropriately.
                            actionOptions["body"] = JSON.stringify(jsf.generate(action["input"]))

                        const weakCredentials: boolean = await isPredictable(myURL, actionOptions, location)
                        const creds: string = getCredentials()

                        if (weakCredentials || creds != null) {
                            // Have credentials.
                            report.actionReports[i].security.passedDictionaryAttack = !weakCredentials
                            report.actionReports[i].createSafetyReport()

                            if (!weakCredentials) {
                                // Credentials provided via config file.
                                actionOptions["headers"]["Authorization"] = "Basic " + creds
                                report.actionReports[i].addDescription("Not weak username-password")
                            } else {
                                // The case where dictionary attack found out the username and password.
                                report.actionReports[i].addDescription("Weak username-password")
                                report.actionReports[i].addCredentials(username, password)
                            }
                            // Types that should not be normally allowed.
                            let types: string[]
                            if (action.input != undefined) types = await typeFuzz(action.input.type, myURL, actionOptions)
                            else types = await typeFuzz(null, myURL, actionOptions)

                            types.forEach((type) => report.actionReports[i].addType(type))
                        } else
                            report.actionReports[i].addDescription(
                                "TestBench could not find the credentials, neither from brute-forcing nor from given config file. Thus, could not test safety of action."
                            )
                    }
                }
                break
            }
            case "oauth2": {
                const flow: string = td["securityDefinitions"][schemeName].flow as string // Authorization flow.
                const params: URLSearchParams = new URLSearchParams() // Used to create the required body.

                report.scheme = "oauth2"

                switch (flow) {
                    case "client_credentials": {
                        // URL of the token server to be brute-forced.
                        const tokenURL: URL = new URL(td["securityDefinitions"][schemeName].token as string)

                        // Creating and filling the required body.
                        params.append("grant_type", "client_credentials")

                        let options = createRequestOptions(tokenURL, "POST")
                        options["body"] = params

                        const weakCredentials: boolean = await isPredictable(tokenURL, options)
                        const givenToken: string = getCredentials()

                        if (td["properties"] != undefined) {
                            // Properties exist.
                            const properties: Array<any> = Object.values(td["properties"])

                            for (let i = 0; i < properties.length; i++) {
                                const property: any = properties[i]
                                report.createVulnPropertyReport(Object.keys(td["properties"])[i])
                                report.propertyReports[i].createSecurityReport()

                                if (!property.writeOnly) {
                                    // Can be read?

                                    if (weakCredentials || givenToken != null) {
                                        // Have a token.
                                        report.propertyReports[i].security.passedDictionaryAttack = !weakCredentials

                                        report.propertyReports[i].createSafetyReport()

                                        let form = getForm("readproperty", property.forms)
                                        let myURL: URL = new URL(form["href"])

                                        if (!myURL.toString().startsWith("http")) {
                                            report.propertyReports[i].addDescription(
                                                "Currently only HTTP(s) bindings are supported. Thus, property could not be tested."
                                            )
                                            continue
                                        }

                                        let method: string = form["htv:methodName"]
                                        if (method == undefined) method = "GET" // Default method for 'readproperty'.

                                        options = createRequestOptions(myURL, method)

                                        if (!weakCredentials) {
                                            // Token provided via config file.
                                            options["headers"]["Authorization"] = "Bearer " + givenToken
                                            report.propertyReports[i].addDescription("Not weak username-password on token server.")
                                        } else {
                                            // The case where dictionary attack found out the username and password.
                                            options["headers"]["Authorization"] = "Bearer " + token
                                            report.propertyReports[i].addDescription("Weak username-password pair on token server.")
                                            report.propertyReports[i].addCredentials(username, password)
                                        }

                                        // Should test for readability.
                                        const isReadable: any = await fetch(myURL.toString(), options)
                                        if (isReadable.ok) report.propertyReports[i].isReadable(true)

                                        // Trying to 'writeproperty'.
                                        form = getForm("writeproperty", property.forms)

                                        if (form != null) {
                                            // 'form' can be null in case the property is readOnly.
                                            myURL = new URL(form["href"])

                                            if (!myURL.toString().startsWith("http")) {
                                                report.propertyReports[i].addDescription(
                                                    "Currently only HTTP(s) bindings are supported. Thus, write tests for the property could not be conducted."
                                                )
                                                continue
                                            }

                                            method = form["htv:methodName"]
                                            if (method == undefined) method = "PUT" // Default method for 'writeproperty'.

                                            options = createRequestOptions(myURL, method)

                                            let contentType: string = form["contentType"]
                                            if (contentType == undefined) contentType = "application/json" // Default value for 'contentType'

                                            options["headers"]["Content-Type"] = contentType

                                            // Placing token (either directly provided or accessed by performing dictionary attacks) to see
                                            // if the property can be 'written'.

                                            if (!weakCredentials) options["headers"]["Authorization"] = "Bearer " + givenToken
                                            else options["headers"]["Authorization"] = "Bearer " + token

                                            // Filling the body of the request appropriately.
                                            options["body"] = JSON.stringify(jsf.generate(property))

                                            const isWritable = await fetch(myURL.toString(), options)
                                            if (isWritable.ok) report.propertyReports[i].isWritable(true)

                                            // Types that should not be normally allowed.
                                            const types: Array<string> = await typeFuzz(property.type, myURL, options)
                                            types.forEach((type) => report.propertyReports[i].addType(type))
                                        }
                                    } else
                                        report.propertyReports[i].addDescription(
                                            "TestBench could not get a suitable token, neither from brute-forcing nor from given config file. Thus, could not test safety of property."
                                        )
                                } else {
                                    // Property is 'writeonly'.
                                    // First tries to 'writeproperty' with the native type of the property, and then tries to 'write' other types.
                                    // Finally, tries to 'readproperty'.

                                    if (weakCredentials || givenToken != null) {
                                        // Have a token.
                                        report.propertyReports[i].security.passedDictionaryAttack = !weakCredentials

                                        report.propertyReports[i].createSafetyReport()

                                        const form = getForm("writeproperty", property.forms)
                                        const myURL: URL = new URL(form["href"])

                                        if (!myURL.toString().startsWith("http")) {
                                            report.propertyReports[i].addDescription(
                                                "Currently only HTTP(s) bindings are supported. Thus, property could not be tested."
                                            )
                                            continue
                                        }

                                        let method: string = form["htv:methodName"]
                                        if (method == null) method = "PUT" // Default method for 'writeproperty'.

                                        options = createRequestOptions(myURL, method)

                                        let contentType: string = form["contentType"]
                                        if (contentType == undefined) contentType = "application/json" // Default value for 'contentType'.

                                        options["headers"]["Content-Type"] = contentType

                                        if (!weakCredentials) {
                                            // Token provided via config file.
                                            options["headers"]["Authorization"] = "Bearer " + givenToken
                                            report.propertyReports[i].addDescription("Not weak username-password on token server")
                                        } else {
                                            // The case where dictionary attack found out the username and password.
                                            options["headers"]["Authorization"] = "Bearer " + token
                                            report.propertyReports[i].addDescription("Weak username-password pair on token server.")
                                            report.propertyReports[i].addCredentials(username, password)
                                        }

                                        options["body"] = JSON.stringify(jsf.generate(property))

                                        const isWritable: any = await fetch(myURL.toString(), options)
                                        if (isWritable.ok) report.propertyReports[i].isWritable(true)

                                        // Types that should not be normally allowed.
                                        const types: Array<string> = await typeFuzz(property.type, myURL, options)
                                        types.forEach((type) => report.propertyReports[i].addType(type))

                                        // Tries to 'readproperty', which should not be normally allowed.
                                        options["method"] = "GET"
                                        delete options["body"]

                                        const isReadable: any = await fetch(myURL.toString(), options)
                                        if (isReadable.ok) report.propertyReports[i].isReadable(true)
                                    } else
                                        report.propertyReports[i].addDescription(
                                            "TestBench could not get a suitable token, neither from brute-forcing nor from given config file. Thus, could not test safety of property."
                                        )
                                }
                            }
                        }
                        if (td["actions"] != undefined) {
                            const actions: Array<any> = Object.values(td["actions"])

                            for (let i = 0; i < actions.length; i++) {
                                const action: any = actions[i]

                                report.createVulnActionReport(Object.keys(td["actions"])[i])
                                report.actionReports[i].createSecurityReport()

                                if (weakCredentials || givenToken != null) {
                                    // Have a token.
                                    report.actionReports[i].security.passedDictionaryAttack = !weakCredentials

                                    report.actionReports[i].createSafetyReport()

                                    const form = getForm("invokeaction", action.forms)
                                    const myURL: URL = new URL(form["href"])

                                    if (!myURL.toString().startsWith("http")) {
                                        report.actionReports[i].addDescription(
                                            "Currently only HTTP(s) bindings are supported. Thus, action could not be tested."
                                        )
                                        continue
                                    }

                                    let method: string = form["htv:methodName"]
                                    if (method == undefined) method = "POST" // Default method for 'invokeaction'.

                                    options = createRequestOptions(myURL, method)

                                    if (!weakCredentials) {
                                        // Token provided via config file.
                                        options["headers"]["Authorization"] = "Bearer " + givenToken
                                        report.actionReports[i].addDescription("Strong username-password on token server.")
                                    } else {
                                        // The case where dictionary attack found out the username and password.
                                        options["headers"]["Authorization"] = "Bearer " + token
                                        report.actionReports[i].addDescription("Weak username-password pair on token server.")
                                        report.actionReports[i].addCredentials(username, password)
                                    }
                                    // Types that should not be normally allowed.
                                    let types: string[]
                                    if (action.input != undefined) types = await typeFuzz(action.input.type, myURL, options)
                                    else types = await typeFuzz(null, myURL, options)

                                    types.forEach((type) => report.actionReports[i].addType(type))
                                } else
                                    report.actionReports[i].addDescription(
                                        "TestBench could not get a suitable token, neither from brute-forcing nor from given config file. Thus, could not test safety of action."
                                    )
                            }
                        }
                        break
                    }
                    default:
                        throw "This oauth flow cannot be tested for now."
                }
                break
            }
            case "nosec":
                report.scheme = "nosec"

                if (td["properties"] != undefined) {
                    const properties: any = Object.values(td["properties"])

                    for (let i = 0; i < properties.length; i++) {
                        const property: any = properties[i]

                        // Creating propertyReport with the name of the property.
                        report.createVulnPropertyReport(Object.keys(td["properties"])[i])

                        if (!property.writeOnly) {
                            // Property can be read, supposedly?
                            try {
                                // First tries to 'readproperty'.
                                let form = getForm("readproperty", property.forms)

                                // Check if the interaction has a different security scheme.
                                if (form["security"] != undefined) {
                                    if (Array.isArray(form["security"])) {
                                        if (!form["security"].includes(schemeName)) throw "Testing multiple security schemes are not currently available."
                                    } else if (form["security"] != schemeName) throw "Testing multiple security schemes are not currently available."
                                }

                                let propertyURL: URL = new URL(form["href"])

                                if (!propertyURL.toString().startsWith("http")) {
                                    report.propertyReports[i].addDescription(
                                        "Currently only HTTP(s) bindings are supported. Thus, property could not be tested."
                                    )
                                    continue
                                }

                                let method: string = form["htv:methodName"]

                                if (method == null) method = "GET" // Default method for 'readproperty'.

                                let propertyOptions: object = createRequestOptions(propertyURL, method)
                                report.propertyReports[i].createSafetyReport()

                                // Making sure that the property is readable.
                                const isReadable: any = await fetch(propertyURL.toString(), propertyOptions)
                                if (isReadable.ok) report.propertyReports[i].isReadable(true)

                                // Trying to 'writeproperty' with different types.
                                form = getForm("writeproperty", property.forms)

                                // This time 'form' can be null in case 'property' is 'readOnly'.
                                if (form != null) {
                                    propertyURL = new URL(form["href"])

                                    if (!propertyURL.toString().startsWith("http")) {
                                        report.propertyReports[i].addDescription(
                                            "Currently only HTTP(s) bindings are supported. Thus, write tests for the property could not be conducted."
                                        )
                                        continue
                                    }

                                    method = form["htv:methodName"]

                                    if (method == null) method = "PUT" // Default method for 'writeproperty'.

                                    propertyOptions = createRequestOptions(propertyURL, method)

                                    let contentType: string = form["contentType"]

                                    if (contentType == undefined) contentType = "application/json" // Default value for 'contentType'.
                                    propertyOptions["headers"]["Content-Type"] = contentType

                                    // Types that should not be normally allowed.
                                    const types: string[] = await typeFuzz(property.type, propertyURL, propertyOptions)
                                    types.forEach((type) => report.propertyReports[i].addType(type))

                                    // Trying to write the defined type, if cannot write any exceptional type.
                                    if (types.length == 0) {
                                        propertyOptions["body"] = JSON.stringify(jsf.generate(property))

                                        const isWritable = await fetch(propertyURL.toString(), propertyOptions)
                                        if (isWritable.ok) report.propertyReports[i].isWritable(true)
                                    } else report.propertyReports[i].isWritable(true)
                                }
                            } catch (e) {
                                throw "Safety tests for nosec resulted in error:" + e
                            }
                        } else {
                            // Property is 'writeonly'.
                            try {
                                // First tries to 'writeproperty', then tries to 'readproperty'.
                                const form = getForm("writeproperty", property.forms)

                                // Check if the interaction has a different security scheme.
                                if (form["security"] != undefined) {
                                    if (Array.isArray(form["security"])) {
                                        if (!form["security"].includes(schemeName)) throw "Testing multiple security schemes are not currently available."
                                    } else if (form["security"] != schemeName) throw "Testing multiple security schemes are not currently available."
                                }

                                const propertyURL: URL = new URL(form["href"])

                                if (!propertyURL.toString().startsWith("http")) {
                                    report.propertyReports[i].addDescription(
                                        "Currently only HTTP(s) bindings are supported. Thus, property could not be tested."
                                    )
                                    continue
                                }

                                let method: string = form["htv:methodName"]

                                if (method == null) method = "PUT" // Default method for 'writeproperty'.

                                const propertyOptions: object = createRequestOptions(propertyURL, method)
                                let contentType: string = form["contentType"]

                                if (contentType == undefined) contentType = "application/json" // Default value for 'contentType'.

                                propertyOptions["headers"]["Content-Type"] = contentType
                                propertyOptions["body"] = JSON.stringify(jsf.generate(property))

                                report.propertyReports[i].createSafetyReport()

                                // propertyOptions['headers']['Authorization'] = 'Basic ' + creds;

                                //Trying to see if the property is, really, 'writable'.
                                const isWritable = await fetch(propertyURL.toString(), propertyOptions)
                                if (isWritable.ok) report.propertyReports[i].isWritable(true)

                                // Types that should not be normally allowed.
                                const types: string[] = await typeFuzz(property.type, propertyURL, propertyOptions)
                                types.forEach((type) => report.propertyReports[i].addType(type))

                                // Trying to see if the property can be read, which should not optimally be the case.
                                propertyOptions["method"] = "GET"
                                delete propertyOptions["body"]

                                const isReadable: any = await fetch(propertyURL.toString(), propertyOptions)
                                if (isReadable.ok) report.propertyReports[i].isReadable(true)
                            } catch (e) {
                                throw "Safety tests for nosec resulted in error:" + e
                            }
                        }
                    }
                }
                if (td["actions"] != undefined) {
                    const actions: Array<any> = Object.values(td["actions"])

                    for (let i = 0; i < actions.length; i++) {
                        const action: any = actions[i]

                        const form = getForm("invokeaction", action.forms) // Cannot be null.

                        // Check if the interaction has a different security scheme.
                        if (form["security"] != undefined) {
                            if (Array.isArray(form["security"])) {
                                if (!form["security"].includes(schemeName)) throw "Testing multiple security schemes are not currently available."
                            } else if (form["security"] != schemeName) throw "Testing multiple security schemes are not currently available."
                        }

                        const myURL: URL = new URL(form["href"])

                        if (!myURL.toString().startsWith("http")) {
                            report.actionReports[i].addDescription("Currently only HTTP(s) bindings are supported. Thus, action could not be tested.")
                            continue
                        }

                        let method: string = form["htv:methodName"]
                        if (method == undefined) method = "POST" // Default value for 'invokeaction'.

                        // Create action report with the name of the action.
                        report.createVulnActionReport(Object.keys(td["actions"])[i])

                        const actionOptions = createRequestOptions(myURL, method)

                        if (action.input != undefined)
                            // Fill body appropriately.
                            actionOptions["body"] = JSON.stringify(jsf.generate(action["input"]))

                        report.actionReports[i].createSafetyReport()

                        // Types that should not be normally allowed.
                        let types: string[]
                        if (action.input != undefined) types = await typeFuzz(action.input.type, myURL, actionOptions)
                        else types = await typeFuzz(null, myURL, actionOptions)

                        types.forEach((type) => report.actionReports[i].addType(type))
                    }
                }
        }
        return report
    }

    /**
     * This function starts the testing on the Operation Level. This means it tests all Interaction Affordances and every defined form of each Interaction Affordance.
     */
    public async testingOpCov(): Promise<any> {
        const Full_Report: any = []
        const rep = 1

        try {
            const property = this.tutTd.properties
            for (const prop in property) {
                const interaction: any = Utils.getInteractionByName(this.tutTd, Utils.InteractionType.Property, prop)
                const isWritable = !interaction.readOnly
                const isReadable = !interaction.writeOnly
                for (let i = 0; i < rep; i++) {
                    this.log(`* Repetition ${i}`)
                    for (const index in property[prop].forms) {
                        this.log(`** Testing ${prop}`)
                        const number_index = parseInt(index, 10)
                        if (isWritable) {
                            const value = Utils.createValidInput(property[prop])
                            try {
                                await this.tut.writeProperty(prop, value, { formIndex: number_index })
                                const result = "OP level writeProperty Success"
                                Full_Report.push(Utils.createMiniReport(result, Utils.InteractionType.WriteProperty, prop, true, value))
                                await Utils.sleepInMs(this.testConfig.TimeBetweenRequests)
                            } catch (error) {
                                Full_Report.push(Utils.createMiniReport(error, Utils.InteractionType.WriteProperty, prop, false, value))
                                console.log(error)
                            }
                        }
                        if (isReadable) {
                            try {
                                const data = await this.tut.readProperty(prop, { formIndex: number_index })
                                const result = "OP level readProperty Success"
                                Full_Report.push(Utils.createMiniReport(result, Utils.InteractionType.ReadProperty, prop, true, undefined, data))
                                await Utils.sleepInMs(this.testConfig.TimeBetweenRequests)
                            } catch (error) {
                                Full_Report.push(Utils.createMiniReport(error, Utils.InteractionType.ReadProperty, prop, false, undefined))
                                console.log(error)
                            }
                        }
                    }
                }
            }

            const actions = this.tutTd.actions

            for (const act in actions) {
                const interaction: any = Utils.getInteractionByName(this.tutTd, Utils.InteractionType.Action, act)
                const hasInput = interaction.input
                for (let i = 0; i < rep; i++) {
                    // not sure if return_value is the actual output of the request and even part of operational coverage ?
                    if (hasInput) {
                        const requests = Utils.createValidInput(actions[act].input)
                        try {
                            const return_value: any = await this.tut.invokeAction(act, requests)
                            const result = "OP level invokeAction with payload Success"
                            Full_Report.push(Utils.createMiniReport(result, Utils.InteractionType.Action, act, true, requests, return_value))
                            await Utils.sleepInMs(this.testConfig.TimeBetweenRequests)
                        } catch (error) {
                            console.log(error)
                            Full_Report.push(Utils.createMiniReport(error, Utils.InteractionType.Action, act, false, requests, undefined))
                        }
                    } else {
                        try {
                            const return_value: any = await this.tut.invokeAction(act)
                            const result = "OP level invokeAction without payload Success"
                            Full_Report.push(Utils.createMiniReport(result, Utils.InteractionType.Action, act, true, undefined, return_value))
                            await Utils.sleepInMs(this.testConfig.TimeBetweenRequests)
                        } catch (error) {
                            console.log(error)
                            Full_Report.push(Utils.createMiniReport(error, Utils.InteractionType.Action, act, false, undefined))
                        }
                    }
                }
            }
        } catch (error) {
            this.log("Testing Operation Coverage has finished with an error (see previous messages).")
            throw Error
        }

        try {
            const events = this.tutTd.events

            if (Object.keys(events).length != 0) {
                for (const eve in events) {
                    const container: EventTestReportContainer = new EventTestReportContainer(1, 1, eve)
                    const status = await this.testObserveOrEvent(container, events[eve], Utils.InteractionType.Event, 2)

                    if (status == 0) {
                        const result = "OP level Event reached timeout"
                        Full_Report.push(Utils.createMiniReport(result, Utils.InteractionType.Event, eve, true, undefined))
                    }
                    if (status == 1) {
                        const result = "OP level Event error"
                        Full_Report.push(Utils.createMiniReport(result, Utils.InteractionType.Event, eve, true, undefined))
                    }
                    if (status == 2) {
                        const result = "OP level Event was successful"
                        Full_Report.push(Utils.createMiniReport(result, Utils.InteractionType.Event, eve, true, undefined))
                    }
                }
            } else {
                this.log("No Events described in TD")
            }
        } catch (error) {
            this.log("Testing Events has finished with an error")
            throw Error
        }
        //testing observable properties
        try {
            const properties = this.tutTd.properties
            for (const prop in properties) {
                const interaction: any = Utils.getInteractionByName(this.tutTd, Utils.InteractionType.Property, prop)
                const observable = interaction.observable
                if (observable) {
                    console.log(prop)
                }
            }
        } catch (error) {
            this.log("Testing observable properties has finished with an error")
            throw Error
        }

        this.log("Operation Test Phase has finished without an error.")
        return Full_Report
    }

    /**
     * This function starts the testing on the Parameter Level. This means it tests all Interaction Affordances with input paramerters and creates requests
     * including all necessary parameters.
     */
    public async testingParamCov(): Promise<any> {
        const Full_Report: any = []

        try {
            const properties = this.tutTd.properties
            for (const prop in properties) {
                const interaction: any = Utils.getInteractionByName(this.tutTd, Utils.InteractionType.Property, prop)
                const isWritable = !interaction.readOnly
                if (isWritable) {
                    const value = Utils.createValidInput(properties[prop])
                    try {
                        await this.tut.writeProperty(prop, value)
                        const result = "Parameter level writeProperty Success"
                        Full_Report.push(Utils.createMiniReport(result, Utils.InteractionType.WriteProperty, prop, true, value))
                        await Utils.sleepInMs(this.testConfig.TimeBetweenRequests)
                    } catch (error) {
                        Full_Report.push(Utils.createMiniReport(error, Utils.InteractionType.WriteProperty, prop, false, value))
                        console.log(error)
                    }
                }
            }

            const actions = this.tutTd.actions

            for (const act in actions) {
                const interaction: any = Utils.getInteractionByName(this.tutTd, Utils.InteractionType.Action, act)
                const hasInput = interaction.input

                if (hasInput) {
                    const requests = Utils.createValidInput(actions[act].input)
                    try {
                        const return_value: any = await this.tut.invokeAction(act, requests)
                        const result = "Parameter level invokeAction Success"
                        Full_Report.push(Utils.createMiniReport(result, Utils.InteractionType.Action, act, true, requests, return_value))
                        await Utils.sleepInMs(this.testConfig.TimeBetweenRequests)
                    } catch (error) {
                        Full_Report.push(Utils.createMiniReport(error, Utils.InteractionType.Action, act, false, requests))
                        console.log(error)
                    }
                }
            }
        } catch (error) {
            this.log("Testing Parameter Coverage has finished with an error (see previous messages).")
            throw Error
        }
        this.log("Parameter Test Phase has finished without an error.")
        return Full_Report
    }

    /**
     * This function starts the testing on the Input Level. It sends the created test data to all Interaction Affordances with an input and records
     * the resopnse of the SuT.
     */
    public async testingInputCov(testReport): Promise<any> {
        const full_T3_report = testReport

        try {
            const properties = this.tutTd.properties

            for (const prop in properties) {
                const interaction: any = Utils.getInteractionByName(this.tutTd, Utils.InteractionType.Property, prop)
                const isWritable = !interaction.readOnly
                const isReadable = !interaction.writeOnly
                if (isWritable) {
                    for (const [key, value] of Object.entries(full_T3_report[prop])) {
                        for (const [key1, value1] of Object.entries(value)) {
                            // send data to SUT and evaluate response
                            try {
                                await this.tut.writeProperty(prop, value1.payload)
                                let result = "Input level writeProperty Success"
                                full_T3_report[prop][key][key1].time = Utils.getCurrentTime()
                                await Utils.sleepInMs(this.testConfig.TimeBetweenRequests)
                                if (isReadable) {
                                    //read property and check if it is the same as the writen value before
                                    const readValue: any = await this.tut.readProperty(prop)
                                    if (JSON.stringify(readValue) == JSON.stringify(value1.payload)) {
                                        result = "Input level read/writeProperty Success : Read value the same as Write value"
                                        full_T3_report[prop][key][key1].passed = true
                                        full_T3_report[prop][key][key1].result = result
                                    } else {
                                        result = "Input level read/writeProperty Fail : Read value not the same as Write value"
                                        full_T3_report[prop][key][key1].passed = false
                                        full_T3_report[prop][key][key1].result = result
                                    }
                                    await Utils.sleepInMs(this.testConfig.TimeBetweenRequests)
                                } else {
                                    full_T3_report[prop][key][key1].passed = true
                                    full_T3_report[prop][key][key1].result = result
                                }
                            } catch (error) {
                                full_T3_report[prop][key][key1].passed = false
                                full_T3_report[prop][key][key1].result = error
                                console.log(error)
                            }
                        }
                    }
                }
            }

            const actions = this.tutTd.actions

            for (const act in actions) {
                const interaction: any = Utils.getInteractionByName(this.tutTd, Utils.InteractionType.Action, act)
                const hasInput = interaction.input
                if (hasInput) {
                    for (const [key, value] of Object.entries(full_T3_report[act])) {
                        for (const [key1, value1] of Object.entries(value)) {
                            try {
                                const return_value: any = await this.tut.invokeAction(act, value1.payload)
                                const result = "Input level invokeAction Success"
                                full_T3_report[act][key][key1].passed = true
                                full_T3_report[act][key][key1].result = result
                                full_T3_report[act][key][key1].response = return_value
                                await Utils.sleepInMs(this.testConfig.TimeBetweenRequests)
                            } catch (error) {
                                full_T3_report[act][key][key1].passed = false
                                full_T3_report[act][key][key1].result = error
                                console.log(error)
                            }
                        }
                    }
                }
            }
        } catch {
            this.log("Testing Input Coverage has finished with an error (see previous messages).")
            throw Error
        }
        this.log("Input Test Phase has finished without an error.")
        return full_T3_report
    }

    /**
     * This function starts the testing on the Output Level. It inspects all Interaction Affordances and checks if the given output or lack there of
     * corresponds to the underlying Thing Description. It also validates received output against the TD.
     */

    public async testingOutputCov(): Promise<any> {
        const Full_Report: any = []

        try {
            //test all Properties and Actions
            const properties = this.tutTd.properties
            for (const prop in properties) {
                const interaction: any = Utils.getInteractionByName(this.tutTd, Utils.InteractionType.Property, prop)
                const isWritable = !interaction.readOnly
                const isReadable = !interaction.writeOnly
                if (isWritable) {
                    const value = Utils.createValidInput(properties[prop])
                    try {
                        const return_value: any = await this.tut.writeProperty(prop, value)
                        let result = "Output level writeProperty Success : No Output detected"
                        if (return_value == undefined) {
                            Full_Report.push(Utils.createMiniReport(result, Utils.InteractionType.WriteProperty, prop, true, value))
                        } else {
                            // TODO: Solve this -> IMPORTANT ---> This does not wotk right now bc writeproperty does not return anything ever (node-wot problem ?)
                            result = "Output level writeProperty Fail : Request returns a payload"
                        }
                        await Utils.sleepInMs(this.testConfig.TimeBetweenRequests)
                    } catch (error) {
                        Full_Report.push(Utils.createMiniReport(error, Utils.InteractionType.WriteProperty, prop, false, value))
                        console.log(error)
                    }
                }
                if (isReadable) {
                    try {
                        const return_value: any = await this.tut.readProperty(prop)
                        const validation = Utils.validateResponse(prop, return_value, this.testConfig.SchemaLocation, Utils.SchemaType.Property)
                        let result = "Output level readProperty Fail : Output received and invalid"
                        if (validation) {
                            Full_Report.push(Utils.createMiniReport(result, Utils.InteractionType.ReadProperty, prop, false, undefined, return_value))
                        } else {
                            result = "Output level readProperty Success : Output received and valid"
                            Full_Report.push(Utils.createMiniReport(result, Utils.InteractionType.ReadProperty, prop, true, undefined, return_value))
                        }
                        await Utils.sleepInMs(this.testConfig.TimeBetweenRequests)
                    } catch (error) {
                        Full_Report.push(Utils.createMiniReport(error, Utils.InteractionType.ReadProperty, prop, false, undefined))
                        console.log(error)
                    }
                }
            }

            const actions = this.tutTd.actions

            for (const act in actions) {
                const interaction: any = Utils.getInteractionByName(this.tutTd, Utils.InteractionType.Action, act)
                const hasInput = interaction.input

                if (hasInput) {
                    const requests = Utils.createValidInput(actions[act].input)
                    try {
                        const return_value: any = await this.tut.invokeAction(act, requests)
                        if (!Object.prototype.hasOwnProperty.call(interaction, "output")) {
                            let result = "Output level invokeAction with payload Success : No Output defined and no Output received"
                            if (return_value == undefined) {
                                Full_Report.push(Utils.createMiniReport(result, Utils.InteractionType.Action, act, true, requests))
                            } else {
                                result = "Output level invokeAction with payload Fail : No Output defined but Output received"
                                Full_Report.push(Utils.createMiniReport(result, Utils.InteractionType.Action, act, false, requests, return_value))
                            }
                        } else {
                            // requests with output defined -> check if output is valid
                            const validation = Utils.validateResponse(act, return_value, this.testConfig.SchemaLocation, Utils.SchemaType.Action)
                            let result = "Output level invokeAction with payload Fail : Output received and invalid"
                            if (validation) {
                                Full_Report.push(Utils.createMiniReport(result, Utils.InteractionType.Action, act, false, requests, return_value))
                            } else {
                                result = "Output level invokeAction with payload Success : Output received and valid"
                                Full_Report.push(Utils.createMiniReport(result, Utils.InteractionType.Action, act, true, requests, return_value))
                            }
                        }
                        await Utils.sleepInMs(this.testConfig.TimeBetweenRequests)
                    } catch (error) {
                        console.log(error)
                        Full_Report.push(Utils.createMiniReport(error, Utils.InteractionType.Action, act, false, requests, undefined))
                    }
                } else {
                    try {
                        const return_value: any = await this.tut.invokeAction(act)
                        if (!Object.prototype.hasOwnProperty.call(interaction, "output")) {
                            let result = "Output level invokeAction without payload Success : No Output defined and no Output received"
                            if (return_value == undefined) {
                                Full_Report.push(Utils.createMiniReport(result, Utils.InteractionType.Action, act, true, undefined))
                            } else {
                                result = "Output level invokeAction without payload Fail : No Output defined but Output received"
                                Full_Report.push(Utils.createMiniReport(result, Utils.InteractionType.Action, act, false, undefined, return_value))
                            }
                        } else {
                            const validation = Utils.validateResponse(act, return_value, this.testConfig.SchemaLocation, Utils.SchemaType.Action)
                            let result = "Output level invokeAction without payload Fail : Output received and invalid"
                            if (validation) {
                                Full_Report.push(Utils.createMiniReport(result, Utils.InteractionType.Action, act, true, undefined, return_value))
                            } else {
                                result = "Output level invokeAction without payload Success : Output received and valid"
                                Full_Report.push(Utils.createMiniReport(result, Utils.InteractionType.Action, act, true, undefined, return_value))
                            }
                        }
                        await Utils.sleepInMs(this.testConfig.TimeBetweenRequests)
                    } catch (error) {
                        console.log(error)
                        Full_Report.push(Utils.createMiniReport(error, Utils.InteractionType.Action, act, false, undefined))
                    }
                }
            }
        } catch (error) {
            this.log("Testing Output Coverage has finished with an error (see previous messages).")
            throw Error
        }
        this.log("Output Test Phase has finished without an error.")
        return Full_Report
    }

    public async testingResult(testReport: any) {
        try {
            console.log("T1 : " + Utils.countResults(testReport.T1))
            console.log("T2 : " + Utils.countResults(testReport.T2))
            console.log("T3 : " + Utils.countResultsT3(testReport.T3))
            console.log("T4 : " + Utils.countResults(testReport.T4))
        } catch (error) {
            console.log(error)
        }
    }
}
