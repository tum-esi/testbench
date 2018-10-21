try {
  var thing = WoT.produce({ name: "tempSensor",
description: "thing that implements event mechanism" });
  // manually add Interactions
  thing.addProperty({
    name: "temperature",
    value: 0.0,
    schema: '{ "type": "number" }'
    // use default values for the rest
  }).addProperty({
    name: "max",
    value: 0.0,
    schema: '{ "type": "number" }'
    // use default values for the rest
  }).addAction({
      name: "reset",
      // no input, no output
    },() => {
      console.log("Resetting maximum");
      thing.writeProperty("max", 0.0);
  }).addEvent({
    name: "onchange",
    schema: '{ "type": "number" }'
  });

  thing.expose().then(() => {
    console.info(thing.name + " ready");
  });
  
  setInterval( async () => {
    let mock = Math.random()*100;
    thing.writeProperty("temperature", mock);
    let old = await thing.readProperty("max");
    if (old < mock) {
      thing.writeProperty("max", mock);
      thing.emitEvent("onchange");
    }
  }, 1000);
  
} catch (err) {
   console.log("Script error: " + err);
}
