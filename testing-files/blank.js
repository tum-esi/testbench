try {
  var thing = WoT.produce({ title: "tempSensor",
description: "thing that implements event mechanism",
"@context": ["https://www.w3.org/2019/wot/td/v1",
                {"cov": "http://www.example.org/coap-binding#"}] });
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
  }).addAction("reset", {
      name: "reset",
      // no input, no output
    },() => {
      console.log("Resetting maximum");
      thing.writeProperty("max", 0.0);
  }).addEvent("onchange", {
    name: "onchange",
    schema: '{ "type": "number" }'
  });

  thing.expose().then(() => {
    console.info(thing.title + " ready");
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
