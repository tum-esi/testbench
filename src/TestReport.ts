import fs = require("fs")
var mkdirp = require("mkdirp")
import { ListeningType } from "./utilities"

/**
 * A single subTest result containing a resultId and an optional resultMessage.
 */
export class Result {
    id: number
    message?: string

    constructor(id: number, message?: string) {
        this.id = id
        this.message = message
    }
}

/**
 * A payload report class containing a timestamp and a payload JSON object.
 */
export class Payload {
    timestamp: Date
    payload: JSON

    constructor(timestamp: Date, payload: JSON = null) {
        this.timestamp = timestamp
        this.payload = payload
    }
}

/**
 * A mini test report only containing a passed boolean, two payload objects, containing the sent and received payload and a testResult object.
 */
export class MiniTestReport {
    passed: boolean
    sent: Payload
    received: Payload
    result: Result

    constructor(passed: boolean = null) {
        this.passed = passed
        this.sent = null
        this.received = null
        this.result = null
    }

    getPrintableOnlyOut() {
        let outTestReport = {}
        outTestReport["passed"] = this.passed
        if (this.sent != null) outTestReport["sendTimestamp"] = this.sent.timestamp
        if (this.received != null) outTestReport["received"] = this.received
        outTestReport["result"] = this.result
        return outTestReport
    }
}

/**
 * An InteractionTestReportContainer containing the results of an interaction test.
 */
export class InteractionTestReportContainer {
    testCycle: number
    testScenario: number
    name: string
    passed: boolean

    constructor(testCycle: number, testScenario: number, name: string) {
        this.testCycle = testCycle
        this.testScenario = testScenario
        this.name = name
        this.passed = true
    }
}

/**
 * An ActionTestReportContainer containing the results of an action test.
 */
export class ActionTestReportContainer extends InteractionTestReportContainer {
    report: MiniTestReport

    constructor(testCycle: number, testScenario: number, name: string) {
        super(testCycle, testScenario, name)
        this.report = new MiniTestReport()
    }

    /**
     * Restructures the ReportContainer to match the structure of the printed Message. Potentially a new JSON object
     * could be created and returned here if in the future the originally formatted container is needed for further processing.
     * @return The restructured testReportContainer.
     */
    getPrintableMessage() {
        delete this.testCycle
        delete this.testScenario
        delete this.report.passed
        return this
    }
}

/**
 * An PropertyTestReportContainer containing the results of a property test.
 */
export class PropertyTestReportContainer extends InteractionTestReportContainer {
    readPropertyReport: MiniTestReport
    writePropertyReport: MiniTestReport
    observePropertyReport: EventTestReportContainer

    constructor(testCycle: number, testScenario: number, name: string) {
        super(testCycle, testScenario, name)
    }

    /**
     * Creates a new object to ensure correct format when printing/storing the container.
     * @return A correctly formatted object containing the needed data.
     */
    getPrintableMessage() {
        delete this.testCycle
        delete this.testScenario

        let toReturn = { name: this.name, passed: this.passed }
        if (this.readPropertyReport != null) toReturn["readPropertyReport"] = this.readPropertyReport.getPrintableOnlyOut()
        if (this.writePropertyReport != null) toReturn["writePropertyReport"] = this.writePropertyReport
        if (this.observePropertyReport != null) {
            let observePropertyReport = {
                passed: this.observePropertyReport.passed,
                subscriptionReport: this.observePropertyReport.subscriptionReport.getPrintableOnlyOut(),
                observedDataReport: this.observePropertyReport.eventDataReport.getPrintableMessage(),
                cancellationReport: this.observePropertyReport.cancellationReport.getPrintableOnlyOut(),
            }
            toReturn["observePropertyReport"] = observePropertyReport
        }
        return toReturn
    }
}

/**
 * An EventData object containing a passed boolean, a timestamp defining when the data was received an a result object specifying if this
 * data package is valid.
 */
export class EventData extends Payload {
    result: Result

    constructor(timestamp: Date, payload: JSON, result: Result) {
        super(timestamp, payload)
        this.result = result
    }
}

/**
 * An EventDataReport object containing an passed boolean, an Array of received data packages and a result object specifying if the any of
 * contained data packages is invalid.
 */
class EventDataReport {
    passed: boolean
    received: Array<EventData>
    result: Result

    constructor() {
        this.passed = true
        this.received = []
        this.result = null
    }

    /**
     * Creates a new object to ensure correct format when printing/storing the container.
     * @return A correctly formatted object containing the needed data.
     */
    getPrintableMessage() {
        if (this.result == null) delete this.result
        return this
    }
}

/**
 * An EventTestReportContainer containing the results of an event test.
 */
export class EventTestReportContainer extends InteractionTestReportContainer {
    subscriptionReport: MiniTestReport
    eventDataReport: EventDataReport
    cancellationReport: MiniTestReport

    constructor(testCycle: number, testScenario: number, name: string) {
        super(testCycle, testScenario, name)
        this.subscriptionReport = new MiniTestReport(false)
        this.eventDataReport = new EventDataReport()
        this.cancellationReport = new MiniTestReport(false)
    }

    /**
     * Creates a new object to ensure correct format when printing/storing the container.
     * @return A correctly formatted object containing the needed data.
     */
    getPrintableMessage() {
        return {
            name: this.name,
            passed: this.passed,
            subscriptionReport: this.subscriptionReport.getPrintableOnlyOut(),
            eventDataReport: this.eventDataReport.getPrintableMessage(),
            cancellationReport: this.cancellationReport.getPrintableOnlyOut(),
        }
    }
}

