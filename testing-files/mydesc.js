//just an example script - to be moved into other repo
const NAME_PROPERTY_TEMP = "temp";
const NAME_ACTION_GET = "get";

let thing = WoT.produce({
    name: "counter"
});

console.log("Created thing " + thing.name);

thing.addProperty({
	name : NAME_PROPERTY_TEMP,
	schema : '{ "type": "number"}',
	value : 15,
	observable : true,
	writeable : true
})

thing.addAction({
    name : NAME_ACTION_GET
})

thing.setActionHandler(
	NAME_ACTION_GET,
	(parameters) => {
		console.log("get tempera");
		return thing.readProperty(NAME_PROPERTY_TEMP).then(function(temp){
		});
	}
);

thing.start();
