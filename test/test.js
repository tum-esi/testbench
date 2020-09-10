var chai = require("chai")
var chaiHttp = require("chai-http")
chai.use(chaiHttp)
const address_testbench = "localhost:8980"
var expect = chai.expect

/**
 * Returns a JSON object containing the TestResults from a chai send request result object.
 * @param {any} res The result of the chai send request.
 * @return {JSON} The JSON containing the TestResults.
 */
function getTestResult(res) {
    return res.body //Return TestResult as JSON.
}

/**
 * Returns a TestCycle object from a TestResult object by int.
 * @param {JSON} testResult The JSON object containing the TestResults.
 * @param {number} cycleInt The number defining the TestCycle.
 * @returns {JSON} The JSON object containing the TestCycle.
 */
function getTestCycleByInt(testResult, cycleInt) {
    //console.log(testResult[cycleInt])
    return testResult[cycleInt]
}

/**
 * Returns a TestScenario object from a TestCycle object by int.
 * @param {JSON} testCycle The JSON object containing the TestCycle.
 * @param {number} scenarioInt The number defining the TestScenario.
 * @returns {JSON} The JSON object containing the TestScenario.
 */
function getTestScenarioByInt(testCycle, scenarioInt) {
    return testCycle[scenarioInt]
}

/**
 * Returns a TestCase object from a TestScenario object by int.
 * @param {JSON} testScenario The JSON object containing the TestScenario.
 * @param {JSON} testCaseInt The JSON object containing the TestCase.
 * @return {JSON} The JSON object containing the TestCase.
 */
function getTestCaseByInt(testScenario, testCaseInt) {
    return testScenario[testCaseInt]
}

/**
 * Returns an array with all Test Cases in the given TestResult JSON object.
 * @param {JSON} jsonTestResult The TestResult JSON.
 * @return {[JSON]} The array containing all testCase JSON objects.
 */
function getAllTestCases(jsonTestResult) {
    const allTestCases = []
    jsonTestResult.forEach((testCycle) => {
        testCycle.forEach((testScenario) => {
            //Could potentially be solved more elegant by using allTestCases.concat(testScenario), but
            //then legacy loops would have to be used.
            testScenario.forEach((testCase) => {
                allTestCases.push(testCase)
            })
        })
    })
    return allTestCases
}

function getPassedFailedArray(allTestCases) {
    const passedFailedArray = []
    allTestCases.forEach((testCase) => {
        passedFailedArray.push(testCase.passed)
    })
    return passedFailedArray
}

/**
 * Returns a TestCase JSON object from a TestScenario by name.
 * @param {JSON} testScenario The JSON object containing the TestScenario.
 * @param {string} testCaseName The string containing the TestCase name.
 * @returns {JSON | null} The JSON object containing the TestCase or null if name was not found.
 */
function getTestCaseByName(testScenario, testCaseName) {
    for (var i = 0; i < testScenario.length; ++i) {
        if (testScenario[i] == testCaseName) {
            return testScenario[i]
        }
        return null
    }
}

/**
 * Returns all TestCase JSON objects with the given name from the given Array of TestCase JSON object.
 * @param {[JSON]} testCases The array of JSON objects containing the TestCases to check.
 * @param {string} testCaseName The string containing the TestCase name.
 * @returns An arry containing all the TestCase JSON objects with the given name. Array is empty
 * if no TestCase with the given name has been found.
 */
function getAllTestCasesWithName(testCases, testCaseName) {
    let AllTestCasesWithName = []
    testCaseName.forEach((testCase) => {
        if (testCase.name == testCaseName) {
            AllTestCasesWithName.push(testCase)
        }
    })
    return AllTestCasesWithName
}

/**
 * Returns true if all TestCases in the given array passed. Returns false otherwise.
 * @param {[JSON]} allTestCases The array containing all the TestCase JSON objects.
 * @returns {boolean} Returns true if all Tests passed. Returns false otherwise.
 */
function allTestPassed(allTestCases) {
    //If Array does not contain passed == false every test passed.
    return !allTestCases.some((testCase) => testCase.passed == false)
}

