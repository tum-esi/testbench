## system Setup Ubuntu 18.04 LTS:

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

## Download testbench from github using git clone

switch into testbench folder and execute:
`sudo npm install --global`

## Prerequisites:
- download node-wot
- follow install instructions in README.md
- make sure to run the optional `sudo npm run link`

## Dependencies & Configurations:

- specify node-wot path in tsconfig:
- set "paths": to `{ "@node-wot/*": ["path-to-node_modules/@node-wot/*"] }`

example of paths:
`"paths": {
        "@node-wot/*": ["/usr/lib/node_modules/@node-wot/*"]
    } `

## Running the testbench:

compile with: `tsc -p .` inside testbench folder.

start test-servient to become TuT:

`node dist/path-to-test_servient.js`

start testbench with: 

`node dist/path-to-v2-test-bench.js`

start postman and perform request with properties:

- POST
- content-type: application/json
- body: true 
- url: http://your-address:8090/thing_test_bench/actions/testThing 


## personal notes:
remember commands:

1. `tsc --init`
2. `npm init`
