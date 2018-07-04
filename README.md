## TestBench-v1.1 Documentation bundang-v1.1:

#### This TestBench version is compatible with a Thing prepared for Bundang Plugfest.

#### test-bench-V1.1.ts uses [eclipse/thingweb.node-wot](https://github.com/eclipse/thingweb.node-wot) and [WoT-TD-Specification](https://w3c.github.io/wot-thing-description/) W3C Editor's Draft 22 June 2018.
___

### Installation uder ubuntu 18.04:

- Install git: `sudo apt install -y git`(git --version 2.17.1)
- Install node: `sudo apt-get install -y nodejs` (node --version v8.10.0)
- Install npm: `sudo apt install -y npm` (npm --version 3.5.2)
- Install typescript: `npm install -g typescript` (tsc -version 2.8.3)
- Install lerna: `npm install -g lerna` (lerna -version 2.11.0)

Clone this repository from [https://github.com/jplaui/testbench](https://github.com/jplaui/testbench): 

- Execute: `git clone https://github.com/jplaui/testbench.git`

Get bundang-v1.1 branch of repository locally:

- Inside `testbench` folder, execute: `git fetch origin`
- Afterwars execute: `git checkout -b bundang-v1.1 origin/bundang-v1.1`
- Check with `git branch -a` that your local clone contains and is switched to branch bundang-v1.1

Installation of TestBench 

- Switch to `testbench` folder and execute: `npm install`
- Switch to `node_modules` folder and clone node-wot repository [https://github.com/eclipse/thingweb.node-wot](https://github.com/eclipse/thingweb.node-wot) with `git clone https://github.com/eclipse/thingweb.node-wot.git`.
- Jump into `thingweb.node-wot` folder and execute: `npm install` and `npm run bootstrap` and `sudo npm run build`

- Return back into testbench folder and execute: `tsc -p .` (Make sure you typed the dot)
- Now you are able to run the TestBench inside the testbench folder with: `node dist/test-bench-V1.1.js`
- Interact with the TestBench using `curl` or `Postman` or how you usually interact with WoT servients:

**Postman**:

| **PUT** | TestBench config update |
| ------------- |:-------------:|
| content-type      | application/json | 
| body      |  config json data   | 
| data-type | raw |
| url | http://your-address:your-port/test-bench-V1.1/properties/testConfig | 

**curl**:

`curl -X POST -H "Content-Type: application/json" -d '{configuration-data}' http://your-address:8080/thing_test_bench/properties/testConfig`

___

## Example test of a Thing via Test Bench:

Always remember that TestBench is a WoT Thing too.

0. Compile all typescript files inside testbench folder with: `tsc -p .`

1. Start a test servient so that TestBench can interact with it: testing-files/test_servient.js shows such a servient. test_servient.js Thing Description `myTuT-complete.jsonld` from testbench repository must be sent using a PUT request to `thingUnderTestTD` property of testbench. Run `test_servient.js` by executing `node testing-files/test_servient.js` inside `testbench` folder. Run TestBench by executing `node dist/test-bench-V1.1.js` inside `testbench` folder.

2. Start `Postman` software: [Postman](https://www.getpostman.com/)

3. Start to interact with TestBench:

- **(mandatory) First update Thing under Test (TuT) TD**: Do a property write with Thing Description of the Thing you want to test.

  - **(optional) Update configuration**: Update test config property with a property write.

- **(mandatory) Initialize**: Invoke the initialization of the TestBench where TestBench reads new configurations, consumes the provided Thing via its Thing Description and exposes generated `testData` as a property which is sent during the testing procedure. If the body is set to `"true"`, logging to console is enabled. This is useful only if the TestBench is deployed on your computer.

	- **(optional) Update test data**: Change the generated fake request values with the custom values. This is done when you want to test specific values.

- **(mandatory) Test the Thing**: TestBench reads the testData property and executes testing scenarios on the consumed Thing. Then it exposes a test report as a property. If the body is set to `"true"`, logging to console is enabled. This is useful only if the TestBench is deployed on your computer.

***

- [This](https://documenter.getpostman.com/view/4378601/RWEmHGBq) link provides all possible postman interaction examples.

- How to use the TestBench can be found [here](https://youtu.be/BDMbXZ2O7KI) as a screen recording.

- The properties can be read to inpect the procedure.

***

## Missing features which will be added soon:

- Observable properties testing
- Events testing
- Handling security requirements