describe("Action: fastTest", function () {
    describe("Test faultyThing", function () {
        it("Fast Test", function (done) {
            this.timeout(20000)
            // Send some Form Data
            chai.request(address_testbench)
                .post("/wot-test-bench/actions/fastTest")
                .send({
                    title: "TestServient",
                    description: "Test servient that can be used as a servient to be tested with the WoT Test Bench",
                    properties: {
                        display: {
                            type: "string",
                            observable: true,
                            readOnly: false,
                            writeOnly: false,
                            forms: [
                                {
                                    href: "http://localhost:8083/TestServient/properties/display",
                                    contentType: "application/json",
                                    op: ["readproperty", "writeproperty"],
                                },
                                {
                                    href: "http://localhost:8083/TestServient/properties/display/observable",
                                    contentType: "application/json",
                                    op: ["observeproperty", "unobserveproperty"],
                                    subprotocol: "longpoll",
                                },
                                {
                                    href: "coap://localhost:8084/TestServient/properties/display",
                                    contentType: "application/json",
                                    op: ["readproperty", "writeproperty"],
                                },
                            ],
                        },
                        counter: {
                            type: "number",
                            observable: false,
                            readOnly: false,
                            writeOnly: false,
                            forms: [
                                {
                                    href: "http://localhost:8083/TestServient/properties/counter",
                                    contentType: "application/json",
                                    op: ["readproperty", "writeproperty"],
                                },
                                {
                                    href: "coap://localhost:8084/TestServient/properties/counter",
                                    contentType: "application/json",
                                    op: ["readproperty", "writeproperty"],
                                },
                            ],
                        },
                        temperature: {
                            type: "number",
                            observable: false,
                            readOnly: true,
                            writeOnly: false,
                            forms: [
                                {
                                    href: "http://localhost:8083/TestServient/properties/temperature",
                                    contentType: "application/json",
                                    op: ["readproperty", "writeproperty"],
                                },
                                {
                                    href: "coap://localhost:8084/TestServient/properties/temperature",
                                    contentType: "application/json",
                                    op: ["readproperty", "writeproperty"],
                                },
                            ],
                        },
                        faultyPercent: {
                            type: "number",
                            minimum: 0.0,
                            maximum: 100.0,
                            observable: true,
                            readOnly: true,
                            writeOnly: false,
                            forms: [
                                {
                                    href: "http://localhost:8083/TestServient/properties/faultyPercent",
                                    contentType: "application/json",
                                    op: ["readproperty", "writeproperty"],
                                },
                                {
                                    href: "http://localhost:8083/TestServient/properties/faultyPercent/observable",
                                    contentType: "application/json",
                                    op: ["observeproperty", "unobserveproperty"],
                                    subprotocol: "longpoll",
                                },
                                {
                                    href: "coap://localhost:8084/TestServient/properties/faultyPercent",
                                    contentType: "application/json",
                                    op: ["readproperty", "writeproperty"],
                                },
                            ],
                        },
                        wrongWritable: {
                            description: "property that says writable but isn't",
                            type: "number",
                            observable: false,
                            readOnly: false,
                            writeOnly: false,
                            forms: [
                                {
                                    href: "http://localhost:8083/TestServient/properties/wrongWritable",
                                    contentType: "application/json",
                                    op: ["readproperty", "writeproperty"],
                                },
                                {
                                    href: "coap://localhost:8084/TestServient/properties/wrongWritable",
                                    contentType: "application/json",
                                    op: ["readproperty", "writeproperty"],
                                },
                            ],
                        },
                        wrongDataTypeNumber: {
                            description: "property that returns a different data type than the one described",
                            type: "number",
                            readOnly: true,
                            observable: false,
                            writeOnly: false,
                            forms: [
                                {
                                    href: "http://localhost:8083/TestServient/properties/wrongDataTypeNumber",
                                    contentType: "application/json",
                                    op: ["readproperty"],
                                    "htv:methodName": "GET",
                                },
                                {
                                    href: "coap://localhost:8084/TestServient/properties/wrongDataTypeNumber",
                                    contentType: "application/json",
                                    op: ["readproperty"],
                                },
                            ],
                        },
                        wrongDataTypeObject: {
                            description: "property that doesn't return a key that is required",
                            type: "object",
                            properties: {
                                brightness: {
                                    type: "number",
                                    minimum: 0,
                                    maximum: 100,
                                },
                                status: {
                                    type: "string",
                                },
                            },
                            required: ["brightness", "status"],
                            readOnly: false,
                            writeOnly: false,
                            observable: false,
                            forms: [
                                {
                                    href: "http://localhost:8083/TestServient/properties/wrongDataTypeObject",
                                    contentType: "application/json",
                                    op: ["readproperty", "writeproperty"],
                                },
                                {
                                    href: "coap://localhost:8084/TestServient/properties/wrongDataTypeObject",
                                    contentType: "application/json",
                                    op: ["readproperty", "writeproperty"],
                                },
                            ],
                        },
                        testArray: {
                            type: "array",
                            items: {
                                type: "number",
                            },
                            readOnly: false,
                            writeOnly: false,
                            observable: false,
                            forms: [
                                {
                                    href: "http://localhost:8083/TestServient/properties/testArray",
                                    contentType: "application/json",
                                    op: ["readproperty", "writeproperty"],
                                },
                                {
                                    href: "coap://localhost:8084/TestServient/properties/testArray",
                                    contentType: "application/json",
                                    op: ["readproperty", "writeproperty"],
                                },
                            ],
                        },
                    },
                    actions: {
                        setCounter: {
                            input: {
                                type: "number",
                            },
                            forms: [
                                {
                                    href: "http://localhost:8083/TestServient/actions/setCounter",
                                    contentType: "application/json",
                                    op: ["invokeaction"],
                                    "htv:methodName": "POST",
                                },
                                {
                                    href: "coap://localhost:8084/TestServient/actions/setCounter",
                                    contentType: "application/json",
                                    op: "invokeaction",
                                },
                            ],
                            idempotent: false,
                            safe: false,
                        },
                        getTemperature: {
                            output: {
                                type: "number",
                            },
                            forms: [
                                {
                                    href: "http://localhost:8083/TestServient/actions/getTemperature",
                                    contentType: "application/json",
                                    op: ["invokeaction"],
                                    "htv:methodName": "POST",
                                },
                                {
                                    href: "coap://localhost:8084/TestServient/actions/getTemperature",
                                    contentType: "application/json",
                                    op: "invokeaction",
                                },
                            ],
                            idempotent: false,
                            safe: false,
                        },
                        setDisplay: {
                            input: {
                                type: "string",
                            },
                            output: {
                                type: "string",
                            },
                            forms: [
                                {
                                    href: "http://localhost:8083/TestServient/actions/setDisplay",
                                    contentType: "application/json",
                                    op: ["invokeaction"],
                                    "htv:methodName": "POST",
                                },
                                {
                                    href: "coap://localhost:8084/TestServient/actions/setDisplay",
                                    contentType: "application/json",
                                    op: "invokeaction",
                                },
                            ],
                            idempotent: false,
                            safe: false,
                        },
                        setTestObject: {
                            input: {
                                type: "object",
                                properties: {
                                    brightness: {
                                        type: "number",
                                        minimum: 0,
                                        maximum: 100,
                                    },
                                    status: {
                                        type: "string",
                                    },
                                },
                            },
                            forms: [
                                {
                                    href: "http://localhost:8083/TestServient/actions/setTestObject",
                                    contentType: "application/json",
                                    op: ["invokeaction"],
                                    "htv:methodName": "POST",
                                },
                                {
                                    href: "coap://localhost:8084/TestServient/actions/setTestObject",
                                    contentType: "application/json",
                                    op: "invokeaction",
                                },
                            ],
                            idempotent: false,
                            safe: false,
                        },
                        longTakingAction: {
                            description: "Action that can fail because of taking longer than usual (5s)",
                            input: {
                                type: "array",
                                items: {
                                    type: "number",
                                },
                            },
                            output: {
                                type: "array",
                                items: {
                                    type: "number",
                                },
                            },
                            forms: [
                                {
                                    href: "http://localhost:8083/TestServient/actions/longTakingAction",
                                    contentType: "application/json",
                                    op: ["invokeaction"],
                                    "htv:methodName": "POST",
                                },
                                {
                                    href: "coap://localhost:8084/TestServient/actions/longTakingAction",
                                    contentType: "application/json",
                                    op: "invokeaction",
                                },
                            ],
                            idempotent: false,
                            safe: false,
                        },
                    },
                    events: {
                        failEvent: {
                            data: {
                                type: "number",
                            },
                            forms: [
                                {
                                    href: "http://localhost:8083/TestServient/events/failEvent",
                                    contentType: "application/json",
                                    subprotocol: "longpoll",
                                    op: ["subscribeevent", "unsubscribeevent"],
                                },
                                {
                                    href: "coap://localhost:8084/TestServient/events/failEvent",
                                    contentType: "application/json",
                                    op: ["subscribeevent", "unsubscribeevent"],
                                },
                            ],
                        },
                    },
                    id: "urn:uuid:560290c8-6490-4a58-99ca-eea9bc8c25d2",
                    "@context": "https://www.w3.org/2019/wot/td/v1",
                    "@type": "Thing",
                    security: ["nosec_sc"],
                    forms: [
                        {
                            href: "http://localhost:8083/TestServient/all/properties",
                            contentType: "application/json",
                            op: ["readallproperties", "readmultipleproperties", "writeallproperties", "writemultipleproperties"],
                        },
                    ],
                    securityDefinitions: {
                        nosec_sc: {
                            scheme: "nosec",
                        },
                    },
                })
                .end(function (err, res) {
                    let allTestCases = getAllTestCases(getTestResult(res))
                    expect(allTestCases.length, "Did not report the correct amount of Testcases.").to.be.equal(28) //Check if all TestCases have been generated.

                    // Test first test scenario
                    expect(getPassedFailedArray(res.body[0][0])).is.eql([
                        true,
                        false,
                        false,
                        false,
                        true,
                        false,
                        false,
                        true,
                        false,
                        false,
                        true,
                        false,
                        false,
                        false,
                    ])

                    // Second test scenario is not tested due to an interplay of different problems: If an event does not emit during the
                    // testing period and subscription worked the test is passed. Node-wot has problems emitting events continuously in the
                    // in a time frame required by default config. Due to these two problem in the second scenario test cycle has in most
                    // cases fewer fails. But sometimes it also works -> no tests possible.

                    expect(err).to.be.null
                    done()
                })
        })
    })

    describe("Test perfectThing", function () {
        it("Fast Test", function (done) {
            this.timeout(10000)
            // Send some Form Data
            chai.request(address_testbench)
                .post("/wot-test-bench/actions/fastTest")
                .send({
                    title: "TestServient",
                    description: "Test servient that can be used as a servient to be tested with the WoT Test Bench",
                    properties: {
                        display: {
                            type: "string",
                            observable: true,
                            readOnly: false,
                            writeOnly: false,
                            forms: [
                                {
                                    href: "http://localhost:8081/TestServient/properties/display",
                                    contentType: "application/json",
                                    op: ["readproperty", "writeproperty"],
                                },
                                {
                                    href: "http://localhost:8081/TestServient/properties/display/observable",
                                    contentType: "application/json",
                                    op: ["observeproperty", "unobserveproperty"],
                                    subprotocol: "longpoll",
                                },
                                {
                                    href: "coap://localhost:8082/TestServient/properties/display",
                                    contentType: "application/json",
                                    op: ["readproperty", "writeproperty"],
                                },
                            ],
                        },
                        counter: {
                            type: "number",
                            observable: true,
                            readOnly: false,
                            writeOnly: false,
                            forms: [
                                {
                                    href: "http://localhost:8081/TestServient/properties/counter",
                                    contentType: "application/json",
                                    op: ["readproperty", "writeproperty"],
                                },
                                {
                                    href: "http://localhost:8081/TestServient/properties/counter/observable",
                                    contentType: "application/json",
                                    op: ["observeproperty", "unobserveproperty"],
                                    subprotocol: "longpoll",
                                },
                                {
                                    href: "coap://localhost:8082/TestServient/properties/counter",
                                    contentType: "application/json",
                                    op: ["readproperty", "writeproperty"],
                                },
                            ],
                        },
                        temperature: {
                            type: "number",
                            readOnly: true,
                            observable: true,
                            writeOnly: false,
                            forms: [
                                {
                                    href: "http://localhost:8081/TestServient/properties/temperature",
                                    contentType: "application/json",
                                    op: ["readproperty"],
                                    "htv:methodName": "GET",
                                },
                                {
                                    href: "http://localhost:8081/TestServient/properties/temperature/observable",
                                    contentType: "application/json",
                                    op: ["observeproperty", "unobserveproperty"],
                                    subprotocol: "longpoll",
                                },
                                {
                                    href: "coap://localhost:8082/TestServient/properties/temperature",
                                    contentType: "application/json",
                                    op: ["readproperty"],
                                },
                            ],
                        },
                        testObject: {
                            type: "object",
                            properties: {
                                brightness: {
                                    type: "number",
                                    minimum: 0,
                                    maximum: 100,
                                },
                                status: {
                                    type: "string",
                                },
                            },
                            readOnly: false,
                            writeOnly: false,
                            observable: false,
                            forms: [
                                {
                                    href: "http://localhost:8081/TestServient/properties/testObject",
                                    contentType: "application/json",
                                    op: ["readproperty", "writeproperty"],
                                },
                                {
                                    href: "coap://localhost:8082/TestServient/properties/testObject",
                                    contentType: "application/json",
                                    op: ["readproperty", "writeproperty"],
                                },
                            ],
                        },
                        testArray: {
                            type: "array",
                            items: {
                                type: "number",
                            },
                            readOnly: false,
                            writeOnly: false,
                            observable: false,
                            forms: [
                                {
                                    href: "http://localhost:8081/TestServient/properties/testArray",
                                    contentType: "application/json",
                                    op: ["readproperty", "writeproperty"],
                                },
                                {
                                    href: "coap://localhost:8082/TestServient/properties/testArray",
                                    contentType: "application/json",
                                    op: ["readproperty", "writeproperty"],
                                },
                            ],
                        },
                    },
                    actions: {
                        setCounter: {
                            input: {
                                type: "number",
                            },
                            forms: [
                                {
                                    href: "http://localhost:8081/TestServient/actions/setCounter",
                                    contentType: "application/json",
                                    op: ["invokeaction"],
                                    "htv:methodName": "POST",
                                },
                                {
                                    href: "coap://localhost:8082/TestServient/actions/setCounter",
                                    contentType: "application/json",
                                    op: "invokeaction",
                                },
                            ],
                            idempotent: false,
                            safe: false,
                        },
                        getTemperature: {
                            output: {
                                type: "number",
                            },
                            forms: [
                                {
                                    href: "http://localhost:8081/TestServient/actions/getTemperature",
                                    contentType: "application/json",
                                    op: ["invokeaction"],
                                    "htv:methodName": "POST",
                                },
                                {
                                    href: "coap://localhost:8082/TestServient/actions/getTemperature",
                                    contentType: "application/json",
                                    op: "invokeaction",
                                },
                            ],
                            idempotent: false,
                            safe: false,
                        },
                        setDisplay: {
                            input: {
                                type: "string",
                            },
                            output: {
                                type: "string",
                            },
                            forms: [
                                {
                                    href: "http://localhost:8081/TestServient/actions/setDisplay",
                                    contentType: "application/json",
                                    op: ["invokeaction"],
                                    "htv:methodName": "POST",
                                },
                                {
                                    href: "coap://localhost:8082/TestServient/actions/setDisplay",
                                    contentType: "application/json",
                                    op: "invokeaction",
                                },
                            ],
                            idempotent: false,
                            safe: false,
                        },
                        setTestObject: {
                            input: {
                                type: "object",
                                properties: {
                                    brightness: {
                                        type: "number",
                                        minimum: 0,
                                        maximum: 100,
                                    },
                                    status: {
                                        type: "string",
                                    },
                                },
                            },
                            forms: [
                                {
                                    href: "http://localhost:8081/TestServient/actions/setTestObject",
                                    contentType: "application/json",
                                    op: ["invokeaction"],
                                    "htv:methodName": "POST",
                                },
                                {
                                    href: "coap://localhost:8082/TestServient/actions/setTestObject",
                                    contentType: "application/json",
                                    op: "invokeaction",
                                },
                            ],
                            idempotent: false,
                            safe: false,
                        },
                        setTestArray: {
                            input: {
                                type: "array",
                                items: {
                                    type: "number",
                                },
                            },
                            output: {
                                type: "array",
                                items: {
                                    type: "number",
                                },
                            },
                            forms: [
                                {
                                    href: "http://localhost:8081/TestServient/actions/setTestArray",
                                    contentType: "application/json",
                                    op: ["invokeaction"],
                                    "htv:methodName": "POST",
                                },
                                {
                                    href: "coap://localhost:8082/TestServient/actions/setTestArray",
                                    contentType: "application/json",
                                    op: "invokeaction",
                                },
                            ],
                            idempotent: false,
                            safe: false,
                        },
                    },
                    events: {
                        onChange: {
                            data: {
                                type: "number",
                            },
                            forms: [
                                {
                                    href: "http://localhost:8081/TestServient/events/onChange",
                                    contentType: "application/json",
                                    subprotocol: "longpoll",
                                    op: ["subscribeevent", "unsubscribeevent"],
                                },
                                {
                                    href: "coap://localhost:8082/TestServient/events/onChange",
                                    contentType: "application/json",
                                    op: ["subscribeevent", "unsubscribeevent"],
                                },
                            ],
                        },
                        onChangeTimeout: {
                            data: {
                                type: "number",
                            },
                            forms: [
                                {
                                    href: "http://localhost:8081/TestServient/events/onChangeTimeout",
                                    contentType: "application/json",
                                    subprotocol: "longpoll",
                                    op: ["subscribeevent", "unsubscribeevent"],
                                },

                                {
                                    href: "coap://localhost:8082/TestServient/events/onChangeTimeout",
                                    contentType: "application/json",
                                    op: ["subscribeevent", "unsubscribeevent"],
                                },
                            ],
                        },
                    },
                    "@context": "https://www.w3.org/2019/wot/td/v1",
                    "@type": "Thing",
                    security: ["nosec_sc"],
                    id: "urn:uuid:3999c3d8-1b55-4c05-bc63-c91f0981cf36",
                    forms: [
                        {
                            href: "http://localhost:8081/TestServient/all/properties",
                            contentType: "application/json",
                            op: ["readallproperties", "readmultipleproperties", "writeallproperties", "writemultipleproperties"],
                        },
                    ],
                    securityDefinitions: {
                        nosec_sc: {
                            scheme: "nosec",
                        },
                    },
                })
                .end(function (err, res) {
                    let allTestCases = getAllTestCases(getTestResult(res))
                    //console.log(allTestCases); //Can be used to log TestResults for debugging purposes.
                    expect(allTestCases.length, "Did not report the correct amount of Testcases.").to.be.equal(24) //Check if all TestCases have been generated.
                    expect(allTestPassed(allTestCases, "Not all Testcases passed for Action: fastTest.")).to.be.true //Check if all TestCases have passed.
                    expect(err).to.be.null
                    done()
                })
        })
    })
})

// Constant used to define that something is not the actual data (Not ideal, but every other value would also be possible, even null).
const notTheActualData = "Not the actual data"

/**
 * Checks if the generation of test data works as defined. This test has to be executed after the test for action fastTest, otherwise no
 * data is generated, thus the property would be null.
 */
describe("Property: testData", function () {
    describe("Get test Data", function () {
        it("Get Data", function (done) {
            // Send some Form Data
            chai.request(address_testbench)
                .get("/wot-test-bench/properties/testData")
                .end(function (err, res) {
                    expect(err).to.be.null
                    expect(res).to.have.status(200)
                    // Check properties
                    checkDataArray(res.body.Property.display, 2, "string")
                    checkDataArray(res.body.Property.counter, 2, "number")
                    checkDataArray(res.body.Property.temperature, 2, "object", null)
                    checkDataArray(res.body.Property.testObject, 2, "object")
                    checkDataArray(res.body.Property.testArray, 2, "object", notTheActualData, true)
                    // Check actions
                    checkDataArray(res.body.Action.setCounter, 2, "number")
                    checkDataArray(res.body.Action.getTemperature, 2, "object", null)
                    checkDataArray(res.body.Action.setDisplay, 2, "string")
                    checkDataArray(res.body.Action.setTestObject, 2, "object")
                    checkDataArray(res.body.Action.setTestArray, 2, "object", notTheActualData, true)
                    // Check events
                    checkDataArray(res.body.EventSubscription.onChange, 2, "object", null)
                    checkDataArray(res.body.EventSubscription.onChangeTimeout, 2, "object", null)
                    checkDataArray(res.body.EventCancellation.onChange, 2, "object", null)
                    checkDataArray(res.body.EventCancellation.onChangeTimeout, 2, "object", null)
                    done()
                })
        })
    })
})

/**
 * Checks if an array fulfills the provided parameters.
 * @param {*} dataArray The data array to check.
 * @param {*} length The length of the data array to check.
 * @param {*} dataType The type of the elements of the array to check.
 * @param {*} actualData The actual data value of all array elements
 */
function checkDataArray(dataArray, length, dataType, actualData = notTheActualData, isArray = false) {
    expect(dataArray.length).to.be.equal(length)
    dataArray.forEach((data) => {
        expect(typeof data === dataType, "Expected data type: " + dataType + "; Got: " + typeof data).to.be.true
        if (actualData != notTheActualData) {
            expect(data == actualData).to.be.true
        }
        if (isArray) {
            expect(Array.isArray(data), "Object was not an array: " + data).to.be.true
        }
    })
}
