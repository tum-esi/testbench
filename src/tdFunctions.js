"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
var mkdirp = require("mkdirp");
function findProtocol(td) {
    let base = td.base;
    let columnLoc = base.indexOf(":");
    return base.substring(0, columnLoc);
}
exports.findProtocol = findProtocol;
function findPort(td) {
    let base = td.base;
    let columnLoc = base.indexOf(':', 6);
    let divLoc = base.indexOf('/', columnLoc);
    let returnString = base.substring(columnLoc + 1, divLoc);
    return parseInt(returnString);
}
exports.findPort = findPort;
function generateSchemas(td, schemaLocation) {
    console.log('in generateschema functoin');
    let padInitial = "{\n\t\"$schema\": \"http://json-schema.org/draft-04/schema#\",\n\t\"title\": \"";
    let tdInteractions = td.interaction;
    console.log('we here...');
    mkdirp(schemaLocation + "Requests");
    mkdirp(schemaLocation + "Responses");
    let reqSchemaCount = 0;
    let resSchemaCount = 0;
    console.log('interaction length:', tdInteractions.length);
    // extract interactions
    for (var i = 0; i < tdInteractions.length; i++) {
        console.log(tdInteractions[i]);
        let curInter = tdInteractions[i];
        // let type :string = curInter.semanticTypes[0];
        let type = curInter.pattern;
        let name = curInter.name;
        let inputData;
        let outputData;
        //try if you have input data
        try {
            console.log('we 333here...');
            inputData = curInter.inputData;
            let inString = JSON.stringify(inputData);
            //substring is to avoid the brackets at the ends
            let schema = padInitial + name + "\",\n\t" + inString.substring(1, inString.length - 1) + "}";
            let writeLoc = schemaLocation + "Requests/" + name + ".json";
            console.log('we here...');
            fs.writeFileSync(writeLoc, schema);
            reqSchemaCount++;
        }
        catch (Error) {
            //not a problem, maybe it doesnt have input
            console.log('catching first input error....');
        }
        try {
            outputData = curInter.outputData;
            let outString = JSON.stringify(outputData);
            //substring is to avoid the brackets at the ends
            let schema = padInitial + name + "\",\n\t" + outString.substring(1, outString.length - 1) + "}";
            let writeLoc = schemaLocation + "Responses/" + name + ".json";
            fs.writeFileSync(writeLoc, schema);
            resSchemaCount++;
        }
        catch (Error) {
            //not a problem, maybe it doesnt have output
            console.log('catching second output error....');
        }
    }
    console.log(reqSchemaCount + " request schemas and " + resSchemaCount + " response schemas have been created");
}
exports.generateSchemas = generateSchemas;
/*                    {
                        "$ref": "/home/eko/Code/Thing-Description-Code-Generator/TDs/responseOverhead.json#/responseOverhead"
                    },
                    */
