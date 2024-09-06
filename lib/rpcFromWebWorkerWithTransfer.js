import {createRpc, rpcFromWebWorker} from "rpc-async";
import {fromTransferable} from "./utils/fromTransferable.js";
import {asTransferable} from "./utils/asTransferable.js";

function reconstructFunction(param, _rpc) {
    if (typeof param === 'string' && param.startsWith('__fn_')) {
        const funcName = param;
        return (...args) => _rpc.request[funcName](...args);
    }
    return param;
}


// function _handleTransfer(data, encoding, _rpc) {
//     const idx = [];
//     const transfer = [];
//     const isResult = !!data?.result;
//     const subject = isResult ? data?.result : data?.params;
//     const isObjectNotArray = typeof subject === "object" && !Array.isArray(subject);
//
//     let newSubject = subject;
//     if (isObjectNotArray && !b4a.isBuffer(subject) && !isTransferable(subject)) {
//         newSubject = Object.fromEntries(
//             Object.entries(subject).map(([key, value]) => {
//                 return [key, isTransferable(value) ? value : serialize(value)];
//             })
//         );
//     } else if (Array.isArray(subject)) {
//         newSubject = subject.map((value, index) => {
//             return isTransferable(value) ? value : serialize(value);
//         });
//     } else {
//         newSubject = isTransferable(subject) ? subject : serialize(subject);
//     }
//
//     data.result = isResult //isResult ? newSubject : false;
//     delete data.params;
//     data.idx = idx;
//     data.transfer = transfer;
//
//     return data
//
//     function serialize(value) {
//         let newValue = value;
//         if (typeof value === "function" && !isTransferable(value)) {
//             newValue = expose(_rpc, value);
//         }
//
//         const transferable = asTransferable(newValue, encoding, _rpc);
//         idx.push(transferable.length);
//         if (Array.isArray(transferable)) {
//             transfer.push(...transferable)
//         } else {
//             transfer.push(transferable)
//         }
//         return transferable;
//     }
// }
//
// function processTransfer(data, encoding, _rpc) {
//     data.idx = [];
//     data.transfer = [];
//
//     data.params.forEach((param, index) => {
//         if (typeof param === "function" && !isTransferable(param)) {
//             param = tryExposeFunction(_rpc, param);
//         }
//
//         const transferable = asTransferable(param, encoding, _rpc);
//         data.idx.push(transferable.length);
//
//         if (Array.isArray(transferable)) {
//             data.transfer.push(...transferable);
//         } else {
//             data.transfer.push(transferable);
//         }
//     });
//
//     delete data.params;
// }

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
