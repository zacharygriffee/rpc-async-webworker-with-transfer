import {test, solo, skip} from "brittle"
import b4a from "b4a";
import {duplexThrough} from "duplex-through-with-error-handling";
import {Duplex, Readable, Writable} from "streamx";
import {useWorker} from "./fixtures/useWorker.js";

test("Mock worker test", async t => {
    await import("./fixtures/mock-worker-test.js");
    t.pass();
});

test("Basic add test", async t => {
    await useWorker(async ({rpc}) => {
        t.is(await rpc.request.add(1, 2), 3);
    });
});

test("Echo string test", async t => {
    await useWorker(async ({rpc}) => {
        t.alike(await rpc.request.echo("hello", "world"), ["hello", "world"]);
    });
});

test("is streamx duplex test", async t => {
    const duplex = new Duplex();

    await useWorker(async ({rpc}) => {
        t.ok(await rpc.request.isItDuplex(duplex));
    });

    duplex.destroy();
});

test("is streamx readable test", async t => {
    const readable = new Readable();
    await useWorker(async ({rpc}) => {
        t.ok(await rpc.request.isItReadable(readable));
    });

    readable.destroy();
});


test("is streamx writable test", async t => {
    const writable = new Writable();

    await useWorker(async ({rpc}) => {
        t.ok(await rpc.request.isItWritable(writable));
    });

    writable.end();
});

test("streamx writable test", async t => {
    t.plan(1)
    const writable = new Writable({
        write(chunk, cb) {
            t.is(b4a.toString(chunk), "hello you");
            cb();
        }
    });
    await useWorker(async ({rpc}) => {
        await rpc.request.streamEchoWrite(writable, "hello you");
    });
});

test("StreamX duplex communication across web worker test.", async _t => {
    const t = _t.test();
    t.plan(3); // Basic assertions during test run

    const [theirs, ours] = duplexThrough();

    const setupStreamLogging = (stream, name) => {
        stream.on('error', err => {
            console.error(`${name} stream encountered an error: ${err.message}`);
            t.pass(`${name} stream handled error: ${err.message}`);
        });

        stream.on('close', () => console.log(`${name} stream closed`));
        stream.on('end', () => console.log(`${name} stream ended`));
        stream.on('finish', () => console.log(`${name} stream finished`));

        stream.cleanupListeners = () => {
            stream.removeAllListeners('error');
            stream.removeAllListeners('close');
            stream.removeAllListeners('end');
            stream.removeAllListeners('finish');
        };
    };

    setupStreamLogging(ours, 'Ours');
    setupStreamLogging(theirs, 'Theirs');

    console.log('Initialized streams');

    // Track ongoing async operations
    const allOperations = [];

    await useWorker(async ({rpc}) => {
        console.log('Worker started');

        const dataListener = (chunk) => {
            console.log('Data received on ours stream:', chunk ? chunk.toString() : 'null');
            t.is(chunk ? chunk.toString() : null, 'xyz', 'Received data should match expected value');
            ours.removeListener("data", dataListener);
        };

        ours.on("data", dataListener);

        console.log('Writing "abc" to ours stream');
        ours.write("abc");

        // Ensure the intentional error is resolved within this async block
        const streamEchoPromise = rpc.request.streamEcho(theirs, "xyz")
            .then((result) => {
                console.log('Result received from theirs stream:', result ? result.toString() : null);
                t.is(result ? result.toString() : null, 'abc', 'Received result should match expected value');
            })
            .catch((e) => {
                console.error('Error in streamEchoPromise:', e);
                return Promise.reject(e); // Re-throw to ensure the error propagates
            });

        // Log start and completion of streamEchoPromise
        console.log('Triggering streamEchoPromise');
        allOperations.push(streamEchoPromise.then(() => console.log('streamEchoPromise completed')));

        // Trigger the error after securing the duplex communication
        const errorPromise = new Promise((resolve) => {
            setTimeout(() => {
                console.log('Intentional error in theirs stream');
                theirs.emit('error', new Error('Intentional error in theirs stream'));
                resolve();
            }, 50);
        });

        // Log start and completion of errorPromise
        console.log('Triggering errorPromise');
        allOperations.push(errorPromise.then(() => console.log('errorPromise completed')));

        await Promise.all(allOperations);

        // Close the streams after all operations are complete
        ours.end();
        theirs.end();
    });

    // Cleanup after all operations
    ours.cleanupListeners();
    theirs.cleanupListeners();

    if (theirs.destroy) {
        theirs.destroy();
    }
    if (ours.destroy) {
        ours.destroy();
    }

    console.log('Test concluded');
});


test("Error handling test", async t => {
    await useWorker(async ({rpc}) => {
        try {
            const result = await rpc.request.errorTest("Intentional error for testing");
            t.fail("Expected error to be thrown");
        } catch (e) {
            t.ok(e.message.includes("Intentional error for testing"));
        }
    });
});

test("Custom Error handling test", async t => {
    await useWorker(async ({rpc}) => {
        try {
            await rpc.request.customErrorTest("Intentional error for testing");
            t.fail("Expected error to be thrown");
        } catch (e) {
            t.ok(e.message.includes("Intentional error for testing"));
        }
    });
});

test("Error inside stream", async t => {
    t.plan(1)
    await useWorker(async ({rpc}) => {
        const stream = await rpc.request.errorInStreamTest();
        stream.once("error", e => {
            t.is(e.message, "stream error");
        });
    });
});

import("./transferrability.js");

