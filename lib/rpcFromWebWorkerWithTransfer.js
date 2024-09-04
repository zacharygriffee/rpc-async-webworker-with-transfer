import {createRpc, rpcFromWebWorker} from "rpc-async";
import c from "compact-encoding";
import {fromTransferable} from "./utils/fromTransferable.js";
import {asTransferable} from "./utils/asTransferable.js";

export { rpcFromWebWorkerWithTransfer as attachRpc, rpcFromWebWorker }
export function rpcFromWebWorkerWithTransfer(worker, encoding = c.any) {
    return createRpc({
        send: (data) => {
            if (data.result) {
                data.transfer = asTransferable(data.result, encoding);
                data.result = true;
            } else if (data.params) {
                data.idx = [];
                data.transfer = [];
                for (const param of data.params) {
                    const transferable = asTransferable(param, encoding);
                    // if (!transferable) continue;
                    data.idx.push(transferable.length);
                    if (Array.isArray(transferable)) {
                        data.transfer.push(...transferable);
                    } else {
                        data.transfer.push(transferable);
                    }
                }
                delete data.params;
            }
            return worker.postMessage(data, data.transfer || []);
        },
        attach: (route) => {
            const $route = (event) => {
                const data = event.data;

                if (!data.transfer) {
                    return route(data);
                }

                if (data.result === true) {
                    if (data.transfer.length === 1)
                        data.transfer = data.transfer[0];
                    data.result = fromTransferable(
                        data.transfer,
                        encoding
                    );
                } else {
                    let offset = 0;
                    data.params = data.idx.map(length => {
                        const transferable = data.transfer.slice(offset, offset + length);
                        const originalParam = fromTransferable(transferable, encoding);
                        offset += length;
                        if (Array.isArray(originalParam) && originalParam.length === 1) {
                            return originalParam[0];
                        }
                        return originalParam;
                    });
                }

                delete data.transfer;
                return route(data);
            }
            worker.addEventListener('message', $route);
            return () => worker.removeEventListener('message', $route);
        },
    });
}

