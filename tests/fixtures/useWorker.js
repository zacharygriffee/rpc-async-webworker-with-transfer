import { duplexThrough } from "duplex-through-with-error-handling";
import { rpcFromWebWorkerWithTransfer } from "../../lib/rpcFromWebWorkerWithTransfer.js";
import { MockWorker } from "./MockWorker.js";
import { isDuplex } from "../../lib/utils/isDuplex.js";
import { isReadable } from "../../lib/utils/isReadable.js";
import b4a from "b4a";
import {isWritable} from "../../lib/utils/isWritable.js";

async function useWorker(cb, funcs) {
    funcs ||= {
        add(a, b, x) {
            return a + b;
        },
        echo(...args) {
            return [...args];
        },
        async streamEchoWrite(stream, sendThis) {
            stream.write(b4a.from(sendThis));
            setTimeout(() => {
                stream.end();
            }, 12);
            return null;
        },
        async streamEcho(stream, sendThis) {
            // Listen for error events to handle them properly
            stream.once("error", e => {
                console.log("WebWorker streamEcho received an error", e);
            });

            // Write to the stream
            stream.write(sendThis);

            // Return a promise that resolves once it receives data on the stream
            return new Promise(resolve => {
                let ended = false;

                // Handle the data event
                stream.once("data", chunk => {
                    if (!ended) {
                        resolve(chunk);
                        stream.end();
                    }
                });

                // Handle the end event
                stream.once("end", () => {
                    if (!ended) {
                        resolve(b4a.alloc(0)); // Resolve to an empty buffer if no data event was received
                    }
                    ended = true;
                });
            });
        },
        async isItDuplex(stream) {
            return isDuplex(stream);
        },
        async isItReadable(stream) {
            return isReadable(stream);
        },
        async isItWritable(stream) {
            return isWritable(stream);
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
            local.once("error", e => {
                console.log("Worker received error", e.message);
            });
            setTimeout(() => {
                local.destroy(new Error("stream error"));
            }, 100);
            return remote;
        },
        async callbackFunction(cb) {
            return cb(1, 2);
        }
    };

    const mockWorker = new MockWorker();
    const clientRpc = rpcFromWebWorkerWithTransfer(mockWorker);
    return mockWorker.run(async worker => {
        const workerRpc = rpcFromWebWorkerWithTransfer(worker);
        workerRpc.expose(funcs);
        try {
            await cb({ rpc: clientRpc, worker: mockWorker });
        } finally {
            // Move worker termination to the next tick
            process.nextTick(() => {
                worker.terminate();
                console.log("Worker test done. Terminating worker...");
            });
        }
    });
}

class CustomError extends Error {
    constructor(message) {
        super(message);
    }
}

export { CustomError, useWorker };