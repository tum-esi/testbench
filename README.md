## Prerequisites:
- download node-wot
- follow install instructions in readme
- make sure to run the optional `sudo npm run link`

## Dependencies & Configurations:

switch into testbench folder and execute:
`npm install`

edit test-config.json:

- specify TuT in test-config.json by setting ThingTdLocation to location of TuT and ThingTdName to TuT name

specify node-wot path in tsconfig:

- set "baseUrl": "src"
    "paths": { "@node-wot/*": ["/usr/local/lib/node_modules/@node-wot/*"] } // path to global @node-wot location

## Starting the testbench:

compile with: `tsc -p .` inside testbench folder.
start testbench with: `node dist/path-to-v2testbench.js-file`

