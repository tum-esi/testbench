#!/usr/bin/env node
/********************************************************************************
 * Copyright (c) 2019 - www.esi.ei.tum.de
 * MIT Licence - see LICENSE
 ********************************************************************************/
import { testConfig } from './utilities'
//testConfig for config file structure
const inquirer = require("inquirer");
export const parseArgs = (tDescPaths: Array<string>) => {
    let argv = process.argv.slice(2);
    let configPresentFlag = false;
	argv.forEach( (arg: string) => {
		if (configPresentFlag) {
            configPresentFlag = false;
            configPath = arg;

        } else if (arg.match(/^(-c|--configfile)$/i)) {
            configPresentFlag = true;

        } else if (arg.match(/^(-v|--version)$/i)) {
            console.info(require("../package.json").version);
    
        } else {
            console.info("-c can be used to specify config file");
		}
		
    });
}
		/*
interface defaultQueryResponse {                                                
    choice: string;                                                             
}                                                                               
                                                                                
const defaultQuery = async () => {                                       
    return inquirer.prompt({                                                    
        type: 'list',                                                           
        name: 'choice',                                                         
        message: 'Use default configuration?',                                  
        choices: ['yes', 'no']                                                  
    }).then((response: defaultQueryResponse) => response.choice);               
}

let decideToUseDefaultConfigFile = defaultQuery().then( (response: string) => {                    
	if(response === "yes"){
		configPath = 'default-config.json';
	}
		else{} //confiqurationQuery 
});
		 */
export var configPath: string;
export var tdPaths: Array<string> = [];
//TODO: Prompt user for config
//TODO: Help
//TODO: Log level to dump
