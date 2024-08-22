# Examples of Using rpc-async-webworker-with-transfer

This file provides real-world examples demonstrating how to use the `rpc-async-webworker-with-transfer` library to offload tasks to Web Workers and interact with them using asynchronous RPC and transferable objects. It also includes examples of using a worker pool for efficient task distribution.

## Example 1: Offloading Data Processing to a Web Worker

In this example, we'll use the library to offload a data processing task to a Web Worker.

### `main.js` (Main Thread)

```javascript
import { rpcFromWebWorkerWithTransfer } from "rpc-async-webworker-with-transfer";
import duplexThrough from "duplex-through";
import b4a from "b4a";

// Create a new Web Worker instance
const worker = new Worker('worker.js');
const [ourSideDuplex, theirSideDuplex] = duplexThrough();

// Initialize the RPC connection
const rpc = rpcFromWebWorkerWithTransfer(worker);

// Expose our RPC methods if necessary
rpc.expose({
    processData(data) {
        console.log('Received processed data from worker:', data);
    }
});

// Initiate a data processing request
async function processDataInWorker(data) {
    try {
        const result = await rpc.request.processData(data);
        console.log('Data processed in worker:', result);
    } catch (error) {
        console.error('Error processing data in worker:', error);
    }
}

// Example: Sending data for processing
const data = { message: 'Hello, World!', value: 42 };
processDataInWorker(data);

// Use streams to send large data chunks
const largeText = b4a.allocUnsafe(10000).fill('A');

// Notify the worker about the large text transfer
rpc.notify.largeTextTransfer(largeText);

// Using duplex streams
async function connectStreamExample() {
    // Request to connect streams
    const anotherStream = await rpc.request.connectStream(theirSideDuplex);

    // Listen to data from worker via duplex stream
    ourSideDuplex.on("data", data => {
        console.log('Data from worker:', data.toString());
    });

    // Send data to the worker
    ourSideDuplex.write("some data to the worker");
}

connectStreamExample();
```

### `worker.js` (Worker Thread)

```javascript
import { rpcFromWebWorkerWithTransfer } from "rpc-async-webworker-with-transfer";
import duplexThrough from "duplex-through";

// Initialize the RPC connection
const rpc = rpcFromWebWorkerWithTransfer(self);

// Expose worker-side RPC methods
rpc.expose({
  processData(data) {
    // Simulate data processing
    const processedData = {
      ...data,
      processed: true,
      timestamp: Date.now()
    };
    return processedData;
  },
  largeTextTransfer(largeText) {
    // Handle large text data
    console.log('Received large text chunk from main thread:', largeText.length);
  },
  connectStream(stream) {
    // Example: Processing the stream data
    stream.on('data', (data) => {
      console.log('Stream data from main thread:', data.toString());
    });

    // Create another stream using duplexThrough
    const [anotherStream, localStream] = duplexThrough();
    
    setImmediate(() => anotherStream.write('Data from worker'));
    
    return anotherStream;
  }
});
```

## Example 2: Image Processing in Web Workers

In this example, we'll use the library to perform image processing tasks in a Web Worker.

### `main.js` (Main Thread)

```javascript
import { rpcFromWebWorkerWithTransfer } from "rpc-async-webworker-with-transfer";

// Create a new Web Worker instance
const worker = new Worker('image-worker.js');

// Initialize the RPC connection
const rpc = rpcFromWebWorkerWithTransfer(worker);

// Load and send image data to the worker
async function processImage(imageData) {
  try {
    const processedImageData = await rpc.request.processImage(imageData);
    console.log('Processed image data:', processedImageData);
  } catch (error) {
    console.error('Error processing image:', error);
  }
}

// Example: Sending an image for processing
const imageData = new Uint8Array([/* raw image data */]);
processImage(imageData);
```

### `image-worker.js` (Worker Thread)

```javascript
import { rpcFromWebWorkerWithTransfer } from "rpc-async-webworker-with-transfer";

// Initialize the RPC connection
const rpc = rpcFromWebWorkerWithTransfer(self);

// Expose image processing methods
rpc.expose({
  processImage(imageData) {
    // Example: Apply some processing to the image
    const processedImage = applyFilter(imageData);
    return processedImage;
  }
});

// Simple image filter function
function applyFilter(imageData) {
  // Process image data (this is just a dummy example)
  return imageData.map(pixel => 255 - pixel); // Invert colors
}
```

## Example 3: Using Worker Pool for Data Processing

This example shows how to create a pool of Web Workers and distribute data processing tasks among them.

### Brief Example

```javascript
import { WorkerPool } from './workerPool.js';
                                    
// Create a pool of workers
const workerPool = new WorkerPool(() => new Worker('worker.js'), 4); // Create 4 workers

// Function to process data using the worker pool
async function processDataInPool(data) {
  try {
    const result = await workerPool.addRequestTask('processData', [data]);
    console.log('Data processed by workers:', result);
  } catch (error) {
    console.error('Error processing data by workers:', error);
  }
}

// Example: Sending data for processing
const data = { message: 'Hello, World!', value: 42 };
processDataInPool(data);
```

### `worker.js` (Worker Thread for Pool)

```javascript
import { rpcFromWebWorkerWithTransfer } from "rpc-async-webworker-with-transfer";

// Initialize the RPC connection
const rpc = rpcFromWebWorkerWithTransfer(self);

// Expose worker-side RPC methods
rpc.expose({
  processData(data) {
    // Simulate data processing
    const processedData = {
      ...data,
      processed: true,
      timestamp: Date.now()
    };
    return processedData;
  }
});
```

## Summary

This `examples.md` file includes practical examples of using the `rpc-async-webworker-with-transfer` library for different purposes such as data processing and image processing. Additionally, it demonstrates how to create and use a worker pool to efficiently distribute tasks across multiple workers, enhancing the performance and responsiveness of web applications.