#!/bin/bash

npm run build
npm start testing-files/perfectThing.js &
node testing-files/perfectThing.js &
sleep 5s
curl -s -X GET http://localhost:8980/wot-test-bench/properties/testData
