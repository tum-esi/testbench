try {
    var thing = WoT.produce({
        name: "tempSensor"
    });
    // manually add Interactions
    thing.addAction({
        name: "myLongAction",
        // no input, no output
    });
    // add server functionality
    thing.setActionHandler("myLongAction", () => {
        console.log("Taking some time to walk");
        var promise1 = new Promise(function(resolve, reject) {
            setTimeout(resolve, 1000, 'foo');
        });
        return promise1;
    });

    thing.addAction({
        name: "myLongerAction",
        // no input, no output
    });
    // add server functionality
    thing.setActionHandler("myLongerAction", () => {
        console.log("Taking some more time to walk");
        var promise1 = new Promise(function(resolve, reject) {
            setTimeout(resolve, 5000, 'foo1');
        });
        return promise1;
    });

    thing.addAction({
        name: "myLongestAction",
        // no input, no output
    });
    // add server functionality
    thing.setActionHandler("myLongestAction", () => {
        console.log("Taking a lot of time to walk");
        var promise1 = new Promise(function(resolve, reject) {
            setTimeout(resolve, 20000, 'foo2');
        });
        return promise1;
    });
        thing.addAction({
        name: "notReplyAction",
        // no input, no output
    });

    thing.setActionHandler("notReplyAction", () => {
        console.log("Falling and not actually walking");
        var promise1 = new Promise(function(resolve, reject) {
            setTimeout(resolve, 1000000, 'foo2');
        });
        return promise1;
    });

    thing.start();

} catch (err) {
    console.log("Script error: " + err);
}