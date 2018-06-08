"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
var Validator = require('jsonschema').Validator;
var v = new Validator();
function validateRequest(requestName, request, schemaLoc) {
    let reqSchema = fs.readFileSync(schemaLoc + "Requests/" + requestName + ".json", "utf8");
    return v.validate(request, JSON.parse(reqSchema)).errors;
}
exports.validateRequest = validateRequest;
function validateResponse(responseName, response, schemaLoc) {
    let resSchema = fs.readFileSync(schemaLoc + "Responses/" + responseName + ".json", "utf8");
    return v.validate(response, JSON.parse(resSchema)).errors;
}
exports.validateResponse = validateResponse;
function validateTD(td) {
    return true;
}
exports.validateTD = validateTD;
