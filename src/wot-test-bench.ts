import * as wot from "wot-typescript-definitions"
import { Servient } from "@node-wot/core"
import { HttpServer } from "@node-wot/binding-http"
import { HttpClientFactory } from "@node-wot/binding-http"
import { HttpsClientFactory } from "@node-wot/binding-http"
import { FileClientFactory } from "@node-wot/binding-file"
import { MqttClientFactory } from "@node-wot/binding-mqtt"
import { CoapServer } from "@node-wot/binding-coap"
import { CoapClientFactory } from "@node-wot/binding-coap"
import { CoapsClientFactory } from "@node-wot/binding-coap"
import {URL, URLSearchParams} from "url";
import * as fetch from "node-fetch";
import { Tester } from "./Tester"
import { parseArgs, configPath, tdPaths } from "./config"
import { testConfig, ListeningType, logFormatted } from "./utilities"
import { TestReport, VulnerabilityReport, TotalReport } from "./TestReport"
import { type } from "os"
import { stringify } from "querystring"

var jsf = require("json-schema-faker")
const fs = require("fs")

var configFile = "default-config.json"
if (process.argv.length > 2) {
    parseArgs(tdPaths)
    configFile = configPath
}
//getting the test config and extraction anything possible
let testConfig: testConfig = JSON.parse(fs.readFileSync(configFile, "utf8"))
let tbName: string = testConfig["TBname"]
let tutName: string = ""

//creating the Test Bench as a servient.
//It will test the Thing as a client and interact with the tester as a Server
let srv = new Servient()
// srv.addCredentials(testConfig.credentials);
console.log(srv)
let httpServer = typeof testConfig.http.port === "number" ? new HttpServer(testConfig.http) : new HttpServer()
let coapServer = typeof testConfig.coap.port === "number" ? new CoapServer(testConfig.coap.port) : new CoapServer()
srv.addServer(httpServer)
srv.addServer(coapServer)
srv.addClientFactory(new FileClientFactory())
srv.addClientFactory(new HttpClientFactory(testConfig.http))
srv.addClientFactory(new HttpsClientFactory(testConfig.http))
srv.addClientFactory(new CoapClientFactory())
srv.addClientFactory(new CoapsClientFactory())
srv.addClientFactory(new MqttClientFactory())

