import { createRpc } from "rpc-async";
import { fromWeb, toWeb } from "streamx-webstream";
import { isStream } from "streamx";
import c from "compact-encoding";
import b4a from "b4a";

export { rpcFromWebWorkerWithTransfer as createRpc }
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
                    data.idx.push(transferable.length);
                    data.transfer.push(...transferable);
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
                        const originalParam = fromTransferable(data.transfer.slice(offset, offset + length), encoding);
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

function isTransferable(object) {
    return (
        object instanceof ArrayBuffer ||
        object instanceof MessagePort ||
        (typeof ImageBitmap !== 'undefined' && object instanceof ImageBitmap) ||
        (typeof ReadableStream !== 'undefined' && object instanceof ReadableStream) ||
        (typeof WritableStream !== 'undefined' && object instanceof WritableStream) ||
        isReadableWritablePair(object) ||
        isReadableStream(object) ||
        isWritableStream(object)
    );
}

function asTransferable(object, encoding) {
    if (isTransferable(object)) {
        return [object];
    }

    if (isDuplex(object)) {
        const { readable, writable } = toWeb({ duplex: object });
        return [readable, writable];
    }

    if (isReadableStream(object) || isWritableStream(object)) {
        return toWeb(object);
    }

    if (Array.isArray(object) && !b4a.isBuffer(object)) {
        return object.flatMap(item => asTransferable(item, encoding));
    }

    // If the object is not transferable and doesn't contain transferables, encode it
    return [c.encode(encoding, object).buffer];
}

function fromTransferable(subject, encoding) {
    if (subject instanceof ArrayBuffer) {
        subject = b4a.from(subject);
    }

    if (b4a.isBuffer(subject)) {
        return c.decode(encoding, subject);
    }

    if (isReadableStream(subject) || isWritableStream(subject) || isReadableWritablePair(subject) || isStream(subject)) {
        if (Array.isArray(subject)) {
            subject = { readable: subject[0], writable: subject[1] };
        }
        return fromWeb(subject);
    }

    if (Array.isArray(subject)) {
        return subject.map(item => fromTransferable(item, encoding));
    }

    if (typeof subject === 'object' && subject !== null) {
        const reconstructedObject = {};
        for (const key in subject) {
            if (Object.prototype.hasOwnProperty.call(subject, key)) {
                reconstructedObject[key] = fromTransferable(subject[key], encoding);
            }
        }
        return reconstructedObject;
    }

    return subject;
}

function isDuplex(stream) {
    return !!stream?._readableState && !!stream?._writableState
}

function isReadable(stream) {
    return!!stream?._readableState
}

function isReadableStream(object) {
    return typeof ReadableStream !== 'undefined' && object instanceof ReadableStream;
}

function isWritableStream(object) {
    return typeof WritableStream !== 'undefined' && object instanceof WritableStream;
}

function isReadableWritablePair(object) {
    if (Array.isArray(object)) {
        return (
            object.length === 2 &&
            isReadableStream(object[0]) &&
            isWritableStream(object[1])
        );
    }

    return (
        typeof object === 'object' &&
        object !== null &&
        isReadableStream(object.readable) &&
        isWritableStream(object.writable)
    );
}