import { rpcFromWebWorkerWithTransfer } from './rpcFromWebWorkerWithTransfer.js';

export let currentWorkerCount = 0;
if (typeof navigator === 'undefined') {
    globalThis.navigator = { hardwareConcurrency: 4 };
}

class WorkerPool {
    constructor(WorkerConstructor, poolSize = Math.min(navigator.hardwareConcurrency / 2, 4)) {
        this.poolSize = poolSize;
        this.workers = [];
        this.taskQueue = [];
        this.idleWorkers = [];
        this._terminated = false;

        for (let i = 0; i < poolSize; i++) {
            this._createWorker(WorkerConstructor);
            currentWorkerCount++;
        }
    }

    _createWorker(WorkerConstructor) {
        const worker = new WorkerConstructor();
        const rpc = rpcFromWebWorkerWithTransfer(worker);

        worker.rpc = rpc;

        this.workers.push(worker);
        this.idleWorkers.push(worker);
    }

    _processQueue() {
        if (this.taskQueue.length > 0 && this.idleWorkers.length > 0) {
            const worker = this.idleWorkers.shift();
            const { method, resolve, reject, type, args = [] } = this.taskQueue.shift();

            if (type === 'request') {
                worker.rpc.request[method](...args)
                    .then((result) => {
                        resolve({result, worker});
                    })
                    .catch((err) => {
                        reject(err);
                    })
                    .finally(() => {
                        this.idleWorkers.push(worker);
                        this._processQueue();
                    });
            } else if (type === 'notify') {
                worker.rpc.notify[method](...args);
                resolve({
                    worker
                }); // Since notify does not have a return value, resolve immediately
                this.idleWorkers.push(worker);
                this._processQueue();
            }
        }
    }

    addTask(method, args = [], type = 'request') {
        return this.addTaskComplex(method, args, type).then(({result}) => {
            return result;
        })
    }

    addTaskComplex(method, args = [], type = 'request') {
        if (this._terminated) {
            throw new Error('Worker pool has been terminated.');
        }
        if (type !== 'request' && type !== 'notify') {
            throw new Error('Invalid task type. Must be "request" or "notify".');
        }
        return new Promise((resolve, reject) => {
            this.taskQueue.push({ method, resolve, reject, type, args });
            this._processQueue();
        });
    }

    addRequestTask(method, args = []) {
        return this.addTask(method, args, 'request');
    }

    addRequestTaskComplex(method, args = []) {
        return this.addTaskComplex(method, args, 'request');
    }

    addNotifyTask(method, args = []) {
        return this.addTask(method, args, 'notify');
    }

    addNotifyTaskComplex(method, args = []) {
        return this.addTaskComplex(method, args, 'notify');
    }

    terminateAllWorkers() {
        this.workers.forEach((worker) => {
            worker.terminate();
            currentWorkerCount--;
        });
        this.workers = [];
        this.idleWorkers = [];
        this._terminated = true;
    }
}

export { WorkerPool };