/**
 * Contains the results of each subTest concatenated in single testReport object.
 */
export class TestReport {
    public results: Array<Array<any>> //stores all the sent and received messages as well as the errors being produced
    private testCycleCount: number //incremented at each repetition of a group of test scenarios
    private testScenarioCount: number //incremented at each addition of a new test scenario that contains different messages
    private maxTestScenario: number // the max number of test scenarios for a given repetition

    constructor() {
        this.results = []
        this.testCycleCount = -1
        this.testScenarioCount = -1
        this.maxTestScenario = 0
    }

    /**
     * Returns the results of the current test run.
     */
    public getResults(): Array<any> {
        let returnResults = this.results
        return returnResults
    }

    /**
     * Resets the results of a test run.
     */
    public resetResults(): void {
        this.results = []
        this.testCycleCount = -1
        this.testScenarioCount = -1
    }

    /**
     * at each new test cycle this should be called it creates a new empty array that will be later on filled with test scenarios
     */
    public addTestCycle(): void {
        this.testCycleCount++
        this.testScenarioCount = -1
        /*
        let nextCycle: Array<any> = [];
        this.results.push(nextCycle);
        */
        this.results[this.testCycleCount] = []
    }

    /**
     * at each new test scenario that has different message exchanges this should be called it creates a new empty array that will be later
     * on filled with objects that represent message exchanges
     */
    public addTestScenario(/*tester:Tester,callback:Function*/): void {
        this.testScenarioCount++
        if (this.testScenarioCount > this.maxTestScenario) {
            //update the max value that is used for displaying
            this.maxTestScenario = this.testScenarioCount
        }
        this.results[this.testCycleCount][this.testScenarioCount] = []
        //callback(tester);
    }

    //this adds a message exchange
    //tha name of the message and the results of the exchange should be entered in the arguments
    //after getting all the arguments, these arguments are transformed into a JSON object that represents the exchange that has just occurred
    public addMessage(
        testCycle: number,
        testScenario: number,
        testContainer: ActionTestReportContainer | PropertyTestReportContainer | EventTestReportContainer
    ): void {
        //filling the results
        //this.results[testCycle].splice(testScenario, 1, testContainer.getPrintableMessage())
        this.results[testCycle][testScenario].push(testContainer.getPrintableMessage())
    }

    /**
     * Logs a test summary in the cli.
     * @param testingPhase the testing phase.
     */
    public printResults(testingPhase: ListeningType): void {
        LogInGreen("Results of the test with Errors/TotalTests\n")
        LogInGreen("Test Scenario Number > ")
        for (var testCycle = 0; testCycle <= this.maxTestScenario; testCycle++) {
            LogInGreen("TS" + testCycle + "\t")
        }
        LogInGreen("Test Cycle Nb:\n")

        // Printing the results.
        for (var testCycle = 0; testCycle <= this.testCycleCount; testCycle++) {
            if (testingPhase == ListeningType.Synchronous && testCycle == this.testCycleCount) LogInGreen("Listening Phase\t\t")
            else LogInGreen("TC" + testCycle + "\t\t\t")
            for (var testScenario = 0; testScenario <= this.maxTestScenario; testScenario++) {
                // In the listening Phase only first testScenario exists, thus no further testScenarios can be logged.
                if (testingPhase == ListeningType.Synchronous && testScenario == 1 && testCycle == this.testCycleCount) {
                    break
                }

                //summing up the fails for this one scenario
                //this try catch exists because not every scenario is obligated to have the same number of messages
                //this is of course not necessary for the current state of the test bench
                let currentScenario: any = this.results[testCycle][testScenario]
                let curSceLength: number = currentScenario.length

                let fails: number = 0
                try {
                    for (var k = 0; k < curSceLength; k++) {
                        let curMessage: InteractionTestReportContainer = currentScenario[k]
                        //if the results of the single test is false, the number to be displayed in the table is incremented
                        let curResult: boolean = curMessage.passed
                        if (!curResult) {
                            fails++
                        }
                    }

                    LogInGreen(fails + "/" + curSceLength + "\t") //this is used for displaying how many failures are there for one scenario
                } catch (Error) {
                    LogInGreen(fails + "/" + curSceLength + "\t")
                }
            }
            console.log()
        }

        /**
         * Logs a single line in green.
         * @param message The message to log.
         */
        function LogInGreen(message: string) {
            process.stdout.write("\x1b[32m" + message + "\x1b[0m")
        }
    }

    /**
     * Stores the testReport in the file system.
     * @param location The location where the testReport is to be stored.
     * @param tutName The name of the tested Thing.
     */
    public storeReport(location: string, tutName: string) {
        try {
            mkdirp(location)
            var files = fs.readdirSync(location) // returns string list
            if (files.length > 0) {
                let maxReportCount = 0

                // find max number of stored tut-reports:
                for (var i in files) {
                    let splitFile = files[i].split("-")
                    if (splitFile[1] == tutName) {
                        if (Number(splitFile[0]) > maxReportCount) {
                            maxReportCount = Number(splitFile[0])
                        }
                    }
                }
                maxReportCount++
                fs.writeFileSync(location + maxReportCount.toString() + "-" + tutName + "-testReport.json", JSON.stringify(this.results, null, 4))
                console.log("Report stored in " + location + maxReportCount.toString() + "-" + tutName + "-testReport.json")
            } else {
                fs.writeFileSync(location + "1-" + tutName + "-testReport.json", JSON.stringify(this.results, null, 4))
                console.log("Report stored in " + location + "1-" + tutName + "-testReport.json")
            }
        } catch (error) {
            console.log("Report could not be stored")
        }
    }
}
