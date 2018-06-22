## TestBench Documentation:
___

### Prerequisites:
- download [testbench](https://github.com/jplaui/testbench) from github using git clone 
- switch into testbench folder and execute: `sudo npm install --global`

- download [node-wot](https://github.com/thingweb/node-wot)
- follow install instructions in README.md
- make sure to run the optional `sudo npm run link`

### Dependencies & Configurations:

- go into testbench folder
- specify node-wot path in tsconfig:
- set "paths": to `{ "@node-wot/*": ["path-to-node_modules/@node-wot/*"] }`

Example of paths configuration: (see tsconfig.json inside this repo):

`"paths": {
        "@node-wot/*": ["/usr/lib/node_modules/@node-wot/*"]
    } `

### Running the testbench:

- inside testbench folder: compile typescript with: `tsc -p .`
- start testbench with: `node dist/path-to-/v2-test-bench.js`

- use curl or postman to interact with TestBench:

**postman**:

| **PUT** | TestBench config update |
| ------------- |:-------------:|
| content-type      | application/json | 
| body      |  config json data   | 
| data-type | raw |
| url | http://your-address:8090/thing_test_bench/properties/testConfig | 

**curl**:

`curl -X POST -H "Content-Type: application/json" -d '{configuration-data}' http://your-address:8090/thing_test_bench/properties/testConfig`

___

## TestBench example test of a Thing Description:
TestBench is a Thing itself

- inside testbench folder: compile typescript with: `tsc -p .`
- start testbench with: `node dist/path-to-/v2-test-bench.js`

- use curl or postman to interact with TestBench:

1. Start a test servient so TestBench can interact with it: testing-files/test_servient.ts shows an example test servient. test_servient.ts Thing Description `myTuT-complete.jsonld` from testbench repository must be sent using a PUT request to `thingUnderTestTD` property of testbench. Run `test_servient.ts` by executing `tsc -p .` inside `testbench` folder and `node dist/path-to-test_servient.js`. Run TestBench by executing `tsc -p .` inside `testbench` folder and `node dist/path-to-/v2-test-bench.js`

2. start `portman` software: [Postman](https://www.getpostman.com/)

3. start to interact with TestBench:

4. Example postman requests which update test-config property, Thing unser Test Thing Description. Then initiate TestBench, modify json-schema-faker data which is used to test interactions of the consumed Thing Description, and execute the Thing Description testing procedure with scenario and repetition parameters from `test-config.json` file.

- **First**: Send Put request to testbench with Thing Description you like to test.

| **PUT** | TestBench update TuT Property |
| ------------- |:-------------:|
| content-type      | application/json | 
| body      |  Thing Description   | 
| data-type | raw |
| url | ttp://your-address:8080/v2-test-bench/properties/thingUnderTestTD |
| return value: | no return value |

- **Then**: Update test config property if you like with PUT request.

- **Then**: Call initialization of TestBench where TestBench reads new configurations, consumes the provided Thing Desctiption of Thing under Test and exposes generated `testData` which is send during testing procedure as a property of TestBench.

| **POST** | TestBench initiation |
| ------------- |:-------------:|
| content-type      | application/json | 
| body      |  empty   | 
| data-type | raw |
| url | http://your-address:8090/thing_test_bench/actions/initiate |
| return value: | boolean if successful |


- **Then**: Changes requests fake data. Execute only if desired.

| **PUT** | TestBench update schema-faker request data |
| ------------- |:-------------:|
| content-type      | application/json | 
| body      |  [[\{"interactionName":"testObject","interactionValue":\{"brightness":50,"status":"my change"\}\},\{"interactionName":"testObject","interactionValue":\{"brightness":41.447134566914734,"status":"ut aut"\}\}],[\{"interactionName":"testArray","interactionValue":[87987366.27759776,18277015.91254884,-25996637.898988828,-31082548.946999773]\},\{"interactionName":"testArray","interactionValue":[2907339.2741234154,-24383724.353494212]}],[\{"interactionName":"display","interactionValue":"eu ad laborum"\}, ... ], ... ]  | 
| data-type | raw |
| url | http://your-address:8090/thing_test_bench/actions/updateRequests |
| return value: | no return value |

- **Third**: Executes testing procedure on consumed Thing. Exposes test-report as a property afterwards. Body set to `"true"` activates logging to console.

| **POST** | TestBench execute action testThing |
| ------------- |:-------------:|
| content-type      | application/json | 
| body      |  "true"   | 
| data-type | raw |
| url | http://your-address:8090/thing_test_bench/actions/testThing | 
| return value: | boolean if successful |

***

- You can use your browser and the GET requests to inpect all properties during the procedure.

- How to use screencast video is in the making.

### Code developed using ubuntu 18.04 LTS with following system settings:

install git:
`sudo apt install git`

install node:
`sudo apt install curl`
`curl -sL https://deb.nodesource.com/setup_10.x | sudo -E bash -`
`sudo apt-get install nodejs`

`node --version`: v10.4.0

ìnstall npm:
`sudo apt install npm`

`npm -v`: 6.1.0

install typescript:
`npm install -g typescript@2.8.3`

`tsc -v`: Version 2.8.3


#### Personal notes:
remember commands:

1. `tsc --init`
2. `npm init`
