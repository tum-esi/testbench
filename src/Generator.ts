// Creates a JSON file with randomly generted inputs.
import * as wot from "wot-typescript-definitions"
var fs = require("fs");
var jsf = require("json-schema-faker")
/*
var requests = {
    "Property": {},
    "Action": {},
    "EventSubscription": {},
    "EventCancellation": {}
};
*/
//--------------Helper Functions------------------------- 
function countProperties(object) {
    var count = 0;

    for (var prop in object) {
        if (object.hasOwnProperty(prop))
            ++count;
    }

    return count;
}

function arrayToObject(array) {
    var arrayLength = array.length;
    let myObject = {};
    for (var i = 0; i < arrayLength; i++) {
        let key : string[] = Object.keys(array[i])
        let value = Object.values(array[i])
        myObject[key[0]] = value[0]
    }
    return myObject
}

// Try to assess type if type is not given in InteractionAffordance
function assessType(scheme){
    let type = undefined;

    if(scheme.hasOwnProperty("properties")){
        type = "object"
    }
    if(scheme.hasOwnProperty("items")){
        type = "array"
    }

    return type
}

//--------------------Integer------------------------------

function checkIntSpecialCases(input_schema) {
    
    let helper_array = []
    if (input_schema.minimum != undefined) {
        if((input_schema.exclusiveMinimum == false)||(input_schema.exclusiveMinimum == undefined)){
            helper_array.push(input_schema.minimum);
        }
        if(input_schema.exclusiveMinimum == true){
            helper_array.push(input_schema.minimum+1);
        }
        
    }
    if (input_schema.maximum != undefined) {
        if((input_schema.exclusiveMaximum == false)||(input_schema.exclusiveMaximum == undefined)){
            helper_array.push(input_schema.maximum);
        }
        if(input_schema.exclusiveMaximum == true){
            helper_array.push(input_schema.maximum-1);
        }
        
    }
    if((input_schema.exclusiveMinimum == undefined)&&(input_schema.exclusiveMaximum == undefined)){
        if (((input_schema.minimum < 0) || (input_schema.minimum == undefined)) && ((input_schema.maximum > 0) || (input_schema.maximum == undefined))) {
            helper_array.push(0);
        }
    }
    else{
        let min = 0
        let max = 0
        if(input_schema.exclusiveMaximum == true){
            max = -1;
        }
        if(input_schema.exclusiveMinimum == true){
            min = 1;
        }
        if (((input_schema.minimum+min < 0) || (input_schema.minimum == undefined)) && ((input_schema.maximum+max > 0) || (input_schema.maximum == undefined))) {
            helper_array.push(0);
        }

    }
    
    
    return helper_array 
}

//--------------------Number------------------------------

function checkNumbSpecialCases(input_schema) {
    
    let helper_array = []
    if (input_schema.minimum != undefined) {
        if((input_schema.exclusiveMinimum == false)||(input_schema.exclusiveMinimum == undefined)){
            if(input_schema.multipleOf == undefined){
                helper_array.push(input_schema.minimum);
            }
            else{
                let modulo = input_schema.minimum % input_schema.multipleOf
                if(modulo == 0){
                    helper_array.push(input_schema.minimum);
                }
                else{
                    let minimum = undefined
                    let div = input_schema.minimum / input_schema.multipleOf
                    
                    minimum = Math.ceil(div)*input_schema.multipleOf
                    helper_array.push(minimum)
                }
            }
        }
        if(input_schema.exclusiveMinimum == true){
            if(input_schema.multipleOf != undefined){
                helper_array.push(input_schema.minimum+input_schema.multipleOf);
            }
            else{
                //check Nachkommastellen und addiere dann +1 unit für valid minimum
            }
        }
        
    }
    if (input_schema.maximum != undefined) {
        if((input_schema.exclusiveMaximum == false)||(input_schema.exclusiveMaximum == undefined)){
            if(input_schema.multipleOf == undefined){
                helper_array.push(input_schema.maximum);
            }
            else{
                let modulo = input_schema.maximum % input_schema.multipleOf
                if(modulo == 0){
                    helper_array.push(input_schema.maximum);
                }
                else{
                    let maximum = undefined
                    let div = input_schema.maximum / input_schema.multipleOf
                    
                    maximum = Math.floor(div)*input_schema.multipleOf
                    helper_array.push(maximum)
                }
            }
        }
        if((input_schema.exclusiveMaximum == true)&&(input_schema.multipleOf != undefined)){
            helper_array.push(input_schema.maximum+input_schema.multipleOf);
        }
        
    }
    if((input_schema.exclusiveMinimum == undefined)&&(input_schema.exclusiveMaximum == undefined)){
        if (((input_schema.minimum < 0) || (input_schema.minimum == undefined)) && ((input_schema.maximum > 0) || (input_schema.maximum == undefined))) {
            helper_array.push(0);
        }
    }
    else{
        let min = 0
        let max = 0
        if(input_schema.exclusiveMaximum == true){
            max = -1;
        }
        if(input_schema.exclusiveMinimum == true){
            min = 1;
        }
        if (((input_schema.minimum+min < 0) || (input_schema.minimum == undefined)) && ((input_schema.maximum+max > 0) || (input_schema.maximum == undefined))) {
            helper_array.push(0);
        }

    }
    
    
    return helper_array 
}

