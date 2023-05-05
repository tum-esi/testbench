import * as wot from "wot-typescript-definitions"
import * as Generator from "./Generator"
import * as fs from "fs"
import { mkdirp } from "mkdirp"
import { JSONSchemaFaker as jsf } from "json-schema-faker"
import * as util from "util"
import { JsonValue } from "type-fest"
import ajValidator = require("ajv")
import { ThingDescription, PropertyElement, ActionElement, EventElement, Form } from "wot-thing-description-types"

const logFile = fs.createWriteStream("debug.log", { flags: "w" })
const logStdout = process.stdout

console.log = function (...args) {
    logFile.write(util.format.apply(null, args) + "\n")
    logStdout.write(util.format.apply(null, args) + "\n")
}

/**
 * Logs a formatted message. Per default "* " is added as prefix and the color of the logged message is blue.
 * @param message The message to log.
 * @param prefix The prefix of the logged message.
 * @param color The color of the logged message.
 */
export function logFormatted(message: string, prefix = "* ", color = "\x1b[36m%s\x1b[0m"): void {
    console.log(color, prefix + message)
}

/**
 * A test config file is always configured like this.
 */
export interface testConfig {
    TBname?: string
    http?: {
        port?: number
        allowSelfSigned: boolean
    }
    coap?: {
        port?: number
    }
    SchemaLocation?: string
    TestReportsLocation?: string
    TestDataLocation?: string
    TimeBetweenRequests?: number
    ActionTimeout?: number
    Scenarios?: number
    Repetitions?: number
    EventAndObservePOptions: {
        Asynchronous: {
            // How many Data Packages the testbench will be receiving. Set to null for unlimited amount.
            MaxAmountRecvData: number
            // MilliSeconds the testbench stays subscribed/observes and Event/Property during second Phase (if data package cap is not hit before).
            MsListen: number
            // MilliSeconds until the testbench times out during subscription.
            MsSubscribeTimeout: number
        }
        Synchronous: {
            // If false the testbench will skip the second (synchronous) listening phase.
            isEnabled: boolean
            // How many Data Packages the testbench will be receiving. Set to null for unlimited amount.
            MaxAmountRecvData: number
            // MilliSeconds the testbench stays subscribed/observes and Event/Property during second Phase (if data package cap is not hit before).
            MsListen: number
            // MilliSeconds until the testbench times out during subscription.
            MsSubscribeTimeout: number
        }
    }
    credentials?: any
}

// -------------------------- Control Logic Enums ---------------------------------
/**
 * An enum defining the listening type of an observeProperty or event test.
 */
export enum ListeningType {
    Asynchronous = 1,
    Synchronous = 2,
}

/**
 * An enum defining the type of an interaction.
 */
export enum InteractionType {
    Property = "Property",
    // Read and Write Property specified explicitly for the report.
    ReadProperty = "ReadProperty",
    WriteProperty = "WriteProperty",
    Action = "Action",
    Event = "Event",
}

/**
 * An enum defining the type of an interaction schema.
 */
export enum SchemaType {
    Property = "Property",
    Action = "Action",
    EventSubscription = "EventSubscription",
    EventData = "EventData",
    EventCancellation = "EventCancellation",
}

/**
 * An enum defining the type of an protocol.
 */
export enum ProtocolType {
    Http = "http",
    Https = "https",
    Coap = "coap",
    Coaps = "coaps",
    Mqtt = "mqtt",
    File = "file",
}

// -------------------------- FAKE DATA GENERATION ---------------------------------
export class CodeGenerator {
    private td: wot.ThingDescription
    public requests: any
    public input_types: object
    constructor(tdesc: wot.ThingDescription, testConf: testConfig) {
        this.td = tdesc
        //Toggle between the two Generator types to change the generation of testdata
        //this.generateFakeData(testConf, tdesc)

        this.input_types = this.generateFakeHeuristicData(testConf, tdesc)

        this.requests = this.getRequests(testConf.TestDataLocation)
    }
    private createRequest(requestName: string, loc: string, pat: string): JsonValue {
        try {
            const scheme = JSON.parse(fs.readFileSync(loc + "Requests/" + requestName + "-" + pat + ".json", "utf8"))
            return jsf.generate(scheme)
        } catch (Error) {
            return null
        }
    }

