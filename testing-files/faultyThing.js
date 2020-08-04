const Servient = require('@node-wot/core').Servient;
const HttpServer = require('@node-wot/binding-http').HttpServer;
const HttpClientFactory = require('@node-wot/binding-http').HttpClientFactory;
const CoapServer = require('@node-wot/binding-coap').CoapServer;
const CoapClientFactory = require('@node-wot/binding-coap').CoapClientFactory;
const XMLHttpRequest = require('xmlhttprequest').XMLHttpRequest;

const srv = new Servient();
const httpSrvObj = {port: 8083};
srv.addServer(new HttpServer(httpSrvObj));
srv.addClientFactory(new HttpClientFactory());
const coapSrvObj = {port: 8084};
srv.addServer(new CoapServer(coapSrvObj));
srv.addClientFactory(new CoapClientFactory());
srv.start()
    .then(WoT => {
        console.log('* started servient');

        const thing = WoT.produce({
            title: 'TestServient',
            description:
                'Test servient that can be used as a servient to be tested with the WoT Test Bench. All interactions have errors explicetely coded',
        });

        thing.addProperty(
            'display',
            {
                type: 'string',
                observable: true,
            },
            'initialization string'
        );

        thing.addProperty(
            'wrongWritable',
            {
                description: "property that says writable but isn't",
                type: 'number',
                observable: true,
            },
            15
        );

        thing.setPropertyWriteHandler('wrongWritable', () => {
            return new Promise((resolve, reject) => {
                console.log('Writing the old value');
                thing.properties['wrongWritable'].write(15);
                resolve(15);
            });
            // return thing.properties["wrongWritable"].write(15).then(() => 15, () => false);
        });

        thing.addProperty(
            'wrongDataTypeNumber',
            {
                description:
                    'property that returns a different data type than the one described',
                type: 'number',
                readOnly: true,
                observable: true,
            },
            'this is not a number'
        );

        thing.addProperty(
            'wrongDataTypeObject',
            {
                description:
                    "property that doesn't return a key that is required",
                type: 'object',
                properties: {
                    brightness: {
                        type: 'number',
                        minimum: 0.0,
                        maximum: 100.0,
                    },
                    status: {
                        type: 'string',
                    },
                },
                required: ['brightness', 'status'],
            },
            {
                brightness: 99.99,
            }
        );

        thing.addProperty(
            'testArray',
            {
                type: 'array',
                items: {
                    type: 'number',
                },
            },
            [12, 15, 10]
        );

        thing.addAction(
            'setCounter',
            {
                input: {
                    type: 'number',
                },
            },
            input => {
                console.log('* ACTION HANDLER FUNCTION for setCounter');
                console.log('* ', input);
                return thing.properties['counter']
                    .write(input)
                    .then(() => {
                        console.log('* Set counter successful');
                        return;
                    })
                    .catch(() => {
                        console.log('* Set counter failed');
                        return;
                    });
            }
        );

        thing.addAction(
            'getTemperature',
            {
                output: {
                    type: 'number',
                },
            },
            () => {
                console.log('* ACTION HANDLER FUNCTION for getTemp');
                return thing.properties['temperature']
                    .read()
                    .then(temp => {
                        console.log('* getTemperature successful');
                        return temp;
                    })
                    .catch(() => {
                        console.log('* getTemperature failed');
                        return 0;
                    });
            }
        );

        thing.addAction(
            'setDisplay',
            {
                input: {
                    type: 'string',
                },
                output: {
                    type: 'string',
                },
            },
            input => {
                console.log('* ACTION HANDLER FUNCTION for setDisplay');
                console.log('* ', input);
                return new Promise((resolve, reject) => {
                    resolve('Display set');
                });
            }
        );

        thing.addAction(
            'setTestObject',
            {
                input: {
                    type: 'object',
                    properties: {
                        brightness: {
                            type: 'number',
                            minimum: 0.0,
                            maximum: 100.0,
                        },
                        status: {
                            type: 'string',
                        },
                    },
                },
            },
            input => {
                console.log('* ACTION HANDLER FUNCTION for setTestObject');
                console.log('* ', input);
                return thing.properties['testObject'].write(input).then(
                    () => input,
                    () => false
                );
            }
        );

        thing.addAction(
            'longTakingAction',
            {
                description:
                    'Action that can fail because of taking longer than usual (5s)',
                input: {
                    type: 'array',
                    items: {
                        type: 'number',
                    },
                },
                output: {
                    type: 'array',
                    items: {
                        type: 'number',
                    },
                },
            },
            input => {
                console.log('* ACTION HANDLER FUNCTION for longTakingAction');
                const promise1 = new Promise((resolve, reject) => {
                    setTimeout(resolve, 5000, input);
                });
                return promise1;
            }
        );

        thing.addEvent('onChange', {
            type: 'number',
        });

        thing.expose().then(() => {
            console.info(thing.title + ' ready');
        });
    })
    .catch(err => {
        throw 'Couldnt connect to servient';
    });
