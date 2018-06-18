import ThingDescription, { Interaction } from '@node-wot/td-tools/src/thing-description';
import fs = require('fs');
var jsf = require('json-schema-faker');

export class CodeGenerator {
    private td: ThingDescription;
    private requests:any;
    
    constructor(tdesc: ThingDescription, testConf: any) {
        this.td = tdesc;
        let requestsLoc:string = testConf.RequestsLocation;
        this.requests =  JSON.parse( fs.readFileSync(requestsLoc,"utf8"));
    }

    public createRequest(requestName: string, loc: string, pat: string):JSON {
        try {
            let scheme = JSON.parse(fs.readFileSync(loc+"Requests/"+requestName+'-'+pat+".json","utf8"));
            return jsf(scheme);
        } catch(Error) {
            console.log('\x1b[36m%s\x1b[0m', '* ----no request schema available----')
            return null;
        }
    }


}