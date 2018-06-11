// import  ThingDescription from '@node-wot/td-tools/src/thing-description';
// import Interaction from '@node-wot/td-tools/src/thing-description';
// import * as TDParser from '@node-wot/td-tools/src/td-parser';
import fs = require('fs');
var Validator  = require('jsonschema').Validator;

var v = new Validator();

export function validateRequest(requestName: string, request: JSON, schemaLoc: string, styp: string) : Array<any> {
    let reqSchema : any = fs.readFileSync(schemaLoc+"Requests/"+requestName+styp+".json","utf8");
    return v.validate(request, JSON.parse(reqSchema)).errors;
}

export function validateResponse(responseName: string, response: JSON, schemaLoc: string, styp: string) : Array<any> {
    let resSchema : any = fs.readFileSync(schemaLoc+"Responses/"+responseName+styp+".json","utf8");
    console.log('1. propertyName:  ,2.PropertyData:  , 3.Propertylocation', responseName, response, resSchema);

    return v.validate(response, JSON.parse(resSchema)).errors;
}

// export function validateTD(td : ThingDescription) : boolean {
//     return true;
// }