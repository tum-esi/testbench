# Web of Things Test Bench

Tests a WoT Thing by executing interactions automatically, based on its Thing Description.

A Thing Description should represent capabilities of a device. This implies that if a device support the interactions that a client can execute based on the device's TD, it doesn't comply to its own TD. Test bench tests whether:
* every interaction written in the TD can be executed
* writable properties are indeed writable
* each interaction returns the described data type (DataSchema of TD Spec)

TD Version Used: TPAC Lyon 2018, 18 October

<!-- #### Compatible with Thing Description versions: [5.April-18](https://www.w3.org/TR/2018/WD-wot-thing-description-20180405/), W3C Editor's Draft 22 June 2018, and should also work with W3C Editor's Draft 26 June 2018 (last one not tested).   -->
___

## Installation 
### Linux:

- install git: `sudo apt install -y git`
- install node: `sudo apt-get install -y nodejs` (node --version v8.10.0)
- install npm: `sudo apt install -y npm` (npm --version 3.5.2)

Clone testbench repository from [https://github.com/jplaui/testbench](https://github.com/jplaui/testbench): `git clone https://github.com/jplaui/testbench.git`

- Switch into `testbench` folder and execute the `install.sh` script.
- Now you are able to run the testbench inside the testbench directory with: `npm start`
- Interact with the testbench using REST clients such as `cURL`, `Postman` etc.

**TestBench is a WoT Thing itself, so you can interact with it like you interact with other WoT servients.**

**Postman**:

| **PUT** | TestBench config update |
| ------------- |:-------------:|
| content-type      | application/json | 
| body      |  config json data   | 
| data-type | raw |
| url | http://your-address:8980/wot-test-bench/properties/testConfig | 

**cURL**:

`curl -X POST -H "Content-Type: application/json" -d '{configuration-data}' http://your-address:8080/wot-test-bench/properties/testConfig`

___

## Example Usage


1. Start a servient that has a TD so that TestBench can interact with it.
    1.  `testing-files/faultyThing.js` shows an example test servient with ONLY BAD implementations. Run `faultyThing.js` by executing `node testing-files/faultyThing.js` inside `testbench` directory.
    2.  `testing-files/perfectThing.js` shows an example test servient with ONLY GOOD implementations. Run `perfectThing.js` by executing `node testing-files/perfectThing.js` inside `testbench` directory.
   
2. Run the TestBench by executing `node dist/wot-test-bench.js` inside the `testbench` directory.
    1. Before doing so, you can configure the test bench by changing the `default-config.json` file.

3. Start `Postman` software: [Postman](https://www.getpostman.com/)

4. Send the TD of the Thing you want to test by writing into the `thingUnderTestTD` property
    1. `faultyThing.js` has a TD named `faultThingTD.jsonld` in the testing-files directory. Warning!: This TD will change based on your network so make sure to update it.


| **PUT** | TestBench update TuT Property |
| ------------- |:-------------:|
| content-type      | application/json | 
| body      |  Thing Description   | 
| data-type | raw |
| url | ttp://your-address:8980/wot-test-bench/properties/thingUnderTestTD |
| return value: | no return value |

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

| **POST** | TestBench initiation |
| ------------- |:-------------:|
| content-type      | application/json | 
| body      |  boolean   | 
| data-type | raw |
| url | http://your-address:8980/wot-test-bench/actions/initiate |
| return value: | boolean if successful |


7. (Optional) Change the data that will be sent to the Thing under Test by writing to the `testData` property.

| **PUT** | TestBench change request data |
| ------------- |:-------------:|
| content-type      | application/json | 
| body      |  [[\{"interactionName":"testObject","interactionValue":\{"brightness":50,"status":"my change"\}\},\{"interactionName":"testObject","interactionValue":\{"brightness":41.447134566914734,"status":"ut aut"\}\}],[\{"interactionName":"testArray","interactionValue":[87987366.27759776,18277015.91254884,-25996637.898988828,-31082548.946999773]\},\{"interactionName":"testArray","interactionValue":[2907339.2741234154,-24383724.353494212]}],[\{"interactionName":"display","interactionValue":"eu ad laborum"\}, ... ], ... ]  | 
| data-type | raw |
| url | http://your-address:8980/wot-test-bench/actions/updateRequests |
| return value: | no return value |

8. Test the configured Thing by invoking `testThing` action. Test bench reads the testData property and executes testing procedure on consumed Thing. Then, it exposes a test report. Body set to `"true"` activates logging to console.

| **POST** | TestBench execute action testThing |
| ------------- |:-------------:|
| content-type      | application/json | 
| body      |  "true"   | 
| data-type | raw |
| url | http://your-address:8980/wot-test-bench/actions/testThing | 
| return value: | boolean if successful |

9. Read the test report by reading the testReport property.

***

- This link provides all possible postman interaction examples [https://documenter.getpostman.com/view/4378601/RWEmHGBq](https://documenter.getpostman.com/view/4378601/RWEmHGBq).

- How to use testbench screencast video can be found here [https://youtu.be/BDMbXZ2O7KI](https://youtu.be/BDMbXZ2O7KI).

- You can use your browser and the GET requests to inspect all properties during the procedure.


## To-Do

In the order of priority, the following need to be implemented
 

1. Simple Report Creation
2. Event Testing (in order of priority)
    1. Testing whether you can subscribe to events
    2. Testing whether you can unsubscribe from events
    3. Testing whether the JSON delivered by event match the JSON Schema
3. Observable Property Testing: Need to define the objectives
4. Coap and MQTT server
   