//--------------------String------------------------------

//String values of special interest
function stringSpecialCases(input_schema) {
    var specProp = undefined
    if (input_schema.minLength == undefined) {
        specProp = JSON.parse(JSON.stringify(input_schema));
        specProp.minLength = 0;
        specProp.maxLength = 0;
    }
    return specProp
}

//Adds minimum/maximum length string to data
function checkStrEdgeCases(input_schema) {
    
    let help_array = [undefined,undefined];
    if (input_schema.minLength != undefined) {
        //create a string with min length
        var minProp = JSON.parse(JSON.stringify(input_schema));
        minProp.maxLength = input_schema.minLength
        //create one string with min length
        help_array[0] = jsf.generate(minProp);
    }
    if (input_schema.maxLength != undefined) {
        //create a string with min length
        var maxProp = JSON.parse(JSON.stringify(input_schema));
        maxProp.minLength = input_schema.maxLength
        //create one string with min length
        help_array[1] = jsf.generate(maxProp);
    }
    return help_array
}

//--------------------Object------------------------------

//Adds empty object if no requirment specified in TD
function checkEmptyObject(input_schema) {
    let empty = false;
    if (input_schema.required == undefined) {
        empty = true
    }
    return empty
}

//Check if number of required properties equals defined properties in the object
function checkObjectProp(input_schema) {
    var obj_helper = JSON.parse(JSON.stringify(input_schema));
    
    if ((input_schema.properties != undefined) && (input_schema.required != undefined)) {
        if (countProperties(input_schema.properties) > countProperties(input_schema.required)) {
            //construct objects with only required properties
            for (let prop in input_schema.properties) {
                if (!(input_schema.required.includes(prop))) {
                    delete obj_helper.properties[prop]
                }
            }
        }
    }
    return obj_helper
}

//Checks for properties with minima in nested Objects
function nestedMinObjects(key, value) {

    let emptyO = {};
    let minimum = jsf.generate(value);
    var obj_helper = JSON.parse(JSON.stringify(value));

    if (value.type == "object") {
        let help_array1 = []
        for (const [key2, value2] of Object.entries(value.properties)) {

            help_array1.push(nestedMinObjects(key2, value2))
        }
        emptyO[key] = arrayToObject(help_array1)
    }
    else {
        if (value.type == "integer") {
            if (value.minimum != undefined) {
                minimum = value.minimum;
                emptyO[key] = minimum;
            }
        }
        if (value.type == "number") {
            if (value.minimum != undefined) {
                minimum = value.minimum;
                emptyO[key] = minimum;
            }
        }
        if (value.type == "string") {
            if (value.minLength != undefined) {
                obj_helper.maxLength = value.minLength;
                minimum = jsf.generate(obj_helper)
                emptyO[key] = minimum;
            }
        }
        if (value.type == "array") {
            minimum = checkNestedMinArray(value, undefined)
            emptyO[key] = minimum[0];
        }

    }
    return emptyO

}

