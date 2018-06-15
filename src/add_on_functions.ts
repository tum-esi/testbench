export function convertTDtoNodeWotTD040(td: string): string {
	let tdPlain = JSON.parse(td);
	let returnObj = {};
	let interaction = [];

	for (var fieldNameRoot in tdPlain) {
	    if (tdPlain.hasOwnProperty(fieldNameRoot)) {
	      switch (fieldNameRoot) {
	        case "@context":
	          	returnObj[fieldNameRoot] = tdPlain[fieldNameRoot];
	          	break;
	        case "id":
	          	returnObj[fieldNameRoot] = tdPlain[fieldNameRoot];
	          	break;
	        case "name":
	          	returnObj[fieldNameRoot] = tdPlain[fieldNameRoot];
	          	break;
	        case "label":
	          	returnObj["name"] = tdPlain[fieldNameRoot];
	          	break;
	        case "description":
	          	returnObj[fieldNameRoot] = tdPlain[fieldNameRoot];
	          	break;
	        case "support":
	          
	          	break;
	        case "properties":
	          	// every property key becomes new type property:
	          	for (var prop in tdPlain[fieldNameRoot]) {
	          		let properties = {};

	          		// innerstJSON of single property
	          		for (var propKey in tdPlain[fieldNameRoot][prop]) {
	          			if (tdPlain[fieldNameRoot][prop].hasOwnProperty(propKey)) {
	      					switch (propKey) {
	      						case "observable":
	      							properties[propKey] = tdPlain[fieldNameRoot][prop][propKey];
	      							break;
	      						case "writable":
	      							properties[propKey] = tdPlain[fieldNameRoot][prop][propKey];
	      							break;
	      						case "forms":
	      							properties["form"] = tdPlain[fieldNameRoot][prop][propKey];
	      							break;
	      						case "label":
	      							// taking propery key as name in properties["name"]
	      							break;
	      						case "type":
	      							console.log('* PRINTING SCHEMA OF OBJECT');
	      							console.log('* propKey', propKey);
	      							console.log(tdPlain[fieldNameRoot][prop][propKey]);

	      							switch (tdPlain[fieldNameRoot][prop][propKey]) {
	      								case "string":
	      									properties["schema"] = {"type": "string"};
	      									break;
	      								case "number":
	      									properties["schema"] = {"type": "number"};
	      									break;
	      								case "object":

	      									let propertiesValue = {};
	      									let propNames = [];
	      									// look for properties key
	      									if (tdPlain[fieldNameRoot][prop].hasOwnProperty("properties")) {
	      										for (var propName in tdPlain[fieldNameRoot][prop]["properties"]) {
	      											propNames.push(propName);

	      											let propScheme = {};
	      											for (var propProps in tdPlain[fieldNameRoot][prop]["properties"][propName]) {
	      												propScheme[propProps] = tdPlain[fieldNameRoot][prop]["properties"][propName][propProps];
	      											}
	      											propertiesValue[propName] = propScheme;
	      										}
	      										properties["schema"] = {"type": "object", "properties": propertiesValue, "required": propNames};
	      										console.log(JSON.stringify(properties, null, ' '))
	      									}
	      								case "array":
	      									// look for items key
	      									if (tdPlain[fieldNameRoot][prop].hasOwnProperty("items")) {
	      										properties["schema"] = {"type": "array", "items": tdPlain[fieldNameRoot][prop]["items"]}
	      									}
	      									console.log(JSON.stringify(properties, null, ' '))
	      									break;
	      							}
	      							break;
	      						case "const":
	      							properties[propKey] = tdPlain[fieldNameRoot][prop][propKey];
	      							break;
	      						case "value":
	      							properties[propKey] = tdPlain[fieldNameRoot][prop][propKey];
	      							break;
	      						default:
	      							break;
	      					}
	      				}
	          		}
	          		if (Object.keys(properties).length != 0) {
	          			properties["@type"] = ["Property"];
	          			properties["name"] = prop;
	          			interaction.push(properties);
	          		}
	          	}
	          	break;
	        case "actions":
	        	// every actioen key becomes new type action:
	        	for (var prop in tdPlain[fieldNameRoot]) {
		          	let actions = {};

		          	// innerstJSON of single action
		          	for (var actKey in tdPlain[fieldNameRoot][prop]) {
		          		if (tdPlain[fieldNameRoot][prop].hasOwnProperty(actKey)) {
	      					switch (actKey) {
	      						case "description":
	      							// old version doesnt have this information
	      							break;
	      						case "label":
	      							// old version doesnt have this information
	      							break;
	      						case "forms": // done
	      							actions["form"] = tdPlain[fieldNameRoot][prop][actKey];
	      							break;
	      						case "output":
	      							actions["outputSchema"] = tdPlain[fieldNameRoot][prop][actKey];
	      							break;
	      						case "input":
	      							actions["inputSchema"] = tdPlain[fieldNameRoot][prop][actKey];
	      							break;
	      						default:
	      							break;
	      					}
	      				}
					}
		          	if (Object.keys(actions).length != 0) {
	          			actions["@type"] = ["Action"];
	          			actions["name"] = prop;
	          			interaction.push(actions);
	          		}
          		}
	          	break;
	        case "events":
	        	// every event key becomes new type event:
	        	for (var prop in tdPlain[fieldNameRoot]) {
		        	let events = {};

		        	// innerstJSON of single action
		          	for (var eventKey in tdPlain[fieldNameRoot][prop]) {
		          		if (tdPlain[fieldNameRoot][prop].hasOwnProperty(eventKey)) {
	      					switch (eventKey) {
	      						case "observable":
	      							events[eventKey] = tdPlain[fieldNameRoot][prop][eventKey];
	      							break;
	      						case "properties":
	      							for (var k in tdPlain[fieldNameRoot][prop][eventKey]) {
	      								// k equels properties name

	      								// filter for DataSchema attributes (https://w3c.github.io/wot-thing-description/#dataschema)
	      								for (var inerk in tdPlain[fieldNameRoot][prop][eventKey][k]) {
	      									if (tdPlain[fieldNameRoot][prop][eventKey][k].hasOwnProperty(inerk)) {
	      										switch (inerk) {
	      											case "type":
	      												events["schema"] = tdPlain[fieldNameRoot][prop][eventKey][k][inerk];
	      												break;
	      										}
	      									}
	      								}
	      							}
	      							break;
	      						case "writable":
	      							events[eventKey] = tdPlain[fieldNameRoot][prop][eventKey];
	      							break;
	      						case "forms":
	      							events["form"] = tdPlain[fieldNameRoot][prop][eventKey];
	      							break;
	      						case "label":
	      							// name already taken over by event key name
	      							break;
	      						default:
	      							break;
	      					}
	      				}
	      			}
		          	if (Object.keys(events).length != 0) {
	          			events["@type"] = ["Event"];
	          			events["name"] = prop;
	          			interaction.push(events);
	          		}
	          	}
	          	break;
	        case "securityDefinitions":
	          	returnObj["security"] = tdPlain[fieldNameRoot];
	          	break;
	        case "base":
	        	returnObj[fieldNameRoot] = tdPlain[fieldNameRoot];
	          	break;
	        case "links":
	          	returnObj["link"] = tdPlain[fieldNameRoot];
	          	break;
	        default: // metadata
	          	
	          	break;
	      }
	    }
	}
	// console.log('Printing Interaction::::::', interaction);
	returnObj["interaction"] = interaction;
	return JSON.stringify(returnObj);
};
