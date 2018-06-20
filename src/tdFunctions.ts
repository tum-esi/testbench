import  ThingDescription from '@node-wot/td-tools/src/thing-description';
import Interaction from '@node-wot/td-tools/src/thing-description';
import * as TDParser from '@node-wot/td-tools/src/td-parser';
import fs = require('fs');
var mkdirp = require("mkdirp");

export function findProtocol(td : ThingDescription) : string {
	let base:string = td.base;
	let columnLoc:number = base.indexOf(":");
	return base.substring(0,columnLoc);
}

export function findPort(td : ThingDescription) : number { 
	let base:string = td.base;
	let columnLoc:number= base.indexOf(':',6);
	let divLoc:number = base.indexOf('/',columnLoc);
	let returnString:string = base.substring(columnLoc+1, divLoc);
	return parseInt(returnString);
}

// add required object key to json type object
function addRequired(scheme) {
    if (scheme['type'] == 'object') {
        let propNames = [];
        for (var propName in scheme['properties']) {
            propNames.push(propName);
        }
        // json schema faker requires this add on otherwise creates empty data thats valid
        scheme['required'] = propNames;
        return JSON.stringify(scheme);
    } else {
        return JSON.stringify(scheme);
    }
}
// writes extracted schema to file
function writeSchema(name, dataSchema, schemaLocation, folder, interaction) {
    let padInitial:string = "{\n\t\"$schema\": \"http://json-schema.org/draft-04/schema#\",\n\t\"title\": \"";
    let schema :string = padInitial+name+"\",\n\t"+dataSchema.substring(1,dataSchema.length-1)+"}";
    let writeLoc :string = schemaLocation+folder+name+"-"+interaction+".json";
    fs.writeFileSync(writeLoc, schema);
}

// TODO: IMPLEMENT RECURSIVE SCHEMA GENERATION

export function generateSchemas(td:ThingDescription, schemaLocation:string) : void{
    let tdInteractions:any= td.interaction;
    let reqSchemaCount : number = 0;
    let resSchemaCount : number = 0;
    mkdirp(schemaLocation + "Requests");
    mkdirp(schemaLocation + "Responses");

    // extract interactions
    for (var i = 0; i < tdInteractions.length; i++) {

        console.log("* ", tdInteractions[i]);

        let curInter : any  = tdInteractions[i];
        let type :string = curInter.pattern;
        let name :string = curInter.name;

        let inputData :any;
        let outputData :any;

        switch (type) {
            case "Property":
                // check for writable 
                if (curInter.writable) {
                    // request schema
                    let dataSchema = addRequired(curInter.schema);
                    writeSchema(name, dataSchema, schemaLocation, 'Requests/', type);
                    reqSchemaCount ++;
                    // response schema:
                    writeSchema(name, dataSchema, schemaLocation, 'Responses/', type);
                    resSchemaCount++;
                } else {
                    // response schema:
                    let dataSchema = addRequired(curInter.schema);
                    writeSchema(name, dataSchema, schemaLocation, 'Responses/', type);;
                    resSchemaCount++;
                }
                // if not writable test if really not writable... ??
                // todo: check if observable think which request schema for this ? how test observable in general
                break;
            case "Action":
                // check for input and output data , create requests based on this 
                if ("inputSchema" in curInter) {
                    let dataSchema = addRequired(curInter.inputSchema);
                    writeSchema(name, dataSchema, schemaLocation, 'Requests/', type);
                    reqSchemaCount++;
                }
                if ("outputSchema" in curInter) {
                    let dataSchema = addRequired(curInter.outputSchema);
                    writeSchema(name, dataSchema, schemaLocation, 'Responses/', type);
                    resSchemaCount++;
                }
                break;
            case "Event":
                // treated exactly like Property, cause same description:
                let padInitial:string = "{\n\t\"$schema\": \"http://json-schema.org/draft-04/schema#\",\n\t\"title\": \"";
                let dummyType = '{"type": '+JSON.stringify(curInter.schema)+'}';
                let schema :string = padInitial+name+"\",\n\t"+dummyType.substring(1,dummyType.length-1)+"}";
                let writeLoc = schemaLocation+"Responses/"+name+"-"+"Event.json";
                fs.writeFileSync(writeLoc, schema);
                resSchemaCount++;
                break;
            default:
                // code...
                break;
        }
        console.log('\x1b[36m%s\x1b[0m', '* ...................................................');
    }
    console.log('\x1b[36m%s%s\x1b[0m', "* ", reqSchemaCount + " request schemas and " + resSchemaCount + " response schemas have been created")
}
