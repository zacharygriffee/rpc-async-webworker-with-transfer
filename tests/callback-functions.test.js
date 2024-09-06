import {solo, test} from "brittle";
import {useWorker} from "./fixtures/useWorker.js"; // #file:MockWorker.js

test("Function transfer and execution", async t => {
    t.plan(3);

    const mockFunction = async (a, b) => {
        t.is(a, 1, "Argument 'a' should be 1");
        t.is(b, 2, "Argument 'b' should be 2");
        return a + b;
    };

    await useWorker(async ({rpc}) => {
        const result = await rpc.request.callbackFunction(mockFunction);
        t.is(result, 3, "Result should be the sum of 1 and 2");
    });
});

test("Callback function with notify", async t => {
    await useWorker(async ({rpc}) => {
        rpc.notify.cb((result) => {
            t.is(result, "hello world");
        });
    }, {
        cb(notifyThis) {
            // Function has built in 'notify' for executing function without expecting a return.
            notifyThis.notify("hello world");
        }
    });
});

test("Multiple callback functions", async t => {
    t.plan(3);

    function firstCallback(arg1, arg2) {
        t.is(arg1 + arg2, "hello world");
    }

    function secondCallback(...args) {
        t.alike(args, ["foo", "bar", "war"]);
        return "meatballs";
    }

    await useWorker(async ({rpc}) => {
        await rpc.request.twoCallbacks(firstCallback, secondCallback);
    }, {
        async twoCallbacks(cb1, cb2) {
            cb1("hello ", "world");
            t.is(
                await cb2("foo", "bar", "war"),
                "meatballs"
            );
            return true;
        }
    });
});

test("Return a callback function", async t => {
    t.plan(3);

    await useWorker(async ({rpc}) => {
        const f = await rpc.request.funcFunc();
        f("just do it");
        t.is("meatballs", await f("do it correctly"));
    }, {
        async funcFunc() {
            return (itworks) => {
                t.ok([
                    "just do it",
                    "do it correctly"
                ].includes(itworks));
                return "meatballs";
            }
        }
    });
});

test("Nested functions transfer and execution within objects", async t => {
    t.plan(3);

    const nestedObject = {
        outerFunction: (a) => {
            return (b) => {
                t.is(a, 1, "Argument 'a' should be 1");
                t.is(b, 2, "Argument 'b' should be 2");
                return 1 + 2;
            };
        }
    };

    await useWorker(async ({rpc}) => {
        const result = await rpc.request.nestedCallbackFunction(nestedObject);
        const result2 = await result(2);
        t.is(result2, 3, "Result should be the sum of 1 and 2");
    }, {
        async nestedCallbackFunction(objectOfFunction) {
            return objectOfFunction.outerFunction(1);
        }
    });
});

test("Nested functions transfer and execution within arrays", async t => {
    t.plan(3);

    const nestedArray = [
        (a) => {
            return (b) => {
                t.is(a, 1, "Argument 'a' should be 1");
                t.is(b, 2, "Argument 'b' should be 2");
                return a + b;
            };
        }
    ];

    await useWorker(async ({rpc}) => {
        const result = await rpc.request.callbackFunction(nestedArray[0](1));
        t.is(result, 3, "Result should be the sum of 1 and 2");
    },
        {
            callbackFunction(cb) {
                return cb(2);
            }
        });
});