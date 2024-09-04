import {isDuplex} from "./isDuplex.js";
import {toWeb} from "streamx-webstream";
import {isReadableStream} from "./isReadableStream.js";
import {isWritableStream} from "./isWritableStream.js";
import {isTransferable} from "./isTransferable.js";
import b4a from "b4a";
import c from "compact-encoding";
import {isReadable} from "./isReadable.js";
import {isWritable} from "./isWritable.js";

const isNode = typeof process !== 'undefined' && process.versions != null && process.versions.node != null;

export function asTransferable(object, encoding) {
    if (isTransferable(object)) {
        return [object];
    }

    if (isDuplex(object)) {
        const { readable, writable } = toWeb(object);
        return [readable, writable];
    }

    if (isReadable(object) || isWritable(object)) {
        return [toWeb(object)];
    }

    if (isReadableStream(object) || isWritableStream(object)) {
        return [object];
    }

    if (Array.isArray(object) && !b4a.isBuffer(object)) {
        return object.flatMap(item => asTransferable(item, encoding));
    }

    return isNode ?
        [typedArrayToBuffer(c.encode(encoding, object))] :
        [c.encode(encoding, object).buffer];
}

function typedArrayToBuffer(array) {
    return array.buffer.slice(array.byteOffset, array.byteLength + array.byteOffset);
}