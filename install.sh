#!/bin/bash

npm install
mkdir node_modules/thingweb.node-wot/
git clone https://github.com/eclipse/thingweb.node-wot.git 
node_modules/thingweb.node-wot/
mkdir -p node_modules/thingweb.node-wot/node_modules
npm install --prefix node_modules/thingweb.node-wot/node_modules
npm run build --prefix node_modules/thingweb.node-wot/
tsc -p .
