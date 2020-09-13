export const testConfig = {
    TBname: "wot-test-bench",
    http: {
        port: 8980,
        allowSelfSigned: true,
    },
    coap: {
        port: 8981,
    },
    SchemaLocation: "Resources/InteractionSchemas/",
    TestReportsLocation: "Reports/",
    TestDataLocation: "Resources/fake-data.json",
    ActionTimeout: 4000,
    Scenarios: 2,
    Repetitions: 1,
    EventAndObservePOptions: {
        Asynchronous: {
            MaxAmountRecvData: 2,
            MsListen: 500,
            MsSubscribeTimeout: 30000,
        },
        Synchronous: {
            isEnabled: false,
            MaxAmountRecvData: 5,
            MsListen: 1000,
            MsSubscribeTimeout: 1000,
        },
    },
    credentials: {},
}

export const faultyThingTD = {
    title: "TestServient",
    description: "Test servient that can be used as a servient to be tested with the WoT Test Bench",
    properties: {
        display: {
            type: "string",
            observable: true,
            readOnly: false,
            writeOnly: false,
            forms: [
                {
                    href: "coap://localhost:8084/TestServient/properties/display",
                    contentType: "application/json",
                    op: ["readproperty", "writeproperty", "observeproperty", "unobserveproperty"],
                },
            ],
        },
        counter: {
            type: "number",
            observable: false,
            readOnly: false,
            writeOnly: false,
            forms: [
                {
                    href: "http://localhost:8083/TestServient/properties/counter",
                    contentType: "application/json",
                    op: ["readproperty", "writeproperty"],
                },
                {
                    href: "coap://localhost:8084/TestServient/properties/counter",
                    contentType: "application/json",
                    op: ["readproperty", "writeproperty"],
                },
            ],
        },
        temperature: {
            type: "number",
            observable: false,
            readOnly: true,
            writeOnly: false,
            forms: [
                {
                    href: "http://localhost:8083/TestServient/properties/temperature",
                    contentType: "application/json",
                    op: ["readproperty", "writeproperty"],
                },
                {
                    href: "coap://localhost:8084/TestServient/properties/temperature",
                    contentType: "application/json",
                    op: ["readproperty", "writeproperty"],
                },
            ],
        },
        faultyPercent: {
            type: "number",
            minimum: 0.0,
            maximum: 100.0,
            observable: true,
            readOnly: true,
            writeOnly: false,
            forms: [
                {
                    href: "coap://localhost:8084/TestServient/properties/faultyPercent",
                    contentType: "application/json",
                    op: ["readproperty", "writeproperty", "observeproperty", "unobserveproperty"],
                },
            ],
        },
        wrongWritable: {
            description: "property that says writable but isn't",
            type: "number",
            observable: false,
            readOnly: false,
            writeOnly: false,
            forms: [
                {
                    href: "http://localhost:8083/TestServient/properties/wrongWritable",
                    contentType: "application/json",
                    op: ["readproperty", "writeproperty"],
                },
                {
                    href: "coap://localhost:8084/TestServient/properties/wrongWritable",
                    contentType: "application/json",
                    op: ["readproperty", "writeproperty"],
                },
            ],
        },
        wrongDataTypeNumber: {
            description: "property that returns a different data type than the one described",
            type: "number",
            readOnly: true,
            observable: false,
            writeOnly: false,
            forms: [
                {
                    href: "http://localhost:8083/TestServient/properties/wrongDataTypeNumber",
                    contentType: "application/json",
                    op: ["readproperty"],
                    "htv:methodName": "GET",
                },
                {
                    href: "coap://localhost:8084/TestServient/properties/wrongDataTypeNumber",
                    contentType: "application/json",
                    op: ["readproperty"],
                },
            ],
        },
        wrongDataTypeObject: {
            description: "property that doesn't return a key that is required",
            type: "object",
            properties: {
                brightness: {
                    type: "number",
                    minimum: 0,
                    maximum: 100,
                },
                status: {
                    type: "string",
                },
            },
            required: ["brightness", "status"],
            readOnly: true,
            writeOnly: false,
            observable: false,
            forms: [
                {
                    href: "http://localhost:8083/TestServient/properties/wrongDataTypeObject",
                    contentType: "application/json",
                    op: ["readproperty", "writeproperty"],
                },
                {
                    href: "coap://localhost:8084/TestServient/properties/wrongDataTypeObject",
                    contentType: "application/json",
                    op: ["readproperty", "writeproperty"],
                },
            ],
        },
        testArray: {
            type: "array",
            items: {
                type: "number",
            },
            readOnly: false,
            writeOnly: false,
            observable: false,
            forms: [
                {
                    href: "http://localhost:8083/TestServient/properties/testArray",
                    contentType: "application/json",
                    op: ["readproperty", "writeproperty"],
                },
                {
                    href: "coap://localhost:8084/TestServient/properties/testArray",
                    contentType: "application/json",
                    op: ["readproperty", "writeproperty"],
                },
            ],
        },
    },
    actions: {
        setCounter: {
            input: {
                type: "number",
            },
            forms: [
                {
                    href: "http://localhost:8083/TestServient/actions/setCounter",
                    contentType: "application/json",
                    op: ["invokeaction"],
                    "htv:methodName": "POST",
                },
                {
                    href: "coap://localhost:8084/TestServient/actions/setCounter",
                    contentType: "application/json",
                    op: "invokeaction",
                },
            ],
            idempotent: false,
            safe: false,
        },
        getTemperature: {
            output: {
                type: "number",
            },
            forms: [
                {
                    href: "http://localhost:8083/TestServient/actions/getTemperature",
                    contentType: "application/json",
                    op: ["invokeaction"],
                    "htv:methodName": "POST",
                },
                {
                    href: "coap://localhost:8084/TestServient/actions/getTemperature",
                    contentType: "application/json",
                    op: "invokeaction",
                },
            ],
            idempotent: false,
            safe: false,
        },
        setDisplay: {
            input: {
                type: "string",
            },
            output: {
                type: "string",
            },
            forms: [
                {
                    href: "http://localhost:8083/TestServient/actions/setDisplay",
                    contentType: "application/json",
                    op: ["invokeaction"],
                    "htv:methodName": "POST",
                },
                {
                    href: "coap://localhost:8084/TestServient/actions/setDisplay",
                    contentType: "application/json",
                    op: "invokeaction",
                },
            ],
            idempotent: false,
            safe: false,
        },
        setTestObject: {
            input: {
                type: "object",
                properties: {
                    brightness: {
                        type: "number",
                        minimum: 0,
                        maximum: 100,
                    },
                    status: {
                        type: "string",
                    },
                },
            },
            forms: [
                {
                    href: "http://localhost:8083/TestServient/actions/setTestObject",
                    contentType: "application/json",
                    op: ["invokeaction"],
                    "htv:methodName": "POST",
                },
                {
                    href: "coap://localhost:8084/TestServient/actions/setTestObject",
                    contentType: "application/json",
                    op: "invokeaction",
                },
            ],
            idempotent: false,
            safe: false,
        },
        longTakingAction: {
            description: "Action that can fail because of taking longer than usual (5s)",
            input: {
                type: "array",
                items: {
                    type: "number",
                },
            },
            output: {
                type: "array",
                items: {
                    type: "number",
                },
            },
            forms: [
                {
                    href: "http://localhost:8083/TestServient/actions/longTakingAction",
                    contentType: "application/json",
                    op: ["invokeaction"],
                    "htv:methodName": "POST",
                },
                {
                    href: "coap://localhost:8084/TestServient/actions/longTakingAction",
                    contentType: "application/json",
                    op: "invokeaction",
                },
            ],
            idempotent: false,
            safe: false,
        },
    },
    events: {
        failEvent: {
            data: {
                type: "number",
            },
            forms: [
                {
                    href: "coap://localhost:8084/TestServient/events/failEvent",
                    contentType: "application/json",
                    op: ["subscribeevent", "unsubscribeevent", "subscribeevent", "unsubscribeevent"],
                },
            ],
        },
    },
    id: "urn:uuid:560290c8-6490-4a58-99ca-eea9bc8c25d2",
    "@context": "https://www.w3.org/2019/wot/td/v1",
    "@type": "Thing",
    security: ["nosec_sc"],
    forms: [
        {
            href: "http://localhost:8083/TestServient/all/properties",
            contentType: "application/json",
            op: ["readallproperties", "readmultipleproperties", "writeallproperties", "writemultipleproperties"],
        },
    ],
    securityDefinitions: {
        nosec_sc: {
            scheme: "nosec",
        },
    },
}

