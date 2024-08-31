import {test, solo, skip} from "brittle"
import {rpcFromWebWorkerWithTransfer} from "./index.js";
import b4a from "b4a";
import duplexThrough from "duplex-through";
import { isDuplex } from "./lib/utils/isDuplex.js";
import { isReadable } from "./lib/utils/isReadable.js";
import {Duplex, Readable} from "streamx";

function arraysEqual(a, b) {
    if (a === b) return true;
    if (a == null || b == null) return false;
    if (a.length !== b.length) return false;

    for (let i = 0; i < a.length; ++i) {
        if (a[i] !== b[i]) return false;
    }
    return true;
}

export function doTest() {
    test("Basic add test", async t => {
        await useWorker(async ({rpc}) => {
            t.is(await rpc.request.add(1, 2), 3);
        });
    });

    test("Echo string test", async t => {
        await useWorker(async ({rpc}) => {
            t.ok(arraysEqual(await rpc.request.echo("hello", "world"), ["hello", "world"]));
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

    skip("is streamx writable test", async t => {
       // not implemented due to streamx-webstreams not yet supporting this.
        // TODO: a writable would be beneficial, maybe
        //       consider adding a writable to streamx-webstreams
    });

    test("StreamX duplex communication across web worker test.", async t => {
        t.plan(2);
        const [theirs, ours] = duplexThrough();

        await useWorker(async ({rpc}) => {
            // Listen for the first "data" event on the 'ours' stream
            ours.once("data", chunk => {
                // Check if the chunk received is "xyz" (converted to string for comparison)
                t.is(b4a.toString(chunk), "xyz");
            });

            // Write "abc" to the 'ours' stream
            ours.write("abc");

            // Send a "xyz" string to the 'streamEcho' method on the 'theirs' stream
            const result = await rpc.request.streamEcho(theirs, "xyz");

            // Check if the result received back from 'streamEcho' is "abc" (converted to string for comparison)
            t.is(b4a.toString(result), "abc");
        });
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
                const result = await rpc.request.customErrorTest("Intentional error for testing");
                t.fail("Expected error to be thrown");
            } catch (e) {
                t.ok(e.message.includes("Intentional error for testing"));
            }
        });
    });

    // solo("Error inside stream", async t => {
    //     await useWorker(async ({rpc}) => {
    //         try {
    //             const stream = await rpc.request.errorInStreamTest();
    //             const error = await new Promise(resolve => stream.once("error", resolve));
    //             debugger;
    //             t.fail("Expected error to be thrown");
    //         } catch (e) {
    //             t.ok(e.message.includes("Intentional error for testing"));
    //         }
    //     });
    // });
}


async function useWorker(code, cb) {
    if (typeof code === "function") {
        cb = code;
        code = "";
    }
    code = `
        import { attachRpc, Pool, rpcFromWebWorker } from "https://cdn.jsdelivr.net/gh/zacharygriffee/rpc-async-webworker-with-transfer@master/dist/index.min.js";
        import duplexThrough from "https://esm.run/duplex-through";
        const rpc = attachRpc(self);
        
        rpc.expose({
            add(a, b) {
                return a + b;
            },
            echo(...args) {
                return [...args];
            },
            async streamEcho(stream, sendThis) {
                stream.write(sendThis);
                return new Promise(resolve => {
                    stream.once("data", chunk => {
                        resolve(chunk);
                    });
                });
                return true;
            },
            async isItDuplex(stream) {
                return isDuplex(stream);
            },
            async isItReadable(stream) {
                return isReadable(stream);
            },
            async errorTest(message) {
                throw new Error(message);
            },
            async customErrorTest(message) {
                throw new CustomError(message);
            },
            async errorInStreamTest() {
                const [local, remote] = duplexThrough();
                local.on("data", data => {
                    console.log(data);
                });
                setTimeout(() => {
                   local.emit("error", new Error("stream error"));
                });
                return remote;
            }
        });
        
        class CustomError extends Error {
            constructor(message) {
                super(message);
                this.wow = message;
            }
        }
        
        ${code}
        ${isDuplex}
        ${isReadable}
    `;
    const blob = new Blob([code], {type: "text/javascript"});
    const worker = new Worker(URL.createObjectURL(blob), {type: "module"});
    await cb({
        worker,
        rpc: rpcFromWebWorkerWithTransfer(worker)
    });
    console.log("Worker test done. Terminating worker...");
    worker.terminate();
}

