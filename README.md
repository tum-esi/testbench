# Web of Things Test Bench

[![Build Status](https://travis-ci.org/tum-esi/testbench.svg?branch=master)](https://travis-ci.org/tum-esi/testbench)
[![code style: prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg?style=flat-square)](https://github.com/prettier/prettier)

Tests a WoT Thing by executing interactions automatically, based on its Thing Description.

A Thing Description should represent capabilities of a device. This implies that if a device support the interactions that a client can execute based on the device's TD, it doesn't comply to its own TD. Test bench tests whether:

-   Every interaction written in the TD can be executed
-   Writable properties are indeed writable
-   Each interaction returns the described data type (DataSchema of TD Spec)

TD Version Used: Princeton Testfest 2019

---

## Installation

### Prerequisites:

-   git: `sudo apt install -y git`
-   node.js: `sudo apt-get install -y nodejs` (node --version v8.10.0)
-   npm: `sudo apt install -y npm` (npm --version 3.5.2)

### Steps

1. Clone testbench from [its repository](git@github.com:tum-esi/testbench.git) by `git clone git@github.com:tum-esi/testbench.git`
2. Switch into `testbench` folder
3. Execute the `npm install`. This will install every required library, including `node-wot`
4. Execute `npm run-script build`

## Example Usage

### Quick Method with Default Configuration

0. Start a servient that has a TD so that TestBench can interact with it.

    1. `testing-files/faultyThing.js` shows an example test servient with ONLY BAD implementations. Run `faultyThing.js` by executing `node testing-files/faultyThing.js` inside `testbench` directory.
    2. `testing-files/perfectThing.js` shows an example test servient with ONLY GOOD implementations. Run `perfectThing.js` by executing `node testing-files/perfectThing.js` inside `testbench` directory.

1. Run with: `npm start`
2. Interact with the testbench using REST clients such as `cURL`, `Postman` etc.

    1. Test a servient by sending its TD

| **POST**     |                  Test Thing with given TD                  |
| ------------ | :--------------------------------------------------------: |
| content-type |                      application/json                      |
| body         |                     Thing Description                      |
| data-type    |                            raw                             |
| url          | `http://your-address:8980/wot-test-bench/actions/fastTest` |
| return value |                  JSON Array with results                   |

**TestBench is a WoT Thing itself with a TD, so you can interact with it like you interact with other WoT servients.**

**Postman**:

| **PUT**      |                     TestBench config update                     |
| ------------ | :-------------------------------------------------------------: |
| content-type |                        application/json                         |
| body         |                        config json data                         |
| data-type    |                               raw                               |
| url          | `http://your-address:8980/wot-test-bench/properties/testConfig` |

**cURL**:

`curl -X POST -H "Content-Type: application/json" -d '{configuration-data}' http://your-address:8080/wot-test-bench/properties/testConfig`

---

### Method with all Customization Options

1. Start a servient that has a TD so that TestBench can interact with it.

    1. `testing-files/faultyThing.js` shows an example test servient with ONLY BAD implementations. Run `faultyThing.js` by executing `node testing-files/faultyThing.js` inside `testbench` directory.
    2. `testing-files/perfectThing.js` shows an example test servient with ONLY GOOD implementations. Run `perfectThing.js` by executing `node testing-files/perfectThing.js` inside `testbench` directory.

2. Run the TestBench by executing `npm start`.

    1. Before doing so, you can configure the test bench by changing the `default-config.json` file.

3. Start `Postman` software: [Postman](https://www.getpostman.com/)

4. Send the TD of the Thing you want to test by writing into the `thingUnderTestTD` property
    1. `faultyThing.js` has a TD named `faultThingTD.jsonld` in the testing-files directory. Warning!: This TD will change based on your network so make sure to update it.

| **PUT**       |                     TestBench update TuT Property                     |
| ------------- | :-------------------------------------------------------------------: |
| content-type  |                           application/json                            |
| body          |                           Thing Description                           |
| data-type     |                                  raw                                  |
| url           | `http://your-address:8980/wot-test-bench/properties/thingUnderTestTD` |
| return value: |                            no return value                            |

5. (Optional) Update the test configuration by writing to the `testConfig` property.
    1. This is not optional if you have to add security configuration. You should resend the test configuration with the credentials filled according to the Thing you want to test, like in the following example:

```
    "credentials": {
        THING_ID1: {
            "token": TOKEN
        },
        THING_ID2: {
            "username": USERNAME,
            "password": PASSWORD
        }
    }
```

6. Call initialization sequence of the TestBench by invoking the `initiate` action. This is where TestBench reads new configurations, consumes the provided TD of Thing under Test and exposes generated `testData` which is sent during testing procedure as a property of TestBench. Input data `"true"` activates logging to console which can show detailed error logs.

| **POST**      |                    TestBench initiation                    |
| ------------- | :--------------------------------------------------------: |
| content-type  |                      application/json                      |
| body          |                          boolean                           |
| data-type     |                            raw                             |
| url           | `http://your-address:8980/wot-test-bench/actions/initiate` |
| return value: |                   boolean if successful                    |

7. (Optional) Change the data that will be sent to the Thing under Test by writing to the `testData` property.

| **PUT**       |                                                                                                                                                                                                                                                   TestBench change request data                                                                                                                                                                                                                                                   |
| ------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------: |
| content-type  |                                                                                                                                                                                                                                                         application/json                                                                                                                                                                                                                                                          |
| body          | [[\{"interactionName":"testObject","interactionValue":\{"brightness":50,"status":"my change"\}\},\{"interactionName":"testObject","interactionValue":\{"brightness":41.447134566914734,"status":"ut aut"\}\}],[\{"interactionName":"testArray","interactionValue":[87987366.27759776,18277015.91254884,-25996637.898988828,-31082548.946999773]\},\{"interactionName":"testArray","interactionValue":[2907339.2741234154,-24383724.353494212]}],[\{"interactionName":"display","interactionValue":"eu ad laborum"\}, ... ], ... ] |
| data-type     |                                                                                                                                                                                                                                                                raw                                                                                                                                                                                                                                                                |
| url           |                                                                                                                                                                                                                                 `http://your-address:8980/wot-test-bench/actions/updateRequests`                                                                                                                                                                                                                                  |
| return value: |                                                                                                                                                                                                                                                          no return value                                                                                                                                                                                                                                                          |

8. Test the configured Thing by invoking `testThing` action. Test bench reads the testData property and executes testing procedure on consumed Thing. Then, it exposes a test report. Body set to `"true"` activates logging to console.

| **POST**      |             TestBench execute action testThing              |
| ------------- | :---------------------------------------------------------: |
| content-type  |                      application/json                       |
| body          |                           "true"                            |
| data-type     |                             raw                             |
| url           | `http://your-address:8980/wot-test-bench/actions/testThing` |
| return value: |                    boolean if successful                    |

9. Read the test report by reading the testReport property.

---

-   This link provides all possible postman interaction examples [https://documenter.getpostman.com/view/4378601/RWEmHGBq](https://documenter.getpostman.com/view/4378601/RWEmHGBq).

-   How to use testbench screencast video can be found here [https://youtu.be/BDMbXZ2O7KI](https://youtu.be/BDMbXZ2O7KI).

-   You can use your browser and the GET requests to inspect all properties during the procedure.

## How does the testing work?

-   During the whole testing process every step is logged in the CLI if logMode is enabled. Additionally any sent or received Data is written
    into the test report together with an analysis of the process.
-   The testing process consists of four stages:

### Starting Phase

-   The testbench extracts the schemas of the different interactions (properties, actions and events) from the TD provided in the payload
    of the GET request.
-   It then generates random requests that match these extracted schemas.

### Main Phase

-   Now every interaction is tested sequentially. This asynchronus testing leeds to a easily readable log.

-   Actions

    -   The testbench sends a request matching the input specified in the TD.
    -   The testbench verifies the actual output against the output specified in the TD.

-   Properties:

    -   The reading functionality is tested by sending the specified request for readProperty to the Thing and verifying the output
        against output specified in the TD.
    -   The writing functionality is tested by sending the specified request for writeProperty to the Thing. Afterwards the
        testbench tries to read the property again and checks if the read matched the write. A non matching read is still counted as
        a pass, due to the fact that the property could have just changed between the write and read request.
    -   For observing functionality see Events just with observeProperty and unobserveProperty requests instead of subscribeEvent and
        unsubscribeEvent requests

-   Events (three stages)

    <img src="readme-images/eventTesting.svg" align="center" height="800">

    -   The subscription test
        -   The testbench sends the specified request for subscribeEvent to the Thing. Node-wot can in some cases not differentiate
            between an successful subscription and an unsuccessful subscription with the Thing just not emitting an event, so the
            subscription test has essentially three different outcomes: Successful, Timeout and Failed. Successful describes the case
            where node-wot confirms a successful subscription, Timeout describes the case where node-wot can not differentiate (see
            above) and Failed describes the case where node-wot throws an error during subscription (The timeout length can be configured in
            the testConfig).
    -   The listening phase
        -   Is only active if the subscription was successful.
        -   The testbench listens for any incoming data for this subscription. Any received data is verified against output specified
            in the TD.
        -   The listening phase ends after a configurable amount of time or when a configurable amount of data packages was received
            (both options can be configured in the testConfig).
    -   The cancel subscription test (depends on the outcome fot the subscription test)
        -   If subscription test was successful the testbench sends the specified request for unsubscribeEvent.
        -   If subscription test was a timeout, the testbench can not know if the subscription was successful so it does not test
            anything.
        -   If subscription test was a fail the testbench can obviously not cancel the subscription so it does not test anything.

-   The test request is returned with the current state of the testReport.
-   The testReport property is updated with the current state of the testReport

### Synchronous listening Phase (only if events or observable properties are present; optional)

-   Can be explicitly deactivated in the testConfig.
-   All Events and observable properties are tested again but this time synchronously. This synchronous testing needs significantly less
    time but results in a pretty hard to read log.
-   The timeout length, listening length and the received data package threshold can all be configured independent of the listening phase of
    the sequential tests in the testConfig.

### Ending Phase

-   The finished testReport is written to the storage
-   If the Synchronous listening phase was present the testReport property is updated to the current state.
-   The testbench is reset to be ready for the next test run.

### TLDR

<img src="readme-images/testingProcess.svg" align="center" height="400" width="400">

## To-Do

In the order of priority, the following need to be implemented

1. Simple Report Creation
2. Event Testing (in order of priority)
    1. Testing whether you can subscribe to events
    2. Testing whether you can unsubscribe from events
    3. Testing whether the JSON delivered by event match the JSON Schema
3. Observable Property Testing: Need to define the objectives
4. Coap and MQTT server
