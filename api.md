# API Documentation

This document provides a detailed API reference for the `rpc-async-webworker-with-transfer` library and the `WorkerPool` class.

## rpc-async-webworker-with-transfer

The `rpc-async-webworker-with-transfer` library enables asynchronous remote procedure calls (RPC) with transferable objects using Web Workers.

### `rpcFromWebWorkerWithTransfer(worker)`

Creates an RPC interface from a Web Worker instance.

#### Parameters
- `worker`: `Worker` - The Web Worker instance.

#### Returns
- `rpc`: `Object` - An RPC interface with `request`, `notify`, and `expose` methods.

### `rpc.request`

The `request` object contains methods that return promises resolving with the response from the worker.

#### Usage

```javascript
const result = await rpc.request.methodName(args);
```

#### Example

```javascript
const result = await rpc.request.processData({ message: 'Hello, World!' });
console.log(result);
```

### `rpc.notify`

The `notify` object contains methods that send notifications to the worker. These methods do not expect a response.

#### Usage

```javascript
rpc.notify.methodName(args);
```

#### Example

```javascript
rpc.notify.largeTextTransfer(new Uint8Array([...]));
```

### `rpc.expose`

The `expose` method allows exposing methods in the worker that can be called from the main thread.

#### Usage

```javascript
rpc.expose({
  methodName(args) {
    // method implementation
  }
});
```

#### Example

```javascript
rpc.expose({
  processData(data) {
    // process data
    return processedData;
  }
});
```

## WorkerPool

The `WorkerPool` class manages a pool of Web Workers to distribute tasks efficiently.

### Constructor: `WorkerPool(WorkerConstructor, poolSize)`

Creates a pool of workers.

#### Parameters
- `WorkerConstructor`: `Function` - A function that returns a new Web Worker instance.
- `poolSize`: `Number` (optional) - The number of workers to create. Defaults to half of the hardware concurrency or a maximum of 4 workers.

### `addTask(method, args, type)`

Adds a task to the pool. Returns a promise resolving when the task is complete.

#### Parameters
- `method`: `String` - The method name to call in the worker.
- `args`: `Array` - The arguments to pass to the method.
- `type`: `String` - The task type: either "request" or "notify".

#### Returns
- `Promise` - Resolves with the result of the task.

#### Example

```javascript
workerPool.addTask('processData', [{ message: 'Hello, World!' }], 'request').then(result => {
  console.log(result);
});
```

### `addRequestTask(method, args)`

Adds a request task to the pool. Equivalent to calling `addTask` with `type` set to "request".

#### Parameters
- `method`: `String` - The method name to call in the worker.
- `args`: `Array` - The arguments to pass to the method.

#### Returns
- `Promise` - Resolves with the result of the task.

#### Example

```javascript
workerPool.addRequestTask('processData', [{ message: 'Hello, World!' }]).then(result => {
  console.log(result);
});
```

### `addNotifyTask(method, args)`

Adds a notification task to the pool. Equivalent to calling `addTask` with `type` set to "notify".

#### Parameters
- `method`: `String` - The method name to call in the worker.
- `args`: `Array` - The arguments to pass to the method.

#### Example

```javascript
workerPool.addNotifyTask('largeTextTransfer', [new Uint8Array([...])]);
```

### `terminateAllWorkers()`

Terminates all workers in the pool and clears the task queue.

#### Example

```javascript
workerPool.terminateAllWorkers();
```

## Summary

This document provides a detailed API reference for the `rpc-async-webworker-with-transfer` library and the `WorkerPool` class, enabling efficient task distribution and RPC communication using Web Workers.