    // generates fake data and stores it to config TestDataLocation location
    public generateFakeData(testConf: any, tdesc: wot.ThingDescription) {
        // create interaction list: no optimized solution: -----------
        const requests = {
            [SchemaType.Property]: {},
            [SchemaType.Action]: {},
            [SchemaType.EventSubscription]: {},
            [SchemaType.EventCancellation]: {},
        }

        for (const property in tdesc.properties) {
            requests[SchemaType.Property][property] = []
            for (let scenario = 0; scenario < testConf.Scenarios; scenario++) {
                requests[SchemaType.Property][property].push(this.createRequest(property, testConf.SchemaLocation, SchemaType.Property))
            }
        }

        for (const action in tdesc.actions) {
            requests[SchemaType.Action][action] = []
            for (let scenario = 0; scenario < testConf.Scenarios; scenario++) {
                requests[SchemaType.Action][action].push(this.createRequest(action, testConf.SchemaLocation, SchemaType.Action))
            }
        }

        for (const event in tdesc.events) {
            requests[SchemaType.EventSubscription][event] = []
            requests[SchemaType.EventCancellation][event] = []
            for (let scenario = 0; scenario < testConf.Scenarios; scenario++) {
                requests[SchemaType.EventSubscription][event].push(this.createRequest(event, testConf.SchemaLocation, SchemaType.EventSubscription))
                requests[SchemaType.EventCancellation][event].push(this.createRequest(event, testConf.SchemaLocation, SchemaType.EventCancellation))
            }
        }

        fs.writeFileSync(testConf.TestDataLocation, JSON.stringify(requests, null, " "))
    }

    public generateFakeHeuristicData(testConf: any, tdesc: wot.ThingDescription) {
        // create interaction list: no optimized solution: -----------
        const requests = {
            [SchemaType.Property]: {},
            [SchemaType.Action]: {},
            [SchemaType.EventSubscription]: {},
            [SchemaType.EventCancellation]: {},
        }
        const types = {
            [SchemaType.Property]: {},
            [SchemaType.Action]: {},
            [SchemaType.EventSubscription]: {},
            [SchemaType.EventCancellation]: {},
        }

        for (const property in tdesc.properties) {
            requests[SchemaType.Property][property] = []
            types[SchemaType.Property][property] = []
            if (!tdesc.properties[property].readOnly) {
                // START here with sensible data generation
                const [array_prop, data_type] = Generator.fuzzGenerator(tdesc, tdesc.properties, property)

                // for (let scenario = 0; scenario < testConf.Scenarios; scenario++) {
                //     const value = array_prop[scenario]
                //     const type = data_type[scenario]
                //     requests[SchemaType.Property][property].push(value)
                //     types[SchemaType.Property][property].push(type)
                // }

                array_prop.forEach((element) => {
                    requests[SchemaType.Property][property].push(element)
                })

                data_type.forEach((element) => {
                    types[SchemaType.Property][property].push(element)
                })
            }
        }

        for (const action in tdesc.actions) {
            requests[SchemaType.Action][action] = []
            types[SchemaType.Action][action] = []
            if (tdesc.actions[action].input) {
                const [array_act, data_type] = Generator.fuzzGenerator(tdesc, tdesc.actions, action)

                // for (let scenario = 0; scenario < testConf.Scenarios; scenario++) {
                //     const value = array_act[scenario]
                //     const type = data_type[scenario]
                //     requests[SchemaType.Action][action].push(value)
                //     types[SchemaType.Action][action].push(type)
                // }

                array_act.forEach((element) => {
                    requests[SchemaType.Action][action].push(element)
                })

                data_type.forEach((element) => {
                    types[SchemaType.Action][action].push(element)
                })
            }
        }

        for (const event in tdesc.events) {
            requests[SchemaType.EventSubscription][event] = []
            requests[SchemaType.EventCancellation][event] = []
            for (let scenario = 0; scenario < testConf.Scenarios; scenario++) {
                requests[SchemaType.EventSubscription][event].push(this.createRequest(event, testConf.SchemaLocation, SchemaType.EventSubscription))
                requests[SchemaType.EventCancellation][event].push(this.createRequest(event, testConf.SchemaLocation, SchemaType.EventCancellation))
            }
        }

        fs.writeFileSync(testConf.TestDataLocation, JSON.stringify(requests, null, " "))
        return types
    }