export const perfectThingTD = {
    title: "TestServient",
    description: "Test servient that can be used as a servient to be tested with the WoT Test Bench",
    properties: {
        display: {
            type: "string",
            observable: true,
            readOnly: false,
            writeOnly: false,
            forms: [
                {
                    href: "coap://localhost:8082/TestServient/properties/display",
                    contentType: "application/json",
                    op: ["readproperty", "writeproperty", "observeproperty", "unobserveproperty"],
                },
            ],
        },
        counter: {
            type: "number",
            observable: true,
            readOnly: false,
            writeOnly: false,
            forms: [
                {
                    href: "coap://localhost:8082/TestServient/properties/counter",
                    contentType: "application/json",
                    op: ["readproperty", "writeproperty", "observeproperty", "unobserveproperty"],
                },
            ],
        },
        temperature: {
            type: "number",
            readOnly: true,
            observable: true,
            writeOnly: false,
            forms: [
                {
                    href: "coap://localhost:8082/TestServient/properties/temperature",
                    contentType: "application/json",
                    op: ["readproperty", ["observeproperty", "unobserveproperty"]],
                },
            ],
        },
        testObject: {
            type: "object",
            properties: {
                brightness: {
                    type: "number",
                    minimum: 0,
                    maximum: 100,
                },
                status: {
                    type: "string",
                },
            },
            readOnly: false,
            writeOnly: false,
            observable: false,
            forms: [
                {
                    href: "http://localhost:8081/TestServient/properties/testObject",
                    contentType: "application/json",
                    op: ["readproperty", "writeproperty"],
                },
                {
                    href: "coap://localhost:8082/TestServient/properties/testObject",
                    contentType: "application/json",
                    op: ["readproperty", "writeproperty"],
                },
            ],
        },
        testArray: {
            type: "array",
            items: {
                type: "number",
            },
            readOnly: false,
            writeOnly: false,
            observable: false,
            forms: [
                {
                    href: "http://localhost:8081/TestServient/properties/testArray",
                    contentType: "application/json",
                    op: ["readproperty", "writeproperty"],
                },
                {
                    href: "coap://localhost:8082/TestServient/properties/testArray",
                    contentType: "application/json",
                    op: ["readproperty", "writeproperty"],
                },
            ],
        },
    },
    actions: {
        setCounter: {
            input: {
                type: "number",
            },
            forms: [
                {
                    href: "http://localhost:8081/TestServient/actions/setCounter",
                    contentType: "application/json",
                    op: ["invokeaction"],
                    "htv:methodName": "POST",
                },
                {
                    href: "coap://localhost:8082/TestServient/actions/setCounter",
                    contentType: "application/json",
                    op: "invokeaction",
                },
            ],
            idempotent: false,
            safe: false,
        },
        getTemperature: {
            output: {
                type: "number",
            },
            forms: [
                {
                    href: "http://localhost:8081/TestServient/actions/getTemperature",
                    contentType: "application/json",
                    op: ["invokeaction"],
                    "htv:methodName": "POST",
                },
                {
                    href: "coap://localhost:8082/TestServient/actions/getTemperature",
                    contentType: "application/json",
                    op: "invokeaction",
                },
            ],
            idempotent: false,
            safe: false,
        },
        setDisplay: {
            input: {
                type: "string",
            },
            output: {
                type: "string",
            },
            forms: [
                {
                    href: "http://localhost:8081/TestServient/actions/setDisplay",
                    contentType: "application/json",
                    op: ["invokeaction"],
                    "htv:methodName": "POST",
                },
                {
                    href: "coap://localhost:8082/TestServient/actions/setDisplay",
                    contentType: "application/json",
                    op: "invokeaction",
                },
            ],
            idempotent: false,
            safe: false,
        },
        setTestObject: {
            input: {
                type: "object",
                properties: {
                    brightness: {
                        type: "number",
                        minimum: 0,
                        maximum: 100,
                    },
                    status: {
                        type: "string",
                    },
                },
            },
            forms: [
                {
                    href: "http://localhost:8081/TestServient/actions/setTestObject",
                    contentType: "application/json",
                    op: ["invokeaction"],
                    "htv:methodName": "POST",
                },
                {
                    href: "coap://localhost:8082/TestServient/actions/setTestObject",
                    contentType: "application/json",
                    op: "invokeaction",
                },
            ],
            idempotent: false,
            safe: false,
        },
        setTestArray: {
            input: {
                type: "array",
                items: {
                    type: "number",
                },
            },
            output: {
                type: "array",
                items: {
                    type: "number",
                },
            },
            forms: [
                {
                    href: "http://localhost:8081/TestServient/actions/setTestArray",
                    contentType: "application/json",
                    op: ["invokeaction"],
                    "htv:methodName": "POST",
                },
                {
                    href: "coap://localhost:8082/TestServient/actions/setTestArray",
                    contentType: "application/json",
                    op: "invokeaction",
                },
            ],
            idempotent: false,
            safe: false,
        },
    },
    events: {
        onChange: {
            data: {
                type: "number",
            },
            forms: [
                {
                    href: "coap://localhost:8082/TestServient/events/onChange",
                    contentType: "application/json",
                    op: ["subscribeevent", "unsubscribeevent"],
                },
                {
                    href: "http://localhost:8081/TestServient/events/onChange",
                    contentType: "application/json",
                    subprotocol: "longpoll",
                    op: ["subscribeevent", "unsubscribeevent"],
                },
            ],
        },
        onChangeTimeout: {
            data: {
                type: "number",
            },
            forms: [
                {
                    href: "coap://localhost:8082/TestServient/events/onChangeTimeout",
                    contentType: "application/json",
                    op: ["subscribeevent", "unsubscribeevent"],
                },
                {
                    href: "http://localhost:8081/TestServient/events/onChangeTimeout",
                    contentType: "application/json",
                    subprotocol: "longpoll",
                    op: ["subscribeevent", "unsubscribeevent"],
                },
            ],
        },
    },
    "@context": "https://www.w3.org/2019/wot/td/v1",
    "@type": "Thing",
    security: ["nosec_sc"],
    id: "urn:uuid:3999c3d8-1b55-4c05-bc63-c91f0981cf36",
    forms: [
        {
            href: "http://localhost:8081/TestServient/all/properties",
            contentType: "application/json",
            op: ["readallproperties", "readmultipleproperties", "writeallproperties", "writemultipleproperties"],
        },
    ],
    securityDefinitions: {
        nosec_sc: {
            scheme: "nosec",
        },
    },
}
