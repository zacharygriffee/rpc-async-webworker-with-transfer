import { createRpc, rpcFromWebWorker } from "rpc-async";
import c from "compact-encoding";
import { fromTransferable } from "./utils/fromTransferable.js";
import { asTransferable } from "./utils/asTransferable.js";
import { isTransferable } from "./utils/isTransferable.js";

let functionId = 0;

function createFunctionId(fn) {
    return `__fn_${functionId++}`;
}

function handleTransfer(data, encoding, _rpc) {
    data.idx = [];
    data.transfer = [];

    data.params.forEach((param, index) => {
        if (typeof param === "function" && !isTransferable(param)) {
            const funcId = createFunctionId(param);
            _rpc.expose({ [funcId]: param });
            param = funcId;
        }

        const transferable = asTransferable(param, encoding);
        data.idx.push(transferable.length);

        if (Array.isArray(transferable)) {
            data.transfer.push(...transferable);
        } else {
            data.transfer.push(transferable);
        }
    });

    delete data.params;
}

function processFunctionProxy(data, _rpc, encoding) {
    let offset = 0;
    data.params = data.idx.map(length => {
        const transferable = data.transfer.slice(offset, offset + length);
        offset += length;
        const originalParam = fromTransferable(transferable, encoding);

        return Array.isArray(originalParam) && originalParam.length === 1 ? originalParam[0] : originalParam;
    });

    data.params = data.params.map(param => {
        if (typeof param === 'string' && param.startsWith('__fn_')) {
            const funcName = param;
            const notify = _rpc.notify[funcName];

            return Object.assign(notify, {
                request(...args) {
                    return _rpc.request[funcName](...args);
                },
                notify(...args) {
                    return _rpc.notify[funcName](...args);
                }
            });
        }
        return param;
    });
}

export { rpcFromWebWorkerWithTransfer as attachRpc, rpcFromWebWorker };

export function rpcFromWebWorkerWithTransfer(worker, encoding = c.any) {
    const _rpc = createRpc({
        send: (data) => {
            if (data.result) {
                if (typeof data.result === "function" && !isTransferable(data.result)) {
                    const func = data.result;
                    data.result = createFunctionId(func);
                    _rpc.expose({ [data.result]: func });
                }
                data.transfer = asTransferable(data.result, encoding);
                data.result = true;
            } else if (data.params) {
                handleTransfer(data, encoding, _rpc);
            }
            return worker.postMessage(data, data.transfer || []);
        },
        attach: (route) => {
            const messageHandler = (event) => {
                const data = event.data;

                if (!data.transfer) {
                    return route(data);
                }

                if (data.result === true) {
                    if (data.transfer.length === 1) data.transfer = data.transfer[0];
                    data.result = fromTransferable(data.transfer, encoding);

                    if (typeof data.result === 'string' && data.result.startsWith('__fn_')) {
                        const funcName = data.result;
                        const notify = _rpc.notify[funcName];

                        data.result = Object.assign(notify, {
                            request(...args) {
                                return _rpc.request[funcName](...args);
                            },
                            notify(...args) {
                                return _rpc.notify[funcName](...args);
                            }
                        });
                    }
                } else {
                    processFunctionProxy(data, _rpc, encoding);
                }

                delete data.transfer;
                return route(data);
            };

            worker.addEventListener('message', messageHandler);
            return () => worker.removeEventListener('message', messageHandler);
        },
    });

    return _rpc;
}
