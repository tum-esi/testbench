import ThingDescription, { Interaction } from '@node-wot/td-tools/src/thing-description';
import fs = require('fs');
var jsf = require('json-schema-faker');

export class CodeGenerator {
    private td: ThingDescription;
    private requests:any;
    
    constructor(tdesc: ThingDescription, testConf: any) {
        this.td = tdesc;
        let requestsLoc:string = testConf.TestDataLocation;
        this.generateFakeData(testConf, tdesc.interaction);
    }

    private createRequest(requestName: string, loc: string, pat: string):JSON {
        try {
            let scheme = JSON.parse(fs.readFileSync(loc+"Requests/"+requestName+'-'+pat+".json","utf8"));
            return jsf(scheme);
        } catch(Error) {
            // console.log('\x1b[36m%s\x1b[0m', '* ----no request schema available----')
            return null;
        }
    }

    public generateFakeData(testConf: any, interactions: any) {
        // generates fake data and stores it to config TestDataLocation location

        let requestList = [];
        for (var i in interactions) {
            let scenarioList = [];
            for (var j = 0; j < testConf.Scenarios; j++) {
                // 
                let dataPair = {}
                dataPair['interactionName'] = interactions[i].name;
                dataPair['interactionValue'] = this.createRequest(interactions[i].name, testConf.SchemaLocation, interactions[i].pattern);
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
