var chai = require("chai")
var chaiHttp = require("chai-http")
chai.use(chaiHttp)
var app = "localhost:8980"
var expect = chai.expect
describe("Property: testData", function () {
    describe("Get test Data", function () {
        it("Get Data", function (done) {
            // Send some Form Data
            chai.request(app)
                .get("/wot-test-bench/properties/testData")
                .end(function (err, res) {
                    expect(err).to.be.null
                    expect(res).to.have.status(200)
                    done()
                })
        })
    })
})

/**
 * Returns a JSON object containing the TestResults from a chai send request result object.
 * @param {any} res The result of the chai send request.
 * @return {JSON} The JSON containing the TestResults.
 */
function getTestResult(res) {
    let stringTestResult = res.res.text //TestResult as text.
    return JSON.parse(stringTestResult) //Return TestResult as JSON.
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
    var allTestCases = []
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
    describe("Test entire system", function () {
        it("Fast Test", function (done) {
            this.timeout(10000)
            // Send some Form Data
            chai.request(app)
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
                            type: "number",
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
                    expect(allTestCases.length, "Did not report the correct amount of Testcases.").to.be.equal(22) //Check if all TestCases have been generated.
                    expect(allTestPassed(allTestCases, "Not all Testcases passed for Action: fastTest.")).to.be.true //Check if all TestCases have passed.
                    expect(err).to.be.null
                    done()
                })
        })
    })
})
