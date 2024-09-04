class MockWorker {
    constructor() {
        this.terminated = false;
        this.mainThreadListeners = this._createListenerMap();
        this.workerListeners = this._createListenerMap();
    }

    _createListenerMap() {
        return { message: [], error: [] };
    }

    _cloneAndNotify(listeners, data, transfer) {
        if (this.terminated) return; // Prevent further actions after termination
        const clonedData = structuredClone(data, { transfer });
        listeners.forEach(listener => listener({ data: clonedData }));
    }

    _clearListeners() {
        this.mainThreadListeners = this._createListenerMap();
        this.workerListeners = this._createListenerMap();
    }

    // Main thread facing methods
    postMessage(data, transfer) {
        if (this.terminated) return; // Prevent sending messages after termination
        this._cloneAndNotify(this.workerListeners['message'], data, transfer);
    }

    addEventListener(event, callback) {
        if (this.terminated) return; // Prevent adding listeners after termination
        if (this.mainThreadListeners[event]) {
            this.mainThreadListeners[event].push(callback);
        }
    }

    removeEventListener(event, callback) {
        if (this.terminated) return; // Prevent removing listeners after termination
        if (this.mainThreadListeners[event]) {
            this.mainThreadListeners[event] = this.mainThreadListeners[event].filter(cb => cb !== callback);
        }
    }

    terminate() {
        if (this.terminated) return; // Prevent redundant termination
        this.terminated = true;
        this._clearListeners(); // Cleanup all listeners
        console.log("Worker terminated and listeners cleared.");
    }

    // Worker facing methods encapsulated in worker method
    async run(cb, errCb) {
        const workerInterface = {
            postMessage: (data, transfer) => this._cloneAndNotify(this.mainThreadListeners['message'], data, transfer),
            addEventListener: (event, callback) => {
                if (this.terminated) return;
                if (this.workerListeners[event]) {
                    this.workerListeners[event].push(callback);
                }
            },
            removeEventListener: (event, callback) => {
                if (this.terminated) return;
                if (this.workerListeners[event]) {
                    this.workerListeners[event] = this.workerListeners[event].filter(cb => cb !== callback);
                }
            },
            terminate: () => {
                if (this.terminated) return;
                this.terminated = true;
                this._clearListeners();
                console.log("Worker terminated and listeners cleared.");
            }
        };

        try {
            await cb(workerInterface);
        } catch (e) {
            if (errCb) {
                errCb(e);
            } else {
                throw e;
            }
        }
    }
}

export { MockWorker };