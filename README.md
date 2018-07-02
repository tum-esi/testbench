## TestBench-v1.1 Documentation bundang-v1.1:

#### This Testbench version is compatible with a Thing prepared for Bundang Plugfest.

#### test-bench-V1.1.ts uses [eclipse/thingweb.node-wot](https://github.com/eclipse/thingweb.node-wot) and [WoT-TD-Specification](https://w3c.github.io/wot-thing-description/) W3C Editor's Draft 22 June 2018.
___

### Installation uder ubuntu 18.04:

- install git: `sudo apt install -y git`(git --version 2.17.1)
- install node: `sudo apt-get install -y nodejs` (node --version v8.10.0)
- install npm: `sudo apt install -y npm` (npm --version 3.5.2)
- install typescript: `npm install -g typescript` (tsc -version 2.8.3)
- install lerna: `npm install -g lerna` (lerna -version 2.11.0)

Clone testbench repository from [https://github.com/jplaui/testbench](https://github.com/jplaui/testbench): 

- execute: `git clone https://github.com/jplaui/testbench.git`

Get bundang-v1.1 branch of repository locally:

- inside `testbench` folder, execute: `git fetch origin`
- afterwars execute: `git checkout -b bundang-v1.1 origin/bundang-v1.1`
- check with `git branch -a`. your local clone should contain and switched to branch bundang-v1.1 now.   

Installation of TestBench 

- Jump into `testbench` folder and execute: `npm install`
- Jump into `node_modules` folder and clone node-wot repository [https://github.com/eclipse/thingweb.node-wot](https://github.com/eclipse/thingweb.node-wot) inside the `node_modules` folder with `git clone https://github.com/eclipse/thingweb.node-wot.git`.
- Jump into `thingweb.node-wot` folder and execute: `npm install` and `npm run bootstrap` and `sudo npm run build`

- Return back into testbench folder and execute: `tsc -p .`
- Now you are able tu run the testbench inside the testbench folder with: `node dist/test-bench-V1.1.js`
- Interact with the testbench using `curl` or `portman` or others:

**postman**:

| **PUT** | TestBench config update |
| ------------- |:-------------:|
| content-type      | application/json | 
| body      |  config json data   | 
| data-type | raw |
| url | http://your-address:8080/test-bench-V1.1/properties/testConfig | 

**curl**:

`curl -X POST -H "Content-Type: application/json" -d '{configuration-data}' http://your-address:8080/thing_test_bench/properties/testConfig`

___

## TestBench example test of a Thing Description:
TestBench is a Thing itself

0. Compile all typescript files inside testbench folder with: `tsc -p .`

1. Start a test servient so TestBench can interact with it: testing-files/test_servient.js shows an example test servient. test_servient.js Thing Description `myTuT-complete.jsonld` from testbench repository must be sent using a PUT request to `thingUnderTestTD` property of testbench. Run `test_servient.js` by executing `node testing-files/test_servient.js` inside `testbench` folder. Run TestBench by executing `node dist/test-bench-V1.1.js` inside `testbench` folder.

2. Start `portman` software: [Postman](https://www.getpostman.com/)

3. Start to interact with TestBench:

- **First update TuT TD (mandatory)**: Send Put request to testbench with Thing Description you like to test.

- **Then update configurations (optional)**: Update test config property if you like with PUT request.

- **Then initialize (mandatory)**: Call initialization of TestBench where TestBench reads new configurations, consumes the provided Thing Desctiption of Thing under Test and exposes generated `testData` which is send during testing procedure as a property of TestBench. Body set to `"true"` activates logging to console.

- **Then update test data (optional)**: Changes requests fake data. Execute only if desired.

- **Third test TD (mandatory)**: Reads testData property and executes testing procedure on consumed Thing. Exposes test-report as a property afterwards. Body set to `"true"` activates logging to console.

***

- This link provides all possible postman interaction examples [https://documenter.getpostman.com/view/4378601/RWEmHGBq](https://documenter.getpostman.com/view/4378601/RWEmHGBq).

- How to use testbench screencast video can be found here [https://youtu.be/BDMbXZ2O7KI](https://youtu.be/BDMbXZ2O7KI).

- You can use your browser and the GET requests to inpect all properties during the procedure.

***

## Missing features which will be added in soon future:

- observable properties testing
- events testing
- adapting to protocol bindings (TestBench as well as test_servient have hard coded HTTP protocol bingings)