srv.start()
    .then(async (WoT) => {
        logFormatted("TestBench servient started")
        const TestBenchT = await WoT.produce({
            title: tbName,
            description:
                "WoT Test Bench tests a Thing by getting its TD and executing all of its interactions with data generated in runtime. " +
                "For simple use, invoke the fastTest action with the TD of your Thing as input data",
            "@context": ["https://www.w3.org/2019/wot/td/v1", { cov: "http://www.example.org/coap-binding#" }],
            properties: {
                testConfig: {
                    type: "string",
                    writeOnly: false,
                    readOnly: false,
                    description:
                        "(Optional) Writing to this property configures the Test Bench. TDs with security schemes require this property to " +
                        "contain the security credentials",
                },
                testBenchStatus: {
                    type: "string",
                    writeOnly: false,
                    readOnly: true,
                    description: "(not finished) Shows the status of the test bench whether it is currently testing a device or not",
                },
                thingUnderTestTD: {
                    type: "string",
                    writeOnly: false,
                    readOnly: false,
                    description: "Write to this property in order to give the TD of your Thing to test. Not necessary for fastTest",
                },
                testData: {
                    type: "string",
                    writeOnly: false,
                    readOnly: false,
                    description:
                        "(Optional) This property contains all the data that will be sent by the Test Bench to the Thing under Test. " +
                        "You can also write in custom data",
                },
                testReport: {
                    type: "string",
                    writeOnly: false,
                    readOnly: true,
                    description: "Contains all of the outputs of the testing. Not necessary for fastTest",
                },
            },
            actions: {
                fastTest: {
                    input: {
                        type: "string",
                    },
                    output: {
                        type: "string",
                    },
                    description: "Send a TD as input data and it will return a test report once the test has finished",
                },
                initiate: {
                    input: {
                        type: "boolean",
                    },
                    output: {
                        type: "string",
                    },
                    description:
                        "By invoking this action, the test bench consumes the thing under test, generates the data to be sent. Not necessary for fastTest",
                },
                testThing: {
                    input: {
                        type: "boolean",
                    },
                    output: {
                        type: "boolean",
                    },
                    description: "By invoking this action, the testing starts and produces a test report that can be read. Not necessary for fastTest",
                },
                testVulnerabilities: {
                    output: {
                        type: "string"
                    },
                    description: "Tests some basic security and safety vulnerabilities, by sending the TD"
                }
            },
        })

        let tester: Tester = null
        let fastMode: boolean = false;
        // init property values
        await TestBenchT.writeProperty("testConfig", testConfig)
        await TestBenchT.writeProperty("testBenchStatus", "")
        await TestBenchT.writeProperty("thingUnderTestTD", "")

        // set action handlers
        TestBenchT.setActionHandler("fastTest", async (thingTD: string) => {
            //get the input
            await TestBenchT.writeProperty("thingUnderTestTD", thingTD)
            //write it into tutTD prop
            //call initiate
            await TestBenchT.invokeAction("initiate", true)
            //call testThing
            await TestBenchT.invokeAction("testThing", true)
            //read testReport
            const conformanceReport = await TestBenchT.readProperty('testReport');
            // call testVulnerabilities
            fastMode = true;
            await TestBenchT.invokeAction('testVulnerabilities', thingTD);
            // read testReport
            const vulnReport = await TestBenchT.readProperty('testReport');
            var totalReport: TotalReport = new TotalReport(conformanceReport, vulnReport);
            //create new report containing both conformance results and vulnerability results.
            await TestBenchT.writeProperty('testReport', totalReport);
            //write to testReport
            return await TestBenchT.readProperty("testReport")
            //return the simplified version
        })
        /* update config file, gets tutTD if not "", consume tutTD, adds
             Tester, set generated data to testData: */
        TestBenchT.setActionHandler("initiate", async (logMode: boolean) => {
            try {
                await TestBenchT.writeProperty("testReport", "[]")
            } catch {
                logFormatted(":::::ERROR::::: Init: write testReport property failed")
                return "Could not reinitialize the test report"
            }

            try {
                var newConf = await TestBenchT.readProperty("testConfig")
            } catch {
                logFormatted(":::::ERROR::::: Init: Get config property failed")
                return "Initiation failed"
            }
            testConfig = await JSON.parse(JSON.stringify(newConf))

            /* fs.writeFileSync('./default-config.json',
                        JSON.stringify(testConfig, null, ' ')); */
            srv.addCredentials(testConfig.credentials)

            console.log('------------------srv.getCredentials()', srv.getCredentials("urn:dev:wot:experiment:counter-thing"));

            try {
                var tutTD = await TestBenchT.readProperty("thingUnderTestTD")
            } catch {
                logFormatted(":::::ERROR::::: Init: Get tutTD property failed")
                return "Initiation failed"
            }

            if (JSON.stringify(tutTD) == "") {
                return "Initiation failed, Thing under Test is an empty string."
            }

            const consumedTuT: wot.ConsumedThing = await WoT.consume(tutTD)
            tester = new Tester(testConfig, consumedTuT)
            const returnCheck = tester.initiate(logMode)

            if (returnCheck == 0) {
                try {
                    await TestBenchT.writeProperty("testData", tester.codeGen.requests)
                } catch {
                    logFormatted(":::::ERROR::::: Init: Set testData property failed")
                    return "Initiation failed"
                }
                return "Initiation was successful."
            } else if (returnCheck == 1) {
                try {
                    await TestBenchT.writeProperty("testData", tester.codeGen.requests)
                } catch {
                    logFormatted(":::::ERROR::::: Init: Set testData property failed")
                    return "Initiation failed"
                }
                return "Initiation was successful, but no interactions were found."
            }
            return "Initiation failed"
        })

        // Tests the tut. If input true, logMode is on.
        TestBenchT.setActionHandler("testThing", async (logMode: boolean) => {
            try {
                var data = await TestBenchT.readProperty("testData")
            } catch {
                logFormatted(":::::ERROR::::: TestThing: Get test data property failed")
                return false
            }

            await fs.writeFileSync(testConfig.TestDataLocation, JSON.stringify(data, null, " "))
            logFormatted("------ START OF TESTTHING METHOD ------")
            try {
                var testReport: TestReport = await tester.firstTestingPhase(testConfig.Repetitions, testConfig.Scenarios, logMode)
                testReport.printResults(ListeningType.Asynchronous)
                await TestBenchT.writeProperty("testReport", testReport.getResults())
            } catch {
                logFormatted(":::::ERROR::::: TestThing: Error during first test phase.")
                return
            }

            if (testConfig.EventAndObservePOptions.Synchronous.isEnabled) secondTestingPhase()
            return

            async function secondTestingPhase() {
                try {
                    // Starting the second testing phase.
                    const testReportHasChanged: boolean = await tester.secondTestingPhase(testConfig.Repetitions)
                    testReport.storeReport(testConfig.TestReportsLocation, tutName)
                    if (testReportHasChanged) {
                        await TestBenchT.writeProperty("testReport", testReport.getResults())
                        testReport.printResults(ListeningType.Synchronous)
                    }
                } catch {
                    logFormatted(":::::ERROR::::: TestThing: Error during second test phase.")
                }
            }
        })
        
        // Tests the Thing for security and safety.
        TestBenchT.setActionHandler("testVulnerabilities", async () => {
            // Read TD from the property.
            const td = await TestBenchT.readProperty("thingUnderTestTD");

            // Arrays to store pre-determined set of credentials.
            var pwArray: Array<string> = [];
            var idArray: Array<string> = [];

            var scheme: string; // Underlying security scheme.
            var schemeName: string; // Covering name for security scheme.

            var report: VulnerabilityReport = new VulnerabilityReport();
            
            // Variables to pass credentials or token.
            var username: string;
            var password: string;
            var token: string;

            // Assuming single security scheme.
            if (Array.isArray[td['security']]){
                if (td['security'].length !== 1){
                    throw "Error: multiple security schemes cannot be tested for now.";
                } else{
                    schemeName = td['security'][0];
                    scheme = td['securityDefinitions'][schemeName]["scheme"];
                }
            }
            else{
                schemeName = td['security'];
                scheme = td['securityDefinitions'][schemeName]["scheme"];
            }

            try{ // Reading common passwords & usernames.
                var passwords: string;
                var ids: string;

                if (fastMode){
                    // This is the case when 'testVulnerabilities' is called from the 'fastTest' action. Uses short lists in order not to take a long time.
                    passwords = fs.readFileSync('Resources/passwords-short.txt', 'utf-8');
                    ids = fs.readFileSync('Resources/usernames-short.txt', 'utf-8');
                }
                else{
                    passwords = fs.readFileSync('Resources/passwords.txt', 'utf-8');
                    ids = fs.readFileSync('Resources/usernames.txt', 'utf-8');
                }

                const pwLines: Array<string> = passwords.split(/\r?\n/);
                const idLines: Array<string> = ids.split(/\r?\n/);

                pwLines.forEach((line) => pwArray.push(line));
                idLines.forEach((line) => idArray.push(line));
            }
            catch(err){
                console.error('Error while trying to read usernames and passwords:', err);
                process.exit(1);
            }
            
            logFormatted("testVulnerabilities may take more than an hour.");

            /**
             * The main brute-forcing function.
             * @param myURL URL to be tested.
             * @param options Options for the required HTTP(s) request.
             * @param location Determines where credentials will be stored.
             */
            async function isPredictable(myURL: URL, options: object, location?: string): Promise<boolean>{
                for (var id of idArray){
                    for (var pw of pwArray){

                        try{
                            switch(scheme){
                                case 'basic':
                                    if (location === 'header'){
                                        options['headers']['Authorization'] = 'Basic ' + 
                                                Buffer.from(id + ":" + pw).toString("base64");
                                    }
                                    else // TODO: Add other "in" parameters.
                                        throw 'Currently auth. info can only be stored at the header.';
                                    break;
                                case 'oauth2':
                                    options['body'].set('client_id', id);
                                    options['body'].set('client_secret', pw);
                                    break;
                            }
                            var result: any = await fetch(myURL.toString(), options);
                            if (result.ok){
                                username = id;
                                password = pw;

                                if (scheme == 'oauth2')
                                    token = (await result.json())['access_token'];
                                return true;
                            }
                        }
                        catch(e){
                            throw e;
                        }
                    }
                }
                // Will return false if no id-pw pair passes, indicating not-weak credentials.
                return false;
            }
            /**
             * Tries sending requests with types other than the given one.
             * @param type input type of InteractionAffordance, if exists.
             * @param myURL URL of the related form.
             * @param options Request options.
             */
            async function typeFuzz(type: string, myURL: URL, options: object){
                var accepts: Array<string> = [];
                
                try{
                    if(type != 'object'){
                        options['body'] = JSON.stringify({key: 'value'});
                        var response = await fetch(myURL, options);
                        if (response.ok) accepts.push('object');
                    }
                    if (type != 'array'){
                        options['body'] = JSON.stringify([1,2,3]);
                        var response = await fetch(myURL, options);
                        if (response.ok) accepts.push('array');
                    }
                    if (type != 'string'){
                        options['body'] = 'TYPEFUZZ';
                        var response = await fetch(myURL, options);
                        if (response.ok) accepts.push('string');
                    }
                    if (type != 'integer'){
                        options['body'] = JSON.stringify(42);
                        var response = await fetch(myURL, options);
                        if (response.ok) accepts.push('integer');
                    }
                    if (type != 'number'){
                        options['body'] = JSON.stringify(2.71828182846);
                        var response = await fetch(myURL, options);
                        if (response.ok) accepts.push('number');
                    }
                    if (type != 'boolean'){
                        options['body'] = JSON.stringify(true);
                        var response = await fetch(myURL, options);
                        if (response.ok) accepts.push('boolean');
                    }
                }
                catch(e){
                    throw 'typeFuzz() resulted in an error:';
                }
                return accepts;
            }
            /**
             * Return credentials of tut, if exists.
             */
            function getCredentials(): string {
                let creds:object = testConfig.credentials[td['id']]
                
                if (creds != undefined){
                    if (scheme == 'basic')
                        return Buffer.from(creds['username'] + ':' + creds['password']).toString('base64');
                    if (scheme == 'oauth2')
                        return creds['token'];
                }
                else
                    return null;
            }
            /**
             * Simple function to create HTTP(s) request options from given parameters.
             */
            function createRequestOptions(url: URL, op: string): object{
                return {
                    hostname: url.hostname,
                    path: url.pathname,
                    port: url.port,
                    headers:{},
                    method: op
                }
            }
            /**
             * Returns the related form of the InteractionAffordance with given op.
             */
            function getForm(op: string, forms: Array<any>){

                for (var i = 0; i < forms.length; i++){
                    if (forms[i]['op'].includes(op))
                        return forms[i];
                }
                return null;
            }
            switch(scheme){
                case "basic":
                    var location: string; // The 'in' parameter of the TD Spec.
                    report.scheme = 'basic';

                    if(!td['securityDefinitions'][schemeName]['in']){ // Default value.
                        location = 'header';
                    }
                    else{
                        location = td['securityDefinitions'][schemeName]['in'];
                    }

                    if (td['properties'] != undefined){ // Properties exist.

                        const properties: any = Object.values(td['properties']);
                        
                        for (var i=0; i < properties.length; i++){
                            let property: any = properties[i];

                            // Creating propertyReport with the name of the property.
                            report.createPropertyReport(Object.keys(td['properties'])[i]);
                            report.propertyReports[i].createSecurityReport();

                            if (!property.writeOnly){ // Property can be read, supposedly?
                                try{
                                    // First tries to 'readproperty'.
                                    var form = getForm('readproperty', property.forms);

                                    // Check if the interaction has a different security scheme.
                                    if (form['security'] != undefined){
                                        if (Array.isArray(form['security'])){
                                            if (!form['security'].includes(schemeName))
                                                return "Testing multiple security schemas are not currently available.";
                                        }
                                        else if (form['security'] != schemeName)
                                            return "Testing multiple security schemas are not currently available.";
                                    }
                                    
                                    var propertyURL: URL = new URL(form['href']);
                                    var method: string = form['htv:methodName'];
                                    
                                    if(method == null) method = 'GET';
            
                                    var propertyOptions: object = createRequestOptions(propertyURL, method);
            
                                    // Brute-forcing with 'GET' requests, with the help of above lines.
                                    var weakCredentials: boolean = await isPredictable(propertyURL, propertyOptions, location);
                                    const creds: string = getCredentials();
                                    
                                    if (weakCredentials || (creds != null)){ // Have credentials: either from brute-force or they are already given.
                                        report.propertyReports[i].security.passedDictionaryAttack = !weakCredentials;
            
                                        report.propertyReports[i].createSafetyReport();
                                        
                                        if (!weakCredentials) { // Bruteforce failed, test 'readproperty' with given credentials.
                                            propertyOptions['headers']['Authorization'] = 'Basic ' + creds;

                                            // Making sure that the property is readable.
                                            let isReadable = await fetch(propertyURL, propertyOptions);
                                            if (isReadable.ok)
                                                report.propertyReports[i].isReadable(true);

                                            report.propertyReports[i].addDescription('Not weak username-password');
                                        }
                                        else {
                                            // If brute-force successes it is already readable.
                                            report.propertyReports[i].isReadable(true);
                                            report.propertyReports[i].addDescription('Weak username-password');
                                            report.propertyReports[i].addCredentials(username, password);
                                        }
                                        // Trying to 'writeproperty' with different types.
                                        form = getForm('writeproperty', property.forms);
            
                                        // This time 'form' can be null in case 'property' is 'readOnly'.
                                        if (form != null){
                                            propertyURL= new URL(form['href']);
                                            method = form['htv:methodName'];
            
                                            if (method == null) method = 'PUT';
            
                                            propertyOptions = createRequestOptions(propertyURL, method);

                                            var contentType: string = form['contentType'];
            
                                            if (contentType == undefined) contentType = 'application/json';
                                            propertyOptions['headers']['Content-Type'] = contentType;

                                            if(!weakCredentials)
                                                propertyOptions['headers']['Authorization'] = 'Basic ' + creds;
                                            else
                                                propertyOptions['headers']['Authorization'] = 'Basic ' +
                                                    Buffer.from(username + ':' + password).toString('base64');

                                            // Types that should not be normally allowed.
                                            var types: string[] = await typeFuzz(property.type, propertyURL, propertyOptions);                                    
                                            types.forEach(type => report.propertyReports[i].addType(type));
            
                                            // Trying to write the real type, if cannot write any exceptional type.
                                            if (types.length == 0){
                                                propertyOptions['body'] = JSON.stringify(jsf(property));

                                                let isWritable = await fetch(propertyURL, propertyOptions);
                                                if (isWritable.ok)
                                                    report.propertyReports[i].isWritable(true);
                                            }
                                            else report.propertyReports[i].isWritable(true);
                                        }
                                    }     
                                    else report.propertyReports[i].addDescription('TestBench could not find the credentials, neither from brute-forcing nor from given config file. Thus, could not test safety of property.');
                                }
                                catch(e){
                                    logFormatted('::::ERROR::::: Brute-forcing property resulted in error:', e);
                                }
                            }
                            else{ // Property is 'writeonly'.
                                try{
                                    // First tries to 'writeproperty', then tries to 'readproperty'.
                                    var form = getForm('writeproperty', property.forms);

                                    // Check if the interaction has a different security schema.
                                    if (form['security'] != undefined){
                                        if (Array.isArray(form['security'])){
                                            if (!form['security'].includes(schemeName))
                                                return "Testing multiple security schemas are not currently available.";
                                        }
                                        else if (form['security'] != schemeName)
                                            return "Testing multiple security schemas are not currently available.";
                                    }

                                    var propertyURL: URL = new URL(form['href']);
                                    var method: string = form['htv:methodName'];
            
                                    if (method == null) method = 'PUT';
            
                                    var propertyOptions: object = createRequestOptions(propertyURL, method);
                                    var contentType: string = form['contentType'];
                                    
                                    if (contentType == undefined) contentType = 'application/json';
                                    
                                    propertyOptions['headers']['Content-Type'] = contentType;
                                    propertyOptions['body'] = JSON.stringify(jsf(property));
            
                                    var weakCredentials: boolean = await isPredictable(propertyURL, propertyOptions, location);
                                    const creds: string = getCredentials();
            
                                    if (weakCredentials || (creds != null)){ // Have credentials.
                                        report.propertyReports[i].security.passedDictionaryAttack = !weakCredentials;
                                        report.propertyReports[i].createSafetyReport();
                                        
                                        if (!weakCredentials) {
                                            propertyOptions['headers']['Authorization'] = 'Basic ' + creds;
            
                                            let isWritable = await fetch(propertyURL, propertyOptions)
                                            if (isWritable.ok)
                                                report.propertyReports[i].isWritable(true);

                                            report.propertyReports[i].addDescription('Not weak username-password');
                                        }
                                        else {
                                            report.propertyReports[i].addDescription('Weak username-password');
                                            report.propertyReports[i].isWritable(true);
                                            report.propertyReports[i].addCredentials(username, password);
                                        }
                                        // Types that should not be normally allowed.
                                        var types: string[] = await typeFuzz(property.type, propertyURL, propertyOptions);
                                        types.forEach(type => report.propertyReports[i].addType(type));
            
                                        propertyOptions['method'] = 'GET';
                                        delete propertyOptions['body'];
            
                                        var isReadable = await fetch(propertyURL.toString(), propertyOptions);
                                        if (isReadable.ok) report.propertyReports[i].isReadable(true);
                                    }
                                    else report.propertyReports[i].addDescription('TestBench could not find the credentials, neither from brute-forcing nor from given config file. Thus, could not test safety of property.');
                                }
                                catch{
                                    logFormatted('::::ERROR::::: Brute-forcing property resulted in error.');
                                }
                            }
                        }
                    }
                    if (td['actions'] != undefined){
                        const actions: Array<any> = Object.values(td['actions']);
                        
                        for(var i=0; i < actions.length; i++){
                            let action: any = actions[i];

                            var form = getForm('invokeaction', action.forms); // Cannot be null.

                            // Check if the interaction has a different security schema.
                            if (form['security'] != undefined){
                                if (Array.isArray(form['security'])){
                                    if (!form['security'].includes(schemeName))
                                        return "Testing multiple security schemas are not currently available.";
                                }
                                else if (form['security'] != schemeName)
                                    return "Testing multiple security schemas are not currently available.";
                            }

                            var myURL: URL = new URL(form['href']);
                            var method: string = form['htv:methodName'];
                            if (method == undefined) method = 'POST';

                            // Create action report with the name of the action.
                            report.createActionReport(Object.keys(td['actions'])[i]);
                            report.actionReports[i].createSecurityReport();

                            var actionOptions = createRequestOptions(myURL, method);

                            if (action.input != undefined) // Fill body appropriately.
                                actionOptions['body'] = JSON.stringify(jsf(action['input']));
                            
                            var weakCredentials: boolean = await isPredictable(myURL, actionOptions, location);
                            var creds: string = getCredentials();

                            if(weakCredentials || (creds != null)){ // Have credentials.
                                report.actionReports[i].security.passedDictionaryAttack = !weakCredentials;
                                report.actionReports[i].createSafetyReport();

                                if(!weakCredentials){
                                    actionOptions['headers']['Authorization'] = 'Basic ' + creds;
                                    report.actionReports[i].addDescription('Not weak username-password');
                                }
                                else{
                                    report.actionReports[i].addDescription('Weak username-password');
                                    report.actionReports[i].addCredentials(username, password);
                                }
                                // Types that should not be normally allowed.
                                var types: string[];
                                if(action.input != undefined)
                                    types = await typeFuzz(action.input.type, myURL, actionOptions);
                                else
                                    types = await typeFuzz(null, myURL, actionOptions);
                                
                                types.forEach(type => report.actionReports[i].addType(type));
                            }
                            else report.actionReports[i].addDescription('TestBench could not find the credentials, neither from brute-forcing nor from given config file. Thus, could not test safety of action.');
                        }
                    }
                    break;
                case "oauth2":
                    const flow: string = td['securityDefinitions'][schemeName].flow; // Authorization flow.
                    const params: URLSearchParams = new URLSearchParams(); // Used to create the required body.

                    report.scheme = 'oauth2';

                    switch(flow){
                        case "client_credentials":
                            // URL of the token server to be brute-forced.
                            const tokenURL: URL = new URL(td['securityDefinitions'][schemeName].token);

                            params.append('grant_type', 'client_credentials');

                            var options = createRequestOptions(tokenURL, 'POST');
                            options['body'] = params;

                            const weakCredentials: boolean = await isPredictable(tokenURL, options);
                            const givenToken: string = getCredentials();

                            if (td['properties'] != undefined){ // Properties exist.
                                const properties: Array<any> = Object.values(td['properties']);

                                for (var i=0; i < properties.length; i++){
                                
                                    let property: any = properties[i];
                                    report.createPropertyReport(Object.keys(td['properties'])[i]);
                                    report.propertyReports[i].createSecurityReport();

                                    if (!property.writeOnly){ // Can be read?

                                        if (weakCredentials || (givenToken != null)){ // Have a token.
                                            report.propertyReports[i].security.passedDictionaryAttack = !weakCredentials;

                                            report.propertyReports[i].createSafetyReport();

                                            var form = getForm('readproperty', property.forms);
                                            var myURL: URL = new URL(form['href']);
                                            var method: string = form['htv:methodName'];
                                            if (method == undefined) method = 'GET';

                                            options = createRequestOptions(myURL, method);
                                            
                                            if (!weakCredentials){
                                                options['headers']['Authorization'] = 'Bearer ' + givenToken;
                                                report.propertyReports[i].addDescription('Not weak username-password on token server.');
                                            }
                                            else {
                                                options['headers']['Authorization'] = 'Bearer ' + token;
                                                report.propertyReports[i].addDescription('Weak username-password pair on token server.');
                                                report.propertyReports[i].addCredentials(username, password);
                                            }

                                            // Should test for readability.
                                            var isReadable: any = await fetch(myURL, options);
                                            if (isReadable.ok)
                                                report.propertyReports[i].isReadable(true);

                                            form = getForm('writeproperty', property.forms);

                                            if (form != null){ // 'form' can be null in case the property is readOnly.
                                                myURL = new URL(form['href']);
                                                method = form['htv:methodName'];
                                                if (method == undefined) method = 'PUT';

                                                options = createRequestOptions(myURL, method);

                                                var contentType: string = form['contentType'];
                                                if (contentType == undefined) contentType = 'application/json';

                                                options['headers']['Content-Type'] = contentType;

                                                if (!weakCredentials)
                                                    options['headers']['Authorization'] = 'Bearer ' + givenToken;
                                                else
                                                    options['headers']['Authorization'] = 'Bearer ' + token;

                                                options['body'] = JSON.stringify(jsf(property));
        
                                                let isWritable = await fetch(myURL, options);
                                                if (isWritable.ok)
                                                    report.propertyReports[i].isWritable(true);

                                                // Types that should not be normally allowed.
                                                var types: Array<string> = await typeFuzz(property.type, myURL, options);
                                                types.forEach(type => report.propertyReports[i].addType(type));
                                            }
                                        }
                                        else report.propertyReports[i].addDescription('TestBench could not get a suitable token, neither from brute-forcing nor from given config file. Thus, could not test safety of property.');
                                    }
                                    else{ // Property 'writeonly'
                                        if (weakCredentials || (givenToken != null)){
                                            report.propertyReports[i].security.passedDictionaryAttack = !weakCredentials;
                                            
                                            report.propertyReports[i].createSafetyReport();

                                            var form = getForm('writeproperty', property.forms);
                                            var myURL: URL = new URL(form['href']);
                                            var method: string = form['htv:methodName'];
                                            if(method == null) method = 'PUT';

                                            options = createRequestOptions(myURL, method);

                                            var contentType: string = form['contentType'];
                                            if (contentType == undefined) contentType = 'application/json';

                                            options['headers']['Content-Type'] = contentType;

                                            if (!weakCredentials){
                                                options['headers']['Authorization'] = 'Bearer ' + givenToken;
                                                report.propertyReports[i].addDescription('Not weak username-password on token server');
                                            }
                                            else {
                                                options['headers']['Authorization'] = 'Bearer ' + token;
                                                report.propertyReports[i].addDescription('Weak username-password pair on token server.');
                                                report.propertyReports[i].addCredentials(username, password);
                                            }

                                            options['body'] = JSON.stringify(jsf(property));

                                            var isWritable: any = await fetch(myURL, options);
                                            if (isWritable.ok)
                                                report.propertyReports[i].isWritable(true);
                                            // Types that should not be normally allowed.
                                            var types: Array<string> = await typeFuzz(property.type, myURL, options);
                                            types.forEach(type => report.propertyReports[i].addType(type));

                                            options['method'] = 'GET';
                                            delete options['body'];
                
                                            var isReadable = await fetch(myURL, options);
                                            if (isReadable.ok) report.propertyReports[i].isReadable(true);
                                        }
                                        else report.propertyReports[i].addDescription('TestBench could not get a suitable token, neither from brute-forcing nor from given config file. Thus, could not test safety of property.');
                                    }
                                }
                            }
                            if (td['actions'] != undefined){
                                const actions: Array<any> = Object.values(td['actions']);

                                for (var i=0; i < actions.length; i++){
                                
                                    let action: any = actions[i];

                                    report.createActionReport(Object.keys(td['actions'])[i]);
                                    report.actionReports[i].createSecurityReport();
                                    
                                    if (weakCredentials || (givenToken != null)){ // Have a token.
                                        report.actionReports[i].security.passedDictionaryAttack = !weakCredentials;

                                        report.actionReports[i].createSafetyReport();

                                        var form = getForm('invokeaction', action.forms);
                                        var myURL: URL = new URL(form['href']);
                                        var method: string = form['htv:methodName'];
                                        if (method == undefined) method = 'POST';

                                        options = createRequestOptions(myURL, method);

                                        if (!weakCredentials) {
                                            options['headers']['Authorization'] = 'Bearer ' + givenToken;
                                            report.actionReports[i].addDescription('Strong username-password on token server.');
                                        }
                                        else {
                                            options['headers']['Authorization'] = 'Bearer ' + token;
                                            report.actionReports[i].addDescription('Weak username-password pair on token server.');
                                            report.actionReports[i].addCredentials(username, password);
                                        }
                                        // Types that should not be normally allowed.
                                        var types: string[];
                                        if (action.input != undefined)
                                            types = await typeFuzz(action.input.type, myURL, options);
                                        else
                                            types = await typeFuzz(null, myURL, options);

                                        types.forEach(type => report.actionReports[i].addType(type));
                                    }
                                    else report.actionReports[i].addDescription('TestBench could not get a suitable token, neither from brute-forcing nor from given config file. Thus, could not test safety of action.');
                                }
                            }
                            break;
                        default:
                            throw 'This oauth flow cannot be tested for now.';
                    }
                    break;
                case "nosec":
                    report.scheme = 'nosec';

                    if (td['properties'] != undefined){
                        const properties: any = Object.values(td['properties']);

                        for (var i=0; i < properties.length; i++){
                            let property: any = properties[i];

                            // Creating propertyReport with the name of the property.
                            report.createPropertyReport(Object.keys(td['properties'])[i]);

                            if (!property.writeOnly){ // Property can be read, supposedly?
                                try{
                                    // First tries to 'readproperty'.
                                    var form = getForm('readproperty', property.forms);

                                    // Check if the interaction has a different security scheme.
                                    if (form['security'] != undefined){
                                        if (Array.isArray(form['security'])){
                                            if (!form['security'].includes(schemeName))
                                                return "Testing multiple security schemas are not currently available.";
                                        }
                                        else if (form['security'] != schemeName)
                                            return "Testing multiple security schemas are not currently available.";
                                    }
                                    
                                    var propertyURL: URL = new URL(form['href']);
                                    var method: string = form['htv:methodName'];
                                    
                                    if(method == null) method = 'GET';
            
                                    var propertyOptions: object = createRequestOptions(propertyURL, method);
                                    report.propertyReports[i].createSafetyReport();

                                    // Making sure that the property is readable.
                                    let isReadable = await fetch(propertyURL, propertyOptions);
                                    if (isReadable.ok)
                                        report.propertyReports[i].isReadable(true);

                                    // Trying to 'writeproperty' with different types.
                                    form = getForm('writeproperty', property.forms);
        
                                    // This time 'form' can be null in case 'property' is 'readOnly'.
                                    if (form != null){
                                        propertyURL= new URL(form['href']);
                                        method = form['htv:methodName'];
        
                                        if (method == null) method = 'PUT';
        
                                        propertyOptions = createRequestOptions(propertyURL, method);

                                        var contentType: string = form['contentType'];
        
                                        if (contentType == undefined) contentType = 'application/json';
                                        propertyOptions['headers']['Content-Type'] = contentType;

                                        // Types that should not be normally allowed.
                                        var types: string[] = await typeFuzz(property.type, propertyURL, propertyOptions);                                    
                                        types.forEach(type => report.propertyReports[i].addType(type));
        
                                        // Trying to write the real type, if cannot write any exceptional type.
                                        if (types.length == 0){
                                            propertyOptions['body'] = JSON.stringify(jsf(property));

                                            let isWritable = await fetch(propertyURL, propertyOptions);
                                            if (isWritable.ok)
                                                report.propertyReports[i].isWritable(true);
                                        }
                                        else report.propertyReports[i].isWritable(true);
                                    }
                                    else report.propertyReports[i].addDescription('TestBench could not find the credentials, neither from brute-forcing nor from given config file. Thus, could not test safety of property.');
                                }
                                catch(e){
                                    logFormatted('::::ERROR::::: Brute-forcing property resulted in error:', e);
                                }
                            }
                            else{ // Property is 'writeonly'.
                                try{
                                    // First tries to 'writeproperty', then tries to 'readproperty'.
                                    var form = getForm('writeproperty', property.forms);

                                    // Check if the interaction has a different security schema.
                                    if (form['security'] != undefined){
                                        if (Array.isArray(form['security'])){
                                            if (!form['security'].includes(schemeName))
                                                return "Testing multiple security schemas are not currently available.";
                                        }
                                        else if (form['security'] != schemeName)
                                            return "Testing multiple security schemas are not currently available.";
                                    }

                                    var propertyURL: URL = new URL(form['href']);
                                    var method: string = form['htv:methodName'];
            
                                    if (method == null) method = 'PUT';
            
                                    var propertyOptions: object = createRequestOptions(propertyURL, method);
                                    var contentType: string = form['contentType'];
                                    
                                    if (contentType == undefined) contentType = 'application/json';
                                    
                                    propertyOptions['headers']['Content-Type'] = contentType;
                                    propertyOptions['body'] = JSON.stringify(jsf(property));
            
                                    report.propertyReports[i].createSafetyReport();
                                    
                                    propertyOptions['headers']['Authorization'] = 'Basic ' + creds;
        
                                    let isWritable = await fetch(propertyURL, propertyOptions)
                                    if (isWritable.ok)
                                        report.propertyReports[i].isWritable(true);

                                    // Types that should not be normally allowed.
                                    var types: string[] = await typeFuzz(property.type, propertyURL, propertyOptions);
                                    types.forEach(type => report.propertyReports[i].addType(type));
        
                                    propertyOptions['method'] = 'GET';
                                    delete propertyOptions['body'];
        
                                    var isReadable = await fetch(propertyURL.toString(), propertyOptions);
                                    if (isReadable.ok) report.propertyReports[i].isReadable(true);
                                }
                                catch{
                                    logFormatted('::::ERROR::::: Brute-forcing property resulted in error.');
                                }
                            }
                        }
                    }
                    if (td['actions'] != undefined){
                        const actions: Array<any> = Object.values(td['actions']);
                        
                        for(var i=0; i < actions.length; i++){
                            let action: any = actions[i];

                            var form = getForm('invokeaction', action.forms); // Cannot be null.

                            // Check if the interaction has a different security schema.
                            if (form['security'] != undefined){
                                if (Array.isArray(form['security'])){
                                    if (!form['security'].includes(schemeName))
                                        return "Testing multiple security schemas are not currently available.";
                                }
                                else if (form['security'] != schemeName)
                                    return "Testing multiple security schemas are not currently available.";
                            }

                            var myURL: URL = new URL(form['href']);
                            var method: string = form['htv:methodName'];
                            if (method == undefined) method = 'POST';

                            // Create action report with the name of the action.
                            report.createActionReport(Object.keys(td['actions'])[i]);

                            var actionOptions = createRequestOptions(myURL, method);

                            if (action.input != undefined) // Fill body appropriately.
                                actionOptions['body'] = JSON.stringify(jsf(action['input']));                            

                                report.actionReports[i].createSafetyReport();

                                // Types that should not be normally allowed.
                                var types: string[];
                                if(action.input != undefined)
                                    types = await typeFuzz(action.input.type, myURL, actionOptions);
                                else
                                    types = await typeFuzz(null, myURL, actionOptions);
                                
                                types.forEach(type => report.actionReports[i].addType(type));
                        }
                    }
            }
            await TestBenchT.writeProperty('testReport', report);
            fastMode = false;
        })
        await TestBenchT.expose()
        console.info(TestBenchT.getThingDescription().title + " ready")
    })
    .catch((err) => {
        // logFormatted(":::::ERROR::::: Servient startup failed", e)
        console.error('Err:', err);
    })