    // helper function finds created data:
    public findRequestValue(requestsLoc, testScenario, schemaType: SchemaType, interactionName: string) {
        const requests = JSON.parse(fs.readFileSync(requestsLoc, "utf8"))
        return requests[schemaType][interactionName][testScenario]
    }
    public getRequests(requestsLoc) {
        return JSON.parse(fs.readFileSync(requestsLoc, "utf8"))
    }
}

// ------------------------ SCHEMA VALIDATION -----------------------------------
const ajv = new ajValidator({ allErrors: true })
export function validateRequest(requestName: string, request: JSON, schemaLoc: string, schemaType: SchemaType): Array<any> {
    const reqSchema: any = fs.readFileSync(schemaLoc + "Requests/" + requestName + "-" + schemaType + ".json", "utf8")
    ajv.validate(JSON.parse(reqSchema), request)
    return ajv.errors
}

export function validateResponse(responseName: string, response: JSON, schemaLoc: string, schemaType: SchemaType): Array<any> {
    const resSchema: any = fs.readFileSync(schemaLoc + "Responses/" + responseName + "-" + schemaType + ".json", "utf8")
    ajv.validate(JSON.parse(resSchema), response)
    return ajv.errors
}

// ------------------------ SCHEMA GENERATION ------------------------------------

/**
 * Writes extracted schema to a file.
 * @param name The name of an interaction.
 * @param dataSchema The schema to write.
 * @param schemaLocation The file location where the schema will be saved.
 * @param schemaType The type of the schema.
 */
function writeSchema(name, dataSchema, schemaLocation, schemaType: SchemaType) {
    const schema: string = '{\n\t"name":"' + name + '",\n\t' + dataSchema + "\n\t}"
    const writeLoc: string = schemaLocation + name + "-" + schemaType + ".json"
    fs.writeFileSync(writeLoc, schema)
}

/**
 * Generates schemas for all interactions.
 * @param td The ThingDescription to generate from.
 * @param schemaLocation The file location where the generated schemas will be saved.
 * @param logMode True if logMode is enabled, false otherwise.
 */
