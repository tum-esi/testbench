"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
class CodeGenerator {
    constructor(tdesc, testConf) {
        this.td = tdesc;
        let requestsLoc = testConf.RequestsLocation;
        console.log(requestsLoc);
        this.requests = JSON.parse(fs.readFileSync(requestsLoc, "utf8"));
        console.log('code generator init done');
    }
    createRequest(requestName, testScenario, interactionIndex) {
        let inter;
        return this.requests[testScenario][interactionIndex].interactionValue;
        /*
        try {
            inter = findInteractionByName(this.td, requestName);
        } catch (error) {
            logger.error("Interaction "+requestName+  " doesn't exist in this TD")
            throw error;
        }
        
        let type:string = inter.semanticTypes[0];
        if(type == "Property"){
            if (inter.writable){
                return this.requests[requestName][testScenario];
            } else {
                return null;
            }
        } else if (type == "Action"){
            if (inter.inputData){
                return this.requests[requestName][testScenario];
            } else {
                return null;
            }
        } else {
            logger.error("only property and action interaction types are supported for testing")
            return null;
        }
        */
    }
}
exports.CodeGenerator = CodeGenerator;
