
// TODOOOO !!!!:
// 
// 	change my TuT TD to newest standard: 
// 		->	Property DOES NOT FOLLOW SPECIFICATION


// first function translates 
// new thing desc specification to node wot implementation:

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
	      							properties["schema"] = {"type": tdPlain[fieldNameRoot][prop][propKey]};
	      							break;
	      						// case "properties":
	      						// 	for (var k in tdPlain[fieldNameRoot][prop][propKey]) {

	      						// 		for (var insideK in tdPlain[fieldNameRoot][prop][propKey][k]) {
	      						// 			if (tdPlain[fieldNameRoot][prop][propKey][k].hasOwnProperty(insideK)) {
	      						// 				switch (insideK) {
	      						// 					case "const":
	      						// 						properties["value"] = tdPlain[fieldNameRoot][prop][propKey][k][insideK];
	      						// 						break;
	      						// 				}
	      						// 			}
	      						// 		}
	      						// 	}
	      						// 	break;
	      						case "const":
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

	// console.log(JSON.stringify(returnObj));
	// console.log('""""""""""""""""""""""""""""""""""""""""""""""""""""')

	return JSON.stringify(returnObj);
};