function nestedMaxObjects(key, value) {
    let emptyO = {};
    let maximum = jsf.generate(value);
    var obj_helper = JSON.parse(JSON.stringify(value));

    if (value.type == "object") {
        let help_array2 = []
        for (const [key2, value2] of Object.entries(value.properties)) {

            help_array2.push(nestedMaxObjects(key2, value2))
        }
        emptyO[key] = arrayToObject(help_array2)
    }
    else {
        if (value.type == "integer") {
            if (value.maximum != undefined) {
                maximum = value.maximum;
                emptyO[key] = maximum;
            }
        }
        if (value.type == "number") {
            if (value.maximum != undefined) {
                maximum = value.maximum;
                emptyO[key] = maximum;
            }
        }
        if (value.type == "string") {
            if (value.maxLength != undefined) {
                obj_helper.minLength = value.maxLength;
                maximum = jsf.generate(obj_helper)
                emptyO[key] = maximum;
            }
        }
        if (value.type == "array") {
            maximum = checkNestedMaxArray(value, undefined)
            emptyO[key] = maximum[0];
        }

    }
    return emptyO

}

//--------------------Array--------------------------------

function checkNestedMinArray(tdProp, currentProp) {
    let help_array3 = []
    if (currentProp != undefined) {
        tdProp = tdProp[currentProp]
    }

    let minimum = jsf.generate(tdProp);
    var obj_helper = JSON.parse(JSON.stringify(tdProp));

    //check if all items are the same type
    if (typeof (tdProp.items) == "object") {

        if (tdProp.items.type == "array") {

            help_array3.push(checkNestedMinArray(tdProp, "items"));
        }
        else {
            if (tdProp.items.type == "integer") {
                if (tdProp.items.minimum != undefined) {
                    for(var i = 0; i < minimum.length; i++){
                        minimum[i] = tdProp.items.minimum;
                    }
                }
                help_array3.push(minimum)
            }
            if (tdProp.items.type == "string") {
                if (tdProp.items.minLength != undefined) {
                    obj_helper.items.maxLength = tdProp.items.minLength;
                    minimum[0] = jsf.generate(obj_helper.items)
                }
                help_array3.push(minimum)
            }
            if (tdProp.items.type == "object") {
                let count = 0
                let temp_array0 = []
                let temp_array1 : any = []
                for (const [key, value] of Object.entries(tdProp.items.properties)) {

                    temp_array0[count] = (nestedMinObjects(key, value));
                    count = count + 1;
                }
                temp_array0.forEach(element => {
                    temp_array1.push(element)
                })

                let temp_array3 = arrayToObject(temp_array1)

                minimum[0] = temp_array3
                help_array3.push(minimum)
            }
            
        }
    }
    else {
        //Check if items are Array instead of else ! Ifelse !
    }
    return help_array3
}

function checkNestedMaxArray(tdProp, currentProp) {
    let help_array4 = []
    if (currentProp != undefined) {
        tdProp = tdProp[currentProp]
    }

    let maximum = jsf.generate(tdProp);
    var obj_helper = JSON.parse(JSON.stringify(tdProp));

    //check if all items are the same type
    if (typeof (tdProp.items) == "object") {

        if (tdProp.items.type == "array") {

            help_array4.push(checkNestedMaxArray(tdProp, "items"));
        }
        else {
            if (tdProp.items.type == "integer") {
                if (tdProp.items.maximum != undefined) {
                    for(var i = 0; i < maximum.length; i++){
                        maximum[i] = tdProp.items.maximum;
                    }
                    
                }
                help_array4.push(maximum)
            }
            if (tdProp.items.type == "string") {
                if (tdProp.items.maxLength != undefined) {
                    obj_helper.items.minLength = tdProp.items.maxLength;
                    maximum[0] = jsf.generate(obj_helper.items)
                }
                help_array4.push(maximum)
            }
            if (tdProp.items.type == "object") {
                let count = 0
                let temp_array0 = []
                let temp_array1 : any = []
                for (const [key, value] of Object.entries(tdProp.items.properties)) {

                    temp_array0[count] = (nestedMaxObjects(key, value));
                    count = count + 1;
                }
                temp_array0.forEach(element => {
                    temp_array1.push(element)
                })

                temp_array1 = arrayToObject(temp_array1)

                maximum[0] = temp_array1
                help_array4.push(maximum)
            }
            
        }
    }
    else {
        //Check if items are Array instead of else ! Ifelse !
    }
    return help_array4
}


