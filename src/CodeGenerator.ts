import ThingDescription, { Interaction } from '@node-wot/td-tools/src/thing-description';
import fs = require('fs');
var jsf = require('json-schema-faker');

/*
QUESTIONS:

Do we need requests-simpleString.json file with requests 
or can we parse schema if there is one
to use json faker and create request inside method. not beforehand

do we need the values testscenario and interactionIndex elsewhere ? or can we discard them too ?

*/

export class CodeGenerator {
    private td: ThingDescription;
    private requests:any;
    
    constructor(tdesc: ThingDescription, testConf: any) {
        this.td = tdesc;
        let requestsLoc:string = testConf.RequestsLocation;
        console.log(requestsLoc);
        this.requests =  JSON.parse( fs.readFileSync(requestsLoc,"utf8"));
        console.log('* code generator init done')
    }

    public createRequest(requestName: string, loc: string, pat: string):JSON {
        try {
            let scheme = JSON.parse(fs.readFileSync(loc+"Requests/"+requestName+pat+".json","utf8"));
            console.log('* PRINTING SCHEME:', scheme);
            return jsf(scheme);
        } catch(Error) {
            console.log('* ----no request schema available----')
            return null;
        }
    }
}