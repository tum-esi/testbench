import fs = require("fs")
var mkdirp = require("mkdirp")
import { ListeningType } from "./utilities"

export class Result {
    id: number
    message?: string

    constructor(id: number, message?: string) {
        this.id = id
        this.message = message
    }
}

export class Payload {
    timestamp: Date
    payload?: JSON

    constructor(timestamp: Date, payload?: JSON) {
        this.timestamp = timestamp
        this.payload = payload
    }
}

export class MicroTestReport {
    passed: boolean
    sendTimestamp: Date
    received: Payload
    result: Result

    constructor() {
        this.passed = false
        this.sendTimestamp = null
        this.received = null
        this.result = null
    }

    getPrintableMessage() {
        if (this.sendTimestamp == null) delete this.sendTimestamp
        if (this.received == null) delete this.received
        return this
    }
}

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
}

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

export class PropertyTestReportContainer extends InteractionTestReportContainer {
    readPropertyReport: MicroTestReport
    writePropertyReport: MiniTestReport
    observePropertyReport: EventTestReportContainer

    constructor(testCycle: number, testScenario: number, name: string) {
        super(testCycle, testScenario, name)
    }

    /**
     * Restructures the ReportContainer to match the structure of the printed Message.
     * @return The restructured testReportContainer.
     */
    getPrintableMessage() {
        delete this.testCycle
        delete this.testScenario

        let toReturn = { name: this.name, passed: this.passed }
        if (this.readPropertyReport != null) toReturn["readPropertyReport"] = this.readPropertyReport.getPrintableMessage()
        if (this.readPropertyReport != null) toReturn["writePropertyReport"] = this.writePropertyReport
        if (this.observePropertyReport != null) {
            let observePropertyReport = {
                subscriptionReport: this.observePropertyReport.subscriptionReport.getPrintableMessage(),
                observedDataReport: this.observePropertyReport.eventDataReport.getPrintableMessage(),
                cancellationReport: this.observePropertyReport.cancellationReport.getPrintableMessage(),
            }
            toReturn["observePropertyReport"] = observePropertyReport
        }
        return toReturn
    }
}

export class EventData extends Payload {
    result: Result

    constructor(timestamp: Date, payload: JSON, result: Result) {
        super(timestamp, payload)
        this.result = result
    }
}

class EventDataReport {
    passed: boolean
    received: Array<EventData>
    result: Result

    constructor() {
        this.passed = true
        this.received = []
        this.result = null
    }

    getPrintableMessage() {
        if (this.result == null) delete this.result
        return this
    }
}

export class EventTestReportContainer extends InteractionTestReportContainer {
    subscriptionReport: MicroTestReport
    eventDataReport: EventDataReport
    cancellationReport: MicroTestReport

    constructor(testCycle: number, testScenario: number, name: string) {
        super(testCycle, testScenario, name)
        this.subscriptionReport = new MicroTestReport()
        this.eventDataReport = new EventDataReport()
        this.cancellationReport = new MicroTestReport()
    }

    /**
     * Restructures the ReportContainer to match the structure of the printed Message.
     * @return The restructured testReportContainer.
     */
    getPrintableMessage() {
        return {
            name: this.name,
            passed: this.passed,
            subscriptionReport: this.subscriptionReport.getPrintableMessage(),
            eventDataReport: this.eventDataReport.getPrintableMessage(),
            cancellationReport: this.cancellationReport.getPrintableMessage(),
        }
    }
}

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
    public getResults(): Array<any> {
        //basic getter
        let returnResults = this.results
        return returnResults
    }

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

    public printResults(testingPhase: ListeningType): void {
        writeInGreen("Results of the test with Errors/TotalTests\n")
        writeInGreen("Test Scenario Number > ")
        for (var i = 0; i <= this.maxTestScenario; i++) {
            writeInGreen("TS" + i + "\t")
        }
        writeInGreen("Test Cycle Nb:\n")

        //printing the results
        for (var i = 0; i <= this.testCycleCount; i++) {
            if (testingPhase == ListeningType.Synchronous && i == this.testCycleCount) writeInGreen("Listening Phase\t\t")
            else writeInGreen("TC" + i + "\t\t\t")
            for (var j = 0; j <= this.maxTestScenario; j++) {
                //summing up the fails for this one scenario

                //this try catch exists because not every scenario is obligated to have the same number of messages
                //this is of course not necessary for the current state of the test bench
                let currentScenario: any = this.results[i][j]
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

                    writeInGreen(fails + "/" + curSceLength + "\t") //this is used for displaying how many failures are there for one scenario
                } catch (Error) {
                    writeInGreen(fails + "/" + curSceLength + "\t")
                }
            }
            console.log()
        }

        function writeInGreen(message: string) {
            process.stdout.write("\x1b[32m" + message + "\x1b[0m")
        }
    }
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