//--------------------Generator----------------------------
export function fuzzGenerator(td,tdProp, currentProp) {
    
    let helper_array = []

    if(td.actions == tdProp){
        var schema = tdProp[currentProp].input
        var interaction = "Action"
    }
    if(td.properties == tdProp){
        var schema = tdProp[currentProp]
        var interaction = "Property"
    }

    if(schema.type == undefined){
        // Try to find the type by looking at the tdProp (contentType,items,properties etc)
        let type: any = assessType(schema)
        schema.type = type
    }

    if (schema.type == 'integer') {
        
        let edge_cases = checkIntSpecialCases(schema)
        edge_cases.forEach(element => {
            helper_array.push(element);
        })
        

        for (let i = 0; i < 10; i++) {
            helper_array.push(jsf.generate(schema));
        }
        
    }
    
    if (schema.type == 'number') {
        
        let edge_cases = checkNumbSpecialCases(schema)
        edge_cases.forEach(element => {
            helper_array.push(element);
        })
        

        for (let i = 0; i < 2; i++) {
            helper_array.push(jsf.generate(schema));
        }
        
    }
    
    if (schema.type == 'string') {
        //check length
        let array_minmax = checkStrEdgeCases(schema)
        //create valid random data
        if(array_minmax[0] != undefined){
            helper_array.push(array_minmax[0]);
        }
        if(array_minmax[1] != undefined){
            helper_array.push(array_minmax[1]);
        }
        for (let i = 0; i < 15; i++) {
            helper_array.push(jsf.generate(schema));
        }
        //check special cases
        let specProp = stringSpecialCases(schema)
        if (specProp != undefined){
            helper_array.push(jsf.generate(specProp));
        }
    } 
    if (schema.type == 'object') {
        //build fct that produces empty object if no requirment
        let empty = checkEmptyObject(interaction);
        if(empty){
            helper_array.push({});
        }
        //fct which checks if # properties == # requrired and builds object with only required
        let ObjProp = checkObjectProp(schema);
        helper_array.push(jsf.generate(ObjProp));

        //Check for minimum in nested Objects
        let help_array_min = []
        for (const [key, value] of Object.entries(schema.properties)) {
            help_array_min.push(nestedMinObjects(key, value));
        }
        if(Object.keys(help_array_min[0]).length !== 0){
            helper_array.push(arrayToObject(help_array_min))
        }

        //Check for maximum in nested Objects
        let help_array_max = []
        for (const [key, value] of Object.entries(schema.properties)) {
            help_array_max.push(nestedMaxObjects(key, value));
        }
        
        if(Object.keys(help_array_max[0]).length !== 0){
            helper_array.push(arrayToObject(help_array_max))
        }
        

        //Generate a 10 random objects
        for (let i = 0; i < 10; i++) {
            helper_array.push(jsf.generate(schema));
        }
    }
    
    if (schema.type == 'array') {
        let dummy_array0 = []
        let dummy_array1 = checkNestedMinArray(schema, undefined)
        if(schema.minItems != undefined){
            let number = schema.minItems
            for(var i=0;i< number;i++){
                dummy_array0.push(dummy_array1[0][0])
            }
            helper_array.push(dummy_array0)
        }
        else{
            helper_array.push(dummy_array1[0])
        }
        
        let dummy_array2 = []
        let dummy_array3 = checkNestedMaxArray(schema, undefined)
        if(schema.minItems != undefined){
            let number = schema.minItems
            for(var i=0;i< number;i++){
                dummy_array2.push(dummy_array3[0][0])
            }
            helper_array.push(dummy_array2)
        }
        else{
            helper_array.push(dummy_array3[0])
        }
        

        for (let i = 0; i < 5; i++) {
            helper_array.push(jsf.generate(schema));
        }

    }
    
    if (schema.type == 'boolean') {
        
        helper_array.push(true);
        helper_array.push(false);
    }


    return helper_array
}
