import {isReadableWritablePair} from "./isReadableWritablePair.js";
import {isReadableStream} from "./isReadableStream.js";
import {isWritableStream} from "./isWritableStream.js";

export function isTransferable(object) {
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