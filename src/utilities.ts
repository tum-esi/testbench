import * as TDParser from '@node-wot/td-tools';
import * as wot from 'wot-typescript-definitions';
import { Thing } from '@node-wot/td-tools';
var fs = require('fs');
var mkdirp = require("mkdirp");
var jsf = require('json-schema-faker');
var ajValidator = require('ajv');
// a test config file is always configured like this
export interface testConfig {
    TBname?: string;
    http?: {
        port?: number
        allowSelfSigned: boolean;
    };
	coap?: {
		port?: number
	};
    SchemaLocation?: string;
    TestReportsLocation?: string;
    TestDataLocation?: string;
    ActionTimeout?: number;
    Scenarios?: number;
    Repetitions?: number;
    credentials?: any;
}

// -------------------------- FAKE DATA GENERATION ---------------------------------
export class CodeGenerator {
    private td: Thing;
    public requests: any;
    constructor(tdesc: Thing, testConf: any) {
        this.td = tdesc;
        this.generateFakeData(testConf, tdesc);
        this.requests = this.getRequests(testConf.TestDataLocation);
    }
    private createRequest(requestName: string, loc: string, pat: string):JSON {
        try {
            let scheme = JSON.parse(fs.readFileSync(loc+"Requests/"+requestName+'-'+pat+".json","utf8"));
            return jsf(scheme);
        } catch(Error) {
            return null;
        }
    }
    // generates fake data and stores it to config TestDataLocation location
    public generateFakeData(testConf: any, tdesc: Thing) {
        // create interaction list: no optimized soluton: -----------
        let requestList = [];
        for (var key in tdesc.properties) {
            let scenarioList = [];
            for (var j = 0; j < testConf.Scenarios; j++) { 
                let dataPair = {}
                dataPair['interactionName'] = key;
                dataPair['interactionValue'] = this.createRequest(key, testConf.SchemaLocation, 'Property');
                scenarioList.push(dataPair);
            }
            requestList.push(scenarioList);
        }
        for (var key in tdesc.actions) {
            let scenarioList = [];
            for (var j = 0; j < testConf.Scenarios; j++) { 
                let dataPair = {}
                dataPair['interactionName'] = key;
                dataPair['interactionValue'] = this.createRequest(key, testConf.SchemaLocation, 'Action');
                scenarioList.push(dataPair);
            }
            requestList.push(scenarioList);
        }
        for (var key in tdesc.events) {
            let scenarioList = [];
            for (var j = 0; j < testConf.Scenarios; j++) { 
                let dataPair = {}
                dataPair['interactionName'] = key;
                dataPair['interactionValue'] = this.createRequest(key, testConf.SchemaLocation, 'Event');
                scenarioList.push(dataPair);
            }
            requestList.push(scenarioList);
        }
        fs.writeFileSync(testConf.TestDataLocation, JSON.stringify(requestList, null, ' '));
    }
    // helper function finds created data:
    public findRequestValue(requestsLoc, testScenario, interactionIndex, propertyName) {
        let requests = JSON.parse(fs.readFileSync(requestsLoc,"utf8"));
        return requests[interactionIndex][testScenario]['interactionValue'];
    }
    public getRequests(requestsLoc) {
        return JSON.parse(fs.readFileSync(requestsLoc,"utf8"));
    }
}


// ------------------------ SCHEMA VALIDATION -----------------------------------
var ajV = new ajValidator({allErrors: true});
export function validateRequest(requestName: string, request: JSON, schemaLoc: string, styp: string) : Array<any> {
	let reqSchema : any = fs.readFileSync(schemaLoc+"Requests/"+requestName+'-'+styp+".json","utf8");
	var valid = ajV.validate(JSON.parse(reqSchema),request);
	return ajV.errors;
}

export function validateResponse(responseName: string, response: JSON, schemaLoc: string, styp: string) : Array<any> {
	let resSchema : any = fs.readFileSync(schemaLoc+"Responses/"+responseName+'-'+styp+".json","utf8");
	var valid = ajV.validate(JSON.parse(resSchema),response);
	return ajV.errors;
}


// ------------------------ SCHEMA GENERATION ------------------------------------

// extracts json schema from property
function extractSchema(fragment: wot.PropertyFragment | wot.EventFragment) {
    let extractedSchema;
    if (fragment.type == 'object') {
        if (fragment.hasOwnProperty('properties')) {
            if (fragment.hasOwnProperty('required')) {
                extractedSchema= '"type": "object","properties":'+JSON.stringify(fragment.properties)+',"required":'+JSON.stringify(fragment.required);
            } else {
                extractedSchema= '"type": "object","properties":'+JSON.stringify(fragment.properties);
            }
        } else {
            extractedSchema= '"type": "object"';
        }
    } else if (fragment.type == 'array'){
        if (fragment.hasOwnProperty('items')) {
            extractedSchema= '"type": "array","items":'+JSON.stringify(fragment.items);
        } else {
            extractedSchema= '"type": "array"';
        }
    } else if (fragment.type == 'number' || fragment.type == 'integer'){
        if (fragment.hasOwnProperty('minimum')) {
            extractedSchema = '"type": "' + fragment.type+'","minimum":'+fragment.minimum;
        }
        if (fragment.hasOwnProperty('maximum')) {
            if (fragment.hasOwnProperty('minimum')){
            extractedSchema += ',"maximum":' + fragment.maximum;
            } else {
                extractedSchema = '"type": "' + fragment.type + '","maximum":' + fragment.maximum;
            }
        } else {
            extractedSchema = '"type":"' + fragment.type + '"';
        }
    }else {
        // handle other schemas:
        extractedSchema= '"type":"'+fragment.type+'"';
    }
    if (fragment.hasOwnProperty('enum') && fragment.hasOwnProperty('type')){
        extractedSchema += ',"enum":' + JSON.stringify(fragment.enum)+'';
    }
    if (fragment.hasOwnProperty('enum') && !fragment.hasOwnProperty('type')) {
        extractedSchema = '"enum":' + JSON.stringify(fragment.enum) +'';
    }
    return extractedSchema;
}
// writes extracted schema to file
function writeSchema(name, dataSchema, schemaLocationR, interaction) {
    let schema :string = '{\n\t\"name":\"'+name+'\",\n\t'+dataSchema+'\n\t}';
    let writeLoc :string = schemaLocationR+name+"-"+interaction+".json";
    fs.writeFileSync(writeLoc, schema);
}
// generates schemas from all interactions
export function generateSchemas(td: Thing, schemaLocation: string, logMode: boolean): number {
    let schemaLocationReq = schemaLocation + 'Requests/';
    let schemaLocationResp = schemaLocation + 'Responses/';
    let reqSchemaCount : number = 0;
    let resSchemaCount : number = 0;
    mkdirp.sync(schemaLocationReq);
    mkdirp.sync(schemaLocationResp);

    // property schemas:
    for (var key in td.properties) {
        if (td.properties.hasOwnProperty(key)) {           
            // checks if writable:
            if (td.properties[key].writable) {
                // create request schema:
                let dataSchema = extractSchema(td.properties[key]);
                writeSchema(key, dataSchema, schemaLocationReq, 'Property');
                reqSchemaCount++;
                // response schema:
                writeSchema(key, dataSchema, schemaLocationResp, 'Property');
                resSchemaCount++;
            } else {
                // create response schema:
                let dataSchema = extractSchema(td.properties[key]);
                writeSchema(key, dataSchema, schemaLocationResp, 'Property');;
                resSchemaCount++;
            }
        }
    }
    // action schemas:
    for (var key in td.actions) {
        if (td.actions.hasOwnProperty(key)) {
            if (td.actions[key].hasOwnProperty('input')) {
                // create request schema:
                let dataSchema = 
                writeSchema(key, JSON.stringify(td.actions[key].input).slice(0, -1).substring(1), schemaLocationReq, 'Action');
                reqSchemaCount++;
            }
            if (td.actions[key].hasOwnProperty('output')) {
                // create response schema:
                writeSchema(key, JSON.stringify(td.actions[key].output).slice(0, -1).substring(1), schemaLocationResp, 'Action');;
                resSchemaCount++;
            }
        }
    }
    // event schemas:
    for (var key in td.events) {
        if (td.events.hasOwnProperty(key)) {
            let dataSchema = extractSchema(td.events[key]);
            writeSchema(key, dataSchema, schemaLocationReq, 'Event');
            writeSchema(key, dataSchema, schemaLocationResp, 'Event');
            reqSchemaCount++;
            resSchemaCount++;
        }
    }
    if (logMode) console.log('\x1b[36m%s%s\x1b[0m', "* ", reqSchemaCount + " request schemas and " + resSchemaCount + " response schemas have been created");
    if ((reqSchemaCount == 0) && (resSchemaCount == 0)) {
        if (logMode) console.log('\x1b[36m%s%s\x1b[0m', "* !!! WARNING !!! NO INTERACTIONS FOUND");
        return 1;
    }
    return 0;
}

// --------------------------- UTILITY FUNCTIONS -------------------------------------
export function getInteractionByName(td: Thing, name: string): [string, wot.PropertyFragment | wot.ActionFragment | wot.EventFragment] {
    for (var key in td.properties) {
        if (key == name) {
            return ['Property', td.properties[key]];
        }
    }
    for (var key in td.actions) {
        if (key == name) {
            return ['Action', td.actions[key]];
        }
    }
    for (var key in td.events) {
        if (key == name) {
            return ['Event', td.events[key]];
        }
    }
}

export function promiseTimeout(ms, promise){
  // Create a promise that rejects in <ms> milliseconds
  let timeout = new Promise((resolve, reject) => {
    let id = setTimeout(() => {
      // clearTimeout(id);
      reject('Timed out in '+ ms + 'ms.')
    }, ms)
  })
  // Returns a race between our timeout and the passed in promise
  return Promise.race([
    promise,
    timeout
  ])
}
