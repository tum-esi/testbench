# Web of Things Test Bench

[![CI & CD Pipeline](https://github.com/tum-esi/testbench/actions/workflows/ci-cd.yml/badge.svg)](https://github.com/tum-esi/testbench/actions/workflows/ci-cd.yml)
[![code style: prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg)](https://github.com/prettier/prettier)
![npm](https://img.shields.io/npm/v/wot-testbench)

Tests a WoT Thing by executing interactions automatically, based on its Thing Description.

A Thing Description should represent capabilities of a device. This implies that if a device support the interactions that a client can execute based on the device's TD, it doesn't comply to its own TD. Test bench tests aspects such as:

-   Every interaction written in the TD can be executed
-   Writable properties are indeed writable
-   Each interaction returns the described data type (DataSchema of TD Spec)
-   Is the Thing vulnerable to attacks such as dictionnary attacks or inputs outside the allowed range

See the related paper **Streamlining IoT System Development with Open Standards**.
```
@article{kks:2020,
  url          = { https://tum-esi.github.io/publications-list/PDF/2020-deGruyter_IT-Streamlining%20IoT%20System%20Development%20with%20Open%20Standards.pdf },
  month        = { 12 },
  issn         = { 1611-2776 },
  doi          = { 10.1515/itit-2020-0016 },
  pages        = { 215 - 226 },
  number       = { 5-6 },
  volume       = { 62 },
  year         = { 2020 },
  title        = { Streamlining IoT System Development with Open Standards },
  journal      = { it - Information Technology },
  author       = { Ege Korkan and Sebastian Kaebisch and Sebastian Steinhorst },
}
```

---

## Installation

### Prerequisites:

-   Node.js: `sudo apt-get install -y nodejs` (currently version 20 is not supported)
-   Typescript: `npm install -g typescript`
-   ts-node: `npm install -g ts-node`

### Steps

1. Clone testbench from [its repository](git@github.com:tum-esi/testbench.git) by `git clone git@github.com:tum-esi/testbench.git`
2. Switch into `testbench` folder
3. Execute the `npm install`. This will install every required library, including `node-wot`
4. Execute `npm run-script build`

## Example Usage

### Quick Method with Default Configuration

0. Start a servient that has a TD so that TestBench can interact with it.

    1. `testing-files/faultyThing.ts` shows an example test servient with ONLY BAD implementations. Run `faultyThing.ts` by executing `ts-node testing-files/faultyThing.ts` inside `testbench` directory.
    2. `testing-files/perfectThing.ts` shows an example test servient with ONLY GOOD implementations. Run `perfectThing.ts` by executing `ts-node testing-files/perfectThing.ts` inside `testbench` directory.

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

`curl -X POST -H "Content-Type: application/json" -d '{configuration-data}' http://your-address:8980/wot-test-bench/properties/testConfig`

**IMPORTANT: fastTest does two things:**  
1. calls `testThing` and sets result of this action to the value of `conformance` key in the `testReport`.
2. calls `testVulnerabilities` and sets result of this action to the value of `vulnerabilities` key in the `testReport`.
---

## Method with all Customization Options
### Testing for Conformance

In conformance test, the TestBench sends valid requests to the Thing, and validates responses, via `testThing` action.

1. Start a servient that has a TD so that TestBench can interact with it.

    1. `testing-files/faultyThing.ts` shows an example test servient with ONLY BAD implementations. Run `faultyThing.ts` by executing `ts-node testing-files/faultyThing.ts` inside `testbench` directory.
    2. `testing-files/perfectThing.ts` shows an example test servient with ONLY GOOD implementations. Run `perfectThing.ts` by executing `ts-node testing-files/perfectThing.ts` inside `testbench` directory.

2. Run the TestBench by executing `npm start`.

    1. Before doing so, you can configure the test bench by changing the `defaultConfig` inside `defaults.ts` file.

3. Start `Postman` software: [Postman](https://www.getpostman.com/)

4. Send the TD of the Thing you want to test by writing into the `thingUnderTestTD` property
    1. `faultyThing.ts` creates a TD for itself after it has run. Run `curl http://localhost:8083/faulty-thing-servient` to get TD. Warning!: Ports might cause an error, so either make sure port numbers inside the `faultyThing.ts` file are available or change them.

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
### Testing for Coverage

The action, `testAllLevels`, tests for different levels of coverage. Levels include Operation, Parameter, Input and Output.

1. Test a servient for all coverage levels by sending its TD

| **POST**     |                  Test Thing with given TD                          |
| ------------ | :----------------------------------------------------------------: |
| content-type |                      application/json                              |
| body         |                     Thing Description                              |
| data-type    |                            raw                                     |
| url          | `http://your-address:8980/wot-test-bench/actions/testAllLevels`    |
| return value |                  JSON Array with results                           |

---

### Testing for Vulnerabilities

The action, `testVulnerabilities`, tests for vulnerabilities, both from security and safety perspectives.

The main motivation behind this action is to cover the **security** of the Thing. From pre-determined sets of usernames and passwords, this action involves performing penetration testing with dictionary attacks. It also performs some common safety tests similar to those done under `testThing`.

Perform steps 1 - 6 as described above, then send a `POST` request with a body containing **true** or **false** *(indicating whether to perform a relatively faster and less covering test or not, **true:** a small subset of all combinations, **false:** all combinations)* to `http://your-address:8980/wot-test-bench/actions/testVulnerabilities`. Read the test report by sending a `GET` request to `http://your-address:8980/wot-test-bench/properties/testReport`.

### Structure of the Vulnerability Report

Mainly consists of two parts: `propertyReports` containing reports of `properties`, and `actionReports` containing those of `actions`.

Each one of these reports consists of:

1. `propertyName` / `actionName` to distinguish from other properties/actions.

2. `security`, which contains
   - `passedDictionaryAttack` indicating whether the credentials needed to access this property/action (directly or indirectly) are found in the pre-determined username-password combinations. **true** unless a suitable pair of credentials are found by dictionary attack.

   - `description`, used for human readability purposes.

   - *optional* `id` and `pw`: these two contains the username and password *if* `passedDictionaryAttack` is `false`.

3. `safety`, which contains
   - *(if property report)* `isReadable` indicating whether this property can be read. **Must** be compared with the property in the TD. In an non-erroneous case, they should match. *e.g.* for a `writeOnly` property this should be **false**.

   - *(if property report)* `isWritable` indicating whether this property can be written. **Must** be compared with the property in the TD. In an non-erroneous case, they should match. *e.g.* for a `readOnly` property this should be **false**.

   - `exceptionTypes` indicating the types that **should not** be optimally accepted. If not empty, then those types are accepted by the property/action, you should check for those *exception* types in your implementation.


**Notes**  
- **ALWAYS** call `initiate` after writing `thingUnderTestTD` if you are going to perform `testThing` or `testVulnerabilities` only.

- Depending on where the Thing is hosted and number of `InteractionAffordance`s, this test may take quite some time.
- **Currently only supports HTTP/HTTPs.**
- **Currently only supports `basic` and `oauth2` with `client_credentials` flow.**
- Dictionary attacks are performed on the Thing in case of `basic` security scheme, and on the `token` server in case of `oauth2`.
- In this README, the phrase ***types that should not be optimally allowed*** is frequently used and those are the types that are **not** given in the TD, which should be *optimally* avoided on the implementation side. *e.g.* a `boolean` for a `number` type of property.
- If the `InteractionAffordance` has a different security scheme than the one under `security` of the TD, `testVulnerabilities` throws.
---

-   This link provides all possible postman interaction examples [https://documenter.getpostman.com/view/4378601/RWEmHGBq](https://documenter.getpostman.com/view/4378601/RWEmHGBq).

-   How to use testbench screencast video can be found here [https://youtu.be/BDMbXZ2O7KI](https://youtu.be/BDMbXZ2O7KI).

-   You can use your browser and the GET requests to inspect all properties during the procedure.

## How does the conformance testing work?

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

    <img src="readme-images/eventTesting.svg" align="center" height="725">

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

## How does the coverage testing work?

## How does the vulnerability testing work?

### Starting Phase
   - The security scheme and the string covering that scheme are determined.
   - The usernames and passwords (found under `Resources/`) are read from files. If `fastMode` is **true** (this is the case when `testVulnerabilities` is called from `fastTest`), then only a small number of username-password pairs are tested, as testing may take significant time intervals which is not the case wanted in `fastTest`.

### Main Phase
   - The thing is checked if it has properties and actions.

   - If it has properties, then:
      - Every property is checked if it is `writeOnly` or not.

         - If `writeOnly`:

            - The request options are created for the `writeproperty` operation, then dictionary attack is performed.

            - If dictionary attack finds suitable credentials OR credentials are given via config file, then safety tests are performed.

            - During safety testing, property is first checked for writing types that should and should not be optimally allowed, then checked if it is readable.

         - If not `writeonly`:
            - The request options are created for the `readproperty` operation, then dictionary attack is performed.

            - If dictionary attack finds suitable credentials OR credentials are given via config file, then safety tests are performed.

            - During safety testing, property is first checked if it is readable, then checked if it is writable. While performing writing tests, property is checked with types that should and should not be optimally allowed.

   - If it has actions, then for every action:

        - The request options are created for the `invokeaction` operation, then dictionary attack is performed.

        - If dictionary attack finds suitable credentials OR credentials are given via config file, then safety tests are performed.

        - During safety testing, action are tested if they accept types that should not be optimally allowed.

