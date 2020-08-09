try {
    var thing = WoT.produce({
        title: 'slowThing',
        description: 'test servient that implements actions that take long time',
        '@context': ['https://www.w3.org/2019/wot/td/v1', { cov: 'http://www.example.org/coap-binding#' }],
    })
    // manually add Interactions
    thing.addAction(
        'myLongAction',
        {
            name: 'myLongAction',
            // no input, no output
        },
        () => {
            console.log('Taking some time to walk')
            var promise1 = new Promise(function (resolve, reject) {
                setTimeout(resolve, 1000, 'foo')
            })
            return promise1
        }
    )

    thing.addAction(
        'myLongerAction',
        {
            name: 'myLongerAction',
            // no input, no output
        },
        () => {
            console.log('Taking some more time to walk')
            var promise1 = new Promise(function (resolve, reject) {
                setTimeout(resolve, 5000, 'foo1')
            })
            return promise1
        }
    )

    thing.addAction(
        'myLongestAction',
        {
            name: 'myLongestAction',
            // no input, no output
        },
        () => {
            console.log('Taking a lot of time to walk')
            var promise1 = new Promise(function (resolve, reject) {
                setTimeout(resolve, 20000, 'foo2')
            })
            return promise1
        }
    )

    thing.addAction(
        'notReplyAction',
        {
            name: 'notReplyAction',
            // no input, no output
        },
        () => {
            console.log('Falling and not actually walking')
            var promise1 = new Promise(function (resolve, reject) {
                setTimeout(resolve, 1000000, 'foo2')
            })
            return promise1
        }
    )

    thing.expose().then(() => {
        console.info(thing.title + ' ready')
    })
} catch (err) {
    console.log('Script error: ' + err)
}