export function generateSchemas(td: wot.ThingDescription, schemaLocation: string, logMode: boolean): number {
    const schemaLocationReq = schemaLocation + "Requests/"
    const schemaLocationResp = schemaLocation + "Responses/"
    let reqSchemaCount = 0
    let resSchemaCount = 0
    mkdirp.sync(schemaLocationReq)
    mkdirp.sync(schemaLocationResp)

    // Property schemas:
    for (const key in td.properties) {
        if (Object.prototype.hasOwnProperty.call(td.properties, key)) {
            // checks if writable:
            if (!td.properties[key].readOnly) {
                // create request schema:
                const dataSchema = JSON.stringify(td.properties[key]).slice(0, -1).substring(1)
                writeSchema(key, dataSchema, schemaLocationReq, SchemaType.Property)
                reqSchemaCount++
                // response schema:
                writeSchema(key, dataSchema, schemaLocationResp, SchemaType.Property)
                resSchemaCount++
            } else {
                // create response schema:
                const dataSchema = JSON.stringify(td.properties[key]).slice(0, -1).substring(1)
                writeSchema(key, dataSchema, schemaLocationResp, SchemaType.Property)
                resSchemaCount++
            }
        }
    }

    // Action schemas:
    for (const key in td.actions) {
        if (Object.prototype.hasOwnProperty.call(td.actions, key)) {
            if (Object.prototype.hasOwnProperty.call(td.actions[key], "input")) {
                // create request schema:
                const dataSchema = JSON.stringify(td.actions[key].input).slice(0, -1).substring(1)
                writeSchema(key, dataSchema, schemaLocationReq, SchemaType.Action)
                reqSchemaCount++
            }
            if (Object.prototype.hasOwnProperty.call(td.actions[key], "output")) {
                // create response schema:
                const dataSchema = JSON.stringify(td.actions[key].output).slice(0, -1).substring(1)
                writeSchema(key, dataSchema, schemaLocationResp, SchemaType.Action)
                resSchemaCount++
            }
        }
    }

    // Event schemas:
    for (const key in td.events) {
        if (Object.prototype.hasOwnProperty.call(td.events, key)) {
            if (Object.prototype.hasOwnProperty.call(td.events[key], "subscription")) {
                writeSchema(key, JSON.stringify(td.events[key].subscription).slice(0, -1).substring(1), schemaLocationReq, SchemaType.EventSubscription)
                reqSchemaCount++

                // TODO: Potential resSchema for subscription should be generated here. Perhaps something like this:
                // if (td.events[key].subscription.hasOwnProperty("properties")) {
                //     if (td.events[key].subscription.properties.hasOwnProperty("subscriptionID")) {
                //         writeSchema(
                //             key, JSON.stringify(td.events[key].subscription.properties.subscriptionID).slice(0, -1).substring(1),
                //             schemaLocationResp, "SubscribeEvent"
                //         )
                //     }
                // }
                // resSchemaCount++
            }
            if (Object.prototype.hasOwnProperty.call(td.events[key], "data")) {
                writeSchema(key, JSON.stringify(td.events[key].data).slice(0, -1).substring(1), schemaLocationResp, SchemaType.EventData)
                resSchemaCount++
            }
            if (Object.prototype.hasOwnProperty.call(td.events[key], "cancellation")) {
                writeSchema(key, JSON.stringify(td.events[key].cancellation).slice(0, -1).substring(1), schemaLocationReq, SchemaType.EventCancellation)
                reqSchemaCount++

                // TODO: Potential resSchema for cancellation should be generated here
            }
        }
    }

    if (logMode) console.log("\x1b[36m%s%s\x1b[0m", "* ", reqSchemaCount + " request schemas and " + resSchemaCount + " response schemas have been created")
    if (reqSchemaCount == 0 && resSchemaCount == 0) {
        if (logMode) console.log("\x1b[36m%s%s\x1b[0m", "* !!! WARNING !!! NO INTERACTIONS FOUND")
        return 1
    }
    return 0
}

// --------------------------- UTILITY FUNCTIONS -------------------------------------
/**
 * Returns the interaction object corresponding to the interaction name.
 * @param td The Thing description.
 * @param name The name of the interaction.
 */
export function getInteractionByName(td: wot.ThingDescription, interactionType: InteractionType, name: string): any {
    let interactionList = []
    if (interactionType == InteractionType.Property) interactionList = Object.keys(td.properties)
    else if (interactionType == InteractionType.Action) interactionList = Object.keys(td.actions)
    else if (interactionType == InteractionType.Event) interactionList = Object.keys(td.events)

    if (interactionList.includes(name)) {
        if (interactionType == InteractionType.Property) return td.properties[name]
        else if (interactionType == InteractionType.Action) return td.actions[name]
        else if (interactionType == InteractionType.Event) return td.events[name]
    }
}

/**
 * Returns an wrapped Promise that races between the provided promise and an internal timeout.
 * @param ms The number indicating the length of the internal timeout in ms.
 * @param promise The promise the timeout shall race against.
 */
export function promiseTimeout(ms: number, promise: Promise<any>) {
    // Create a promise that rejects in <ms> milliseconds
    const timeout = new Promise((resolve, reject) => {
        setTimeout(() => {
            reject("Timed out in " + ms + "ms.")
        }, ms)
    })
    // Returns a race between our timeout and the passed in promise
    return Promise.race([promise, timeout])
}

/**
 * Sleeps the specified amount of time.
 * @param ms The number indicating the time to sleep in ms.
 */
