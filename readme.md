# rpc-async-webworker-with-transfer

Two-way RPC between a web worker and the main thread using transferable objects and streams. Streams are available as [streamx](https://github.com/mafintosh/streamx) duplex or readable streams on either end.

See [rpc-async](https://github.com/mablay/rpc-async) API for other implementations and usages.

Package is about 60kb minified.

## Installation

```sh
npm install rpc-async-webworker-with-transfer --save
```

## Example

```ecmascript 6
import { rpcFromWebWorkerWithTransfer } from "rpc-async-webworker-with-transfer";
import duplexThrough from "duplex-through";
import b4a from "b4a";
const worker = new WebWorker(workerUrl);
const [ourSideDuplex, theirSideDuplex] = duplexThrough();

// main thread
const rpc = rpcFromWebWorkerWithTransfer(worker);
// if in worker
const rpc = rpcFromWebWorkerWithTransfer(self);

// expose functions on either side
rpc.expose({
    connectStream(stream) {
        // stream === theirSideDuplex
        stream.write("some data to the other side");
        
        // you can return a stream it's transferred as well
        return anotherStream;
    },
    largeTextTransfer(largeText) {
        // large text from the other side will be transferred via compact-encoding buffer
    }
});

// request is rpc expecting a response
const anotherStream = await rpc.request.connectStream(theirSideDuplex);

ourSideDuplex.on("data", data => {
    // Get data from the other side.
});

// notify is rpc without expecting response.
rpc.notify.largeTextTransfer(b4a.allocUnsafe(10000));

```

## [More Examples](./examples.md)

---

Distributed under the MIT license. See ``LICENSE`` for more information.