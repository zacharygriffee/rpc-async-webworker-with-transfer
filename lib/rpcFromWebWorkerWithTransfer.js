import {createRpc, rpcFromWebWorker} from "rpc-async";
import {fromTransferable} from "./utils/fromTransferable.js";
import {asTransferable} from "./utils/asTransferable.js";

export {rpcFromWebWorkerWithTransfer as attachRpc, rpcFromWebWorker};

export function rpcFromWebWorkerWithTransfer(worker) {
    const _rpc = createRpc({
        send: (data) => {
            data.idx = [];
            data.transfer = [];
            if (data.method) {
                data.params = asTransferable(data.params, _rpc, data)
            } else {
                data.result = asTransferable(data.result, _rpc, data);
            }

            return worker.postMessage(data, data.transfer || []);
        },
        attach: (route) => {
            const messageHandler = (event) => {
                const data = event.data;
                if (data.method) {
                    data.params = fromTransferable(data.params, _rpc);
                    if (!Array.isArray(data.params)) data.params = [data.params];
                } else {
                    // Use fromTransferable to convert the transfer
                    data.result = fromTransferable(data.result, _rpc) ?? null;
                }

                delete data.transfer;
                return route(data);
            };

            worker.addEventListener('message', messageHandler);
            return () => worker.removeEventListener('message', messageHandler);
        }
    });
    _rpc.emit = _rpc.sendNotification.bind(_rpc);
    return _rpc;
}
