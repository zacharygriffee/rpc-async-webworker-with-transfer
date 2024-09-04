import { MockWorker } from './MockWorker.js';
import {test} from "brittle";

test("Standard MockWorker test", t => {
    const client = new MockWorker();

    const messageHandler = ({ data }) => {
        t.is(data, "from worker");
        client.terminate();
        // Clean up the event listener
        client.removeEventListener("message", messageHandler);
    };

    client.addEventListener("message", messageHandler);

    client.run((self) => {
        self.postMessage("from worker");
        self.addEventListener("message", ({ data }) => {
            t.is(data, "from main thread");
        });
    });

    client.postMessage("from main thread");
});

test("Standard MockWorker terminate test", t => {
    const client = new MockWorker();

    client.run((self) => {
        self.addEventListener("message", ({ data }) => {
            t.fail();
        });
    });

    client.terminate();
    // Attempting to send a message to a terminated worker should do nothing
    client.postMessage("from main thread");

    t.pass();
});