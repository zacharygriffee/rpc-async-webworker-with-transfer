import { solo, test } from "brittle";
import { asTransferable } from "../lib/utils/asTransferable.js";
import { fromTransferable } from "../lib/utils/fromTransferable.js";
import { Duplex, Readable } from "streamx";
import { toWeb, fromWeb } from "streamx-webstream";
import { duplexThrough } from "duplex-through-with-error-handling";
import b4a from "b4a";
import c from "compact-encoding";

// Direct streamx-webstreams handling
test("direct streamx-webstreams handling", async _t => {
    const t = _t.test();
    t.plan(3);

    const readable = new Readable({
        read(cb) {
            this.push("test data");
            this.push(null);
            cb();
        }
    });

    const webReadable = toWeb(readable);
    const reconstructedReadable = fromWeb(webReadable);

    let dataReceived = "";

    reconstructedReadable.on("data", data => {
        console.log('Data received:', data.toString());
        dataReceived += data.toString();
        t.is(data.toString(), "test data", "Data should be received correctly");
    });

    reconstructedReadable.on("end", () => {
        console.log('Readable stream ended.');
        t.is(dataReceived, "test data", "All data should be received before end");
        readable.destroy();
        t.pass("Readable stream ended correctly");
    });

    await t;
});

// Test for Buffer
test("asTransferable and fromTransferable with Buffer", async t => {
    const buffer = b4a.from("hello world");
    const encoding = c.any;

    const transferable = asTransferable(buffer, encoding);
    const result = fromTransferable(transferable[0], encoding);

    t.alike(result, buffer, "Buffer should be transferred and reconstructed correctly");
});

// Test for Duplex Stream
test("asTransferable and fromTransferable with Duplex stream", async t => {
    const [duplex] = duplexThrough();
    const encoding = c.any;

    const transferable = asTransferable(duplex, encoding);
    const reconstructedDuplex = fromTransferable(transferable, encoding);

    t.ok(reconstructedDuplex instanceof Duplex, "Duplex stream should be transferred and reconstructed correctly");

    // Ensure data can be written and read
    reconstructedDuplex.write("test data");
    reconstructedDuplex.on('data', data => {
        t.is(data.toString(), "test data", "Data should be transferred and reconstructed correctly");
        reconstructedDuplex.destroy();
    });
});

// Test for Readable Stream
test("asTransferable and fromTransferable with Readable stream", async _t => {
    const t = _t.test();
    t.plan(4);

    const readable = new Readable({
        read(cb) {
            this.push("test data");
            this.push(null);
            cb();
        }
    });
    const encoding = c.any;

    const transferable = asTransferable(readable, encoding);

    const [reconstructedReadable] = fromTransferable(transferable, encoding);

    t.ok(reconstructedReadable instanceof Readable, "Readable stream should be transferred and reconstructed correctly");

    let dataReceived = "";

    // Ensure data can be read
    reconstructedReadable.on("data", data => {
        dataReceived += data.toString();
        t.is(data.toString(), "test data", "Data should be transferred and reconstructed correctly");
    });

    reconstructedReadable.on("end", () => {
        t.is(dataReceived, "test data", "Data should be transferred and reconstructed correctly");
        readable.destroy();
        t.pass("Readable stream ended correctly");
    });

    await t;
});

// Test for non-transferable objects (e.g., plain object)
test("asTransferable and fromTransferable with plain object", async t => {
    const object = {
        message: "hello world",
        nested: {
            value: 123
        }
    };
    const encoding = c.any;

    const transferable = asTransferable(object, encoding);
    const result = fromTransferable(transferable[0], encoding);

    t.alike(result, object, "Plain object should be transferred and reconstructed correctly");
});