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

export function generateSchemas(td:ThingDescription, schemaLocation:string) : void{
    console.log('in generateschema functoin')
    console.log('...................................................');
    console.log('generate schemas from this thing description:', td);
    console.log('...................................................');
    let padInitial:string = "{\n\t\"$schema\": \"http://json-schema.org/draft-04/schema#\",\n\t\"title\": \"";
    let tdInteractions:any= td.interaction;
    let reqSchemaCount : number = 0;
    let resSchemaCount : number = 0;
    mkdirp(schemaLocation + "Requests");
    mkdirp(schemaLocation + "Responses");

    console.log('interaction length:', tdInteractions.length );
    // extract interactions
    for (var i = 0; i < tdInteractions.length; i++) {

        console.log(tdInteractions[i]);

        let curInter : any  = tdInteractions[i];
        // let type :string = curInter.semanticTypes[0];
        let type :string = curInter.pattern;
        let name :string = curInter.name;

        let inputData :any;
        let outputData :any;

        switch (type) {
            case "Property":
                // check for writable 
                if (curInter.writable) {
                    // request schema
                    let dummyType = JSON.stringify(curInter.schema);
                    let schema :string = padInitial+name+"\",\n\t"+dummyType.substring(1,dummyType.length-1)+"}";
                    let writeLoc :string = schemaLocation+"Requests/"+name+"Property.json";
                    fs.writeFileSync(writeLoc, schema);
                    reqSchemaCount ++;

                    // response schema:
                    writeLoc = schemaLocation+"Responses/"+name+"Property.json";
                    fs.writeFileSync(writeLoc, schema);
                    resSchemaCount++;
                } else {
                    // response schema:
                    let dummyType = JSON.stringify(curInter.schema);
                    let schema :string = padInitial+name+"\",\n\t"+dummyType.substring(1,dummyType.length-1)+"}";
                    let writeLoc = schemaLocation+"Responses/"+name+"Property.json";
                    fs.writeFileSync(writeLoc, schema);
                    resSchemaCount++;
                }
                // if not writable test if really not writable... ??

                // todo: check if observable think which request schema for this ? how test observable in general
                break;
            case "Action":
                // check for input and output data , create requests based on this 
                if ("inputSchema" in curInter) {
                    let dummyType = JSON.stringify(curInter.inputSchema);
                    let schema :string = padInitial+name+"\",\n\t"+dummyType.substring(1,dummyType.length-1)+"}";
                    let writeLoc :string = schemaLocation+"Requests/"+name+"Action.json";
                    fs.writeFileSync(writeLoc, schema);
                    reqSchemaCount++;
                }
                if ("outputSchema" in curInter) {
                    let dummyType = JSON.stringify(curInter.outputSchema);
                    let schema :string = padInitial+name+"\",\n\t"+dummyType.substring(1,dummyType.length-1)+"}";
                    let writeLoc = schemaLocation+"Responses/"+name+"Action.json";
                    fs.writeFileSync(writeLoc, schema);
                    resSchemaCount++;
                }
                break;
            case "Event":
                // code...
                let dummyType = '{"type": '+JSON.stringify(curInter.schema)+'}';
                let schema :string = padInitial+name+"\",\n\t"+dummyType.substring(1,dummyType.length-1)+"}";
                let writeLoc = schemaLocation+"Responses/"+name+"Event.json";
                fs.writeFileSync(writeLoc, schema);
                resSchemaCount++;
                break;
            default:
                // code...
                break;
        }
        console.log('...................................................');
    }
    console.log(reqSchemaCount +" request schemas and "+ resSchemaCount+" response schemas have been created")
}
/*                    
{
"$ref": "/home/eko/Code/Thing-Description-Code-Generator/TDs/responseOverhead.json#/responseOverhead"
},
*/
