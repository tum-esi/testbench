var chai = require("chai")
var chaiHttp = require("chai-http")
const { faultyThingTD, perfectThingTD, testConfig } = require("./testing-payloads")
const { sleepInMs } = require("../dist/utilities.js")
const fs = require("fs")
chai.use(chaiHttp)
const address_testbench = "localhost:8980"
var expect = chai.expect

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

function propertySafetyReportArray(arr) {
    result = []

    for (var i = 0; i < arr.length; i++) {
        result.push([arr[i]["safety"]["isReadable"], arr[i]["safety"]["isWritable"]])
    }
    return result
}

/**
 * Tests the fastTest action:
 * - The testbench is sent a TD for both faultyThing and perfectThing.
 * - The test cases are extracted from the output.
 * - From this output it is checked if the correct test cases failed, respectively passed.
 * !!! REPEATED execution might fail if faultyThing is not restarted for each execution.
 */
describe("Action: fastTest", function () {
    describe("Test faultyThing", function () {
        it("Fast Test", function (done) {
            this.timeout(50000)

            // Setting the test config.
            chai.request(address_testbench)
                .put("/wot-test-bench/properties/testConfig")
                .send(testConfig)
                .then(async () => {
                    // Making sure the test config is used for the test run.
                    await sleepInMs(1000)
                })
            // console.log('faultyThingTD', JSON.stringify(faultyThingTD));
            // Send some Form Data
            chai.request(address_testbench)
                .post("/wot-test-bench/actions/fastTest")
                .send(faultyThingTD)
                .end(function (err, res) {
                    let allTestCases = getAllTestCases(res.body["conformance"])
                    let vulnResults = res.body["vulnerabilities"]

                    expect(allTestCases.length, "Did not report the correct amount of Testcases.").to.be.equal(28) //Check if all TestCases have been generated.

                    // Expected failed/passed sequence.
                    expectedArray = [true, false, false, false, true, false, false, true, false, false, true, false, false, false]
                    // Testing the first test scenario.
                    expect(getPassedFailedArray(res.body["conformance"][0][0]), "First test sequence not as expected").is.eql(expectedArray)
                    // Testing the second test scenario.
                    expect(getPassedFailedArray(res.body["conformance"][0][1]), "Second test sequence not as expected").is.eql(expectedArray)

                    // Since there are eight properties, there must be exactly eight reports corresponding for these properties.
                    expect(vulnResults["propertyReports"].length, "Did not report the correct amount of propertyReports.").to.be.equal(8)

                    // Since there are five actions, there must be exactly five reports corresponding for these actions.
                    expect(vulnResults["actionReports"].length, "Did not report the correct amount of actionReports.").to.be.equal(5)

                    let expectedPropertySafetyResults = [
                        [true, true], // The first property, namely display, must be both readable and writable as it is neither writeOnly nor readOnly.
                        [true, true], // The second property, namely counter, must be both readable and writable as it is neither writeOnly nor readOnly.
                        [true, false], // The third property, namely temperature, must be readable and not writable as it is readOnly.
                        [true, false], // The fourth property, namely faultyPercent, must be readable and not writable as it is readOnly.
                        [true, true], // The fifth property, namely wrongWritable, must be both readable and writable as it is neither writeOnly nor readOnly.
                        [true, false], // The sixth property, namely wrongDataTypeNumber, must be readable and not writable as it is readOnly.
                        [true, false], // The seventh property, namely wrongDataTypeObject, must be readable and not writable as it is readOnly.
                        [true, true], // The eighth property, namely testArray, must be both readable and writable as it is neither writeOnly nor readOnly.
                    ]

                    // Testing whether the actual results match with the expected ones.
                    expect(propertySafetyReportArray(vulnResults["propertyReports"]), "Safety reports did not match with the expected ones.").to.be.eql(
                        expectedPropertySafetyResults
                    )

                    // Since there is no control internally, and safety tests performed by testVulnerabilites test for those types other than the action's defined type, below results
                    // are the types complementing the action's input type, if exists, to all probable types. If no input is defined for an action, all available types are accepted by
                    // the action (as there is no type checking performed on faultyThing).

                    // setCounter is defined to have input of type number yet, in contrast, accepts all other types below.
                    expect(
                        vulnResults["actionReports"][0]["safety"]["exceptionTypes"],
                        "First action's exceptionTypes did not match with the expected ones."
                    ).to.be.eql(["object", "array", "string", "integer", "boolean"])

                    // getTemperature is defined to have no input yet, in contrast, accepts all types.
                    expect(
                        vulnResults["actionReports"][1]["safety"]["exceptionTypes"],
                        "Second action's exceptionTypes did not match with the expected ones."
                    ).to.be.eql(["object", "array", "string", "integer", "number", "boolean"])

                    // setDisplay is defined to have input of type string yet, in contrast, accepts all other types below.
                    expect(
                        vulnResults["actionReports"][2]["safety"]["exceptionTypes"],
                        "Third action's exceptionTypes did not match with the expected ones."
                    ).to.be.eql(["object", "array", "integer", "number", "boolean"])

                    // setTestObject is defined to have input of type object yet, in contrast, accepts all other types below.
                    expect(
                        vulnResults["actionReports"][3]["safety"]["exceptionTypes"],
                        "Fourth action's exceptionTypes did not match with the expected ones."
                    ).to.be.eql(["array", "string", "integer", "number", "boolean"])

                    // longTakingAction is defined to have input of type array yet, in contrast, accepts all other types below.
                    expect(
                        vulnResults["actionReports"][4]["safety"]["exceptionTypes"],
                        "Fifth action's exceptionTypes did not match with the expected ones."
                    ).to.be.eql(["object", "string", "integer", "number", "boolean"])

                    expect(err).to.be.null
                    done()
                })
        })
    })

    describe("Test perfectThing", function () {
        it("Fast Test", function (done) {
            this.timeout(50000)

            // Setting the default config.
            chai.request(address_testbench)
                .put("/wot-test-bench/properties/testConfig")
                .send(JSON.parse(fs.readFileSync("./default-config.json", "utf8")))
                .then(async () => {
                    // Making sure the default config is used for the test run.
                    await sleepInMs(1000)
                })
            // console.log('perfectThingTD', JSON.stringify(perfectThingTD));
            // Send some Form Data
            chai.request(address_testbench)
                .post("/wot-test-bench/actions/fastTest")
                .send(perfectThingTD)
                .end(function (err, res) {
                    let allTestCases = getAllTestCases(res.body["conformance"])
                    let vulnResults = res.body["vulnerabilities"]

                    //console.log(allTestCases); //Can be used to log TestResults for debugging purposes.
                    expect(allTestCases.length, "Did not report the correct amount of Testcases.").to.be.equal(25) //Check if all TestCases have been generated.
                    expect(allTestPassed(allTestCases, "Not all Testcases passed for Action: fastTest.")).to.be.true //Check if all TestCases have passed.

                    // Since there are five properties, there must be exactly five reports corresponding for these properties.
                    expect(vulnResults["propertyReports"].length, "Did not report the correct amount of propertyReports.").to.be.equal(5)

                    // Since there are five actions, there must be exactly five reports corresponding for these actions.
                    expect(vulnResults["actionReports"].length, "Did not report the correct amount of actionReports.").to.be.equal(5)

                    let expectedPropertySafetyResults = [
                        [true, true], // The first property, namely display, must be both readable and writable as it is neither writeOnly nor readOnly.
                        [true, true], // The second property, namely counter, must be both readable and writable as it is neither writeOnly nor readOnly.
                        [true, false], // The third property, namely temperature, must be readable and not writable as it is readOnly.
                        [true, true], // The fourth property, namely testObject, must be both readable and writable as it is neither writeOnly nor readOnly.
                        [true, true], // The fifth property, namely testArray, must be both readable and writable as it is neither writeOnly nor readOnly.
                    ]

                    // Testing whether the actual results match with the expected ones.
                    expect(propertySafetyReportArray(vulnResults["propertyReports"]), "Safety reports did not match with the expected ones.").to.be.eql(
                        expectedPropertySafetyResults
                    )

                    // Since there is no control internally, and safety tests performed by testVulnerabilites test for those types other than the action's defined type, below results
                    // are the types complementing the action's input type, if exists, to all probable types. If no input is defined for an action, all available types are accepted by
                    // the action (as there is no type checking performed on perfectThing).

                    // setCounter is defined to have input of type number yet, in contrast, accepts all other types below.
                    expect(
                        vulnResults["actionReports"][0]["safety"]["exceptionTypes"],
                        "First action's exceptionTypes did not match with the expected ones."
                    ).to.be.eql(["object", "array", "string", "integer", "boolean"])

                    // getTemperature is defined to have no input yet, in contrast, accepts all types.
                    expect(
                        vulnResults["actionReports"][1]["safety"]["exceptionTypes"],
                        "Second action's exceptionTypes did not match with the expected ones."
                    ).to.be.eql(["object", "array", "string", "integer", "number", "boolean"])

                    // setDisplay is defined to have input of type string yet, in contrast, accepts all other types below.
                    expect(
                        vulnResults["actionReports"][2]["safety"]["exceptionTypes"],
                        "Third action's exceptionTypes did not match with the expected ones."
                    ).to.be.eql(["object", "array", "integer", "number", "boolean"])

                    // setTestObject is defined to have input of type object yet, in contrast, accepts all other types below.
                    expect(
                        vulnResults["actionReports"][3]["safety"]["exceptionTypes"],
                        "Fourth action's exceptionTypes did not match with the expected ones."
                    ).to.be.eql(["array", "string", "integer", "number", "boolean"])

                    // setTestArray is defined to have input of type array yet, in contrast, accepts all other types below.
                    expect(
                        vulnResults["actionReports"][4]["safety"]["exceptionTypes"],
                        "Fifth action's exceptionTypes did not match with the expected ones."
                    ).to.be.eql(["object", "string", "integer", "number", "boolean"])

                    expect(err).to.be.null
                    done()
                })
        })
    })
})

// Constant used to define that something is not the actual data (Not ideal, but every other value would also be possible, even null).
const notTheActualData = "Not the actual data"

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
