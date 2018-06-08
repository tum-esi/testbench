"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
class TestReport {
    constructor() {
        this.results = [];
        this.testCycleCount = -1;
        this.testScenarioCount = -1;
        this.maxTestScenario = 0;
    }
    getResults() {
        return this.results;
    }
    //at each new test cycle this should be called
    //it creates a new empty array that will be later on filled with test scenarios
    addTestCycle() {
        this.testCycleCount++;
        this.testScenarioCount = -1;
        /*
        let nextCycle: Array<any> = [];
        this.results.push(nextCycle);
        */
        this.results[this.testCycleCount] = [];
    }
    //at each new test scenario that has different message exchanges this should be called
    //it creates a new empty array that will be later on filled with objects that represent message exchanges
    addTestScenario( /*tester:Tester,callback:Function*/) {
        this.testScenarioCount++;
        if (this.testScenarioCount > this.maxTestScenario) { //update the max value that is used for displaying
            this.maxTestScenario = this.testScenarioCount;
        }
        this.results[this.testCycleCount][this.testScenarioCount] = [];
        //callback(tester);
    }
    //this adds a message exchange
    //tha name of the message and the results of the exchange should be entered in the arguments
    //after getting all the arguments, these arguments are transformed into a JSON object that represents the exchange that has just occured
    addMessage(testCycle, testScenario, name, result, sent, received, errorId, error) {
        //message to be built
        let curMessage = { "name": name, "result": result, "sent": sent, "received": received, "errorId": errorId, "error": error };
        //filling the results
        this.results[testCycle][testScenario].push(curMessage);
    }
    printResults() {
        console.log("Results of the last test are given in the following table");
        process.stdout.write("Test Scenario Number > ");
        for (var i = 0; i <= this.maxTestScenario; i++) {
            process.stdout.write("TS" + i + "\t");
        }
        console.log("Test Cycle Nb:");
        //printing the results
        for (var i = 0; i <= this.testCycleCount; i++) {
            process.stdout.write("TC" + i + "\t \t \t");
            for (var j = 0; j <= this.maxTestScenario; j++) {
                //summing up the fails for this one scenario
                //this try catch exists because not every scenario is obligated to have the same number of messages
                //this is of course not necessary for the current state of the test bench
                let currentScenario = this.results[i][j];
                let curSceLength = currentScenario.length;
                let fails = 0;
                try {
                    for (var k = 0; k < curSceLength; k++) {
                        let curMessage = currentScenario[k];
                        //if the results of the single test is false, the number to be displayed in the table is incremented
                        let curResult = curMessage.result;
                        if (!curResult) {
                            fails++;
                        }
                    }
                    process.stdout.write(fails + "/" + curSceLength + "\t"); //this is used for displaying how many failures are there for one scenario
                }
                catch (Error) {
                    process.stdout.write(fails + "/" + curSceLength + "\t");
                }
            }
            console.log();
        }
    }
    storeReport(location) {
        var mkdirp = require("mkdirp");
        try {
            mkdirp(location);
            fs.writeFileSync(location + "testReport.json", JSON.stringify(this.results, null, 4));
            console.log("Report stored in " + location);
        }
        catch (error) {
            console.log("Report couldnt be stored");
        }
    }
}
exports.TestReport = TestReport;