export function sleepInMs(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * A deferred promise object that can be resolved and rejected from another function.
 */
export class DeferredPromise {
    resolve
    reject
    _promise
    then
    catch
    constructor() {
        this._promise = new Promise((resolve, reject) => {
            // assign the resolve and reject functions to "this" making them usable on the class instance
            this.resolve = resolve
            this.reject = reject
        })
        // bind "then" and "catch" to implement the same interface as Promise
        this.then = this._promise.then.bind(this._promise)
        this.catch = this._promise.catch.bind(this._promise)
        this[Symbol.toStringTag] = "Promise"
    }
}

/**
 * Returns a valid request input for a given schema
 * @param schema current interaction schema
 */
export function createValidInput(schema) {
    return jsf.generate(schema)
}

export function removeDuplicates(array: Array<any>) {
    return array.filter((value: any, index: any) => array.indexOf(value) === index)
}
export function getCurrentTime() {
    const unix_timestamp = Date.now()
    const date = new Date(unix_timestamp)
    // Hours part from the timestamp
    const hours = date.getHours()
    // Minutes part from the timestamp
    const minutes = "0" + date.getMinutes()
    // Seconds part from the timestamp
    const seconds = "0" + date.getSeconds()
    const formattedTime = hours + ":" + minutes.substring(-2) + ":" + seconds.substring(-2)

    return formattedTime
}

/**
 * Creates a object with the necessary information about a single test instance
 * @param result Human readable explaination of test result
 * @param interaction_type Type of interaction determines the layout of the mini report
 * @param interaction_name name of the interaction
 * @param pass test passed the requirement true/false
 * @param payload input that was send as payload of a request
 * @param response response of the system under test
 */
export function createMiniReport(result: string, interaction_type: InteractionType, interaction_name: string, pass: boolean, payload: any, response?: any) {
    let mini_report = {}

    const formattedTime = this.getCurrentTime()

    // TODO: set enum for interaction_type
    if (interaction_type === InteractionType.WriteProperty) {
        mini_report = {
            name: interaction_name,
            passed: pass,
            time: formattedTime,
            writeInteraction: {
                payload: payload,
                result: result,
            },
        }
    }
    if (interaction_type === InteractionType.ReadProperty) {
        mini_report = {
            name: interaction_name,
            passed: pass,
            time: formattedTime,
            readInteraction: {
                response: response,
                result: result,
            },
        }
    }
    if (interaction_type === InteractionType.Action) {
        mini_report = {
            name: interaction_name,
            passed: pass,
            time: formattedTime,
            actionInteraction: {
                payload: payload,
                response: response,
                result: result,
            },
        }
    }
    if (interaction_type === InteractionType.Event) {
        mini_report = {
            name: interaction_name,
            passed: pass,
            time: formattedTime,
            eventInteraction: {
                payload: payload,
                response: response,
                result: result,
            },
        }
    }
    return mini_report
}

export function createT3MiniReport(payload: any, interaction_type: InteractionType) {
    let mini_T3_report = {}

    if (interaction_type === InteractionType.Property) {
        mini_T3_report = {
            passed: undefined,
            time: undefined,
            payload: payload,
            result: undefined,
        }
    }
    if (interaction_type === InteractionType.Action) {
        mini_T3_report = {
            passed: undefined,
            time: undefined,
            payload: payload,
            response: undefined,
            result: undefined,
        }
    }

    return mini_T3_report
}

export function createT3Report(data, type) {
    const initT3 = {}

    const prop_data = data[Object.keys(data)[0]]
    const act_data = data[Object.keys(data)[1]]
    const prop_type = type[Object.keys(type)[0]]
    const act_type = type[Object.keys(type)[1]]

    const prop_keys = Object.keys(data[Object.keys(data)[0]])
    const act_keys = Object.keys(data[Object.keys(data)[1]])

    for (const key of prop_keys) {
        initT3[key] = {}

        const special_types = removeDuplicates(prop_type[key])
        for (let i = 0; i < special_types.length; i++) {
            initT3[key][special_types[i]] = []
        }
        //check if array is empty
        const length = prop_data[key].length
        if (length != 0) {
            for (let i = 0; i < length; i++) {
                //create individual blank reports and push them into the respective type arrays
                const mini_report = createT3MiniReport(prop_data[key][i], InteractionType.Property)
                //initT3[key].push([prop_data[key][i],prop_type[key][i]])
                initT3[key][prop_type[key][i]].push(mini_report)
            }
        }
    }

    for (const key of act_keys) {
        initT3[key] = {}
        const special_types = removeDuplicates(act_type[key])
        for (let i = 0; i < special_types.length; i++) {
            initT3[key][special_types[i]] = []
        }
        //check if array is empty
        const length = act_data[key].length
        if (length != 0) {
            for (let i = 0; i < length; i++) {
                //create individual blank reports and push them into the respective type arrays
                const mini_report = createT3MiniReport(act_data[key][i], InteractionType.Action)
                initT3[key][act_type[key][i]].push(mini_report)
            }
        }
    }

    return initT3
}

export function countResults(miniReport: Array<any>) {
    const length: number = miniReport.length
    let passed = 0
    for (let i = 0; i < length; i++) {
        if (miniReport[i].passed) {
            passed = passed + 1
        }
    }

    return [passed, length]
}

export function countResultsT3(miniReportT3: object) {
    const number_properties: number = Object.keys(miniReportT3).length

    let passed = 0
    let length = 0
    for (let j = 0; j < number_properties; j++) {
        const number_scenarios = Object.keys(Object.values(miniReportT3)[j]).length

        for (let i = 0; i < number_scenarios; i++) {
            const testcases: any = Object.values(Object.values(Object.values(miniReportT3)[j]))[i]
            const number_testcases: number = testcases.length
            for (let k = 0; k < number_testcases; k++) {
                if (testcases[k].passed) {
                    passed = passed + 1
                }
                length = length + 1
            }
        }
    }

    return [passed, length]
}

// ------------------------ PROTOCOL DETECTION -----------------------------------

/**
 * Detect protocl schemes of a TD
 * @param {string} td TD string to detect protocols of
 * return List of available protocol schemes
 */
export function detectProtocolSchemes(td: string): string[] {
    let tdJson: ThingDescription

    try {
        tdJson = JSON.parse(td)
    } catch (err) {
        return []
    }

    const baseUriProtocol = getHrefProtocol(tdJson.base)
    const thingProtocols = detectProtocolInForms(tdJson.forms)
    const actionsProtocols = detectProtocolInAffordance(tdJson.actions)
    const eventsProtocols = detectProtocolInAffordance(tdJson.events)
    const propertiesProtcols = detectProtocolInAffordance(tdJson.properties)
    const protocolSchemes = [...new Set([baseUriProtocol, ...thingProtocols, ...actionsProtocols, ...eventsProtocols, ...propertiesProtcols])].filter(
        (p) => p !== undefined
    )

    return protocolSchemes
}

type Affordance = { [k: string]: PropertyElement | ActionElement | EventElement }

/**
 * Detect protocols in a TD affordance
 * @param {Affordance} affordance That belongs to a TD
 * @returns List of protocol schemes
 */
function detectProtocolInAffordance(affordance: Affordance) {
    if (!affordance) {
        return []
    }

    let protocolSchemes = []

    for (const key in affordance) {
        if (key) {
            protocolSchemes = protocolSchemes.concat(detectProtocolInForms(affordance[key].forms))
        }
    }

    return protocolSchemes
}

/**
 * Detect protocols in a TD forms or a TD affordance forms
 * @param {Form} forms Forms field of a TD or a TD affordance
 * @returns List of protocol schemes
 */
function detectProtocolInForms(forms: Form[]) {
    if (!forms) {
        return []
    }

    const protocolSchemes = []

    forms.forEach((form) => {
        protocolSchemes.push(getHrefProtocol(form.href))
    })

    return protocolSchemes
}

/**
 * Get protocol used in href
 * @param {string} href URI string
 * @returns Protocol name
 */
function getHrefProtocol(href: string) {
    if (!href) {
        return
    }

    return href.split(":")[0]
}
