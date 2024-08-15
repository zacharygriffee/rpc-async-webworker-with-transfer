import {isDuplex} from "./isDuplex.js";
import {toWeb} from "streamx-webstream";
import {isReadableStream} from "./isReadableStream.js";
import {isWritableStream} from "./isWritableStream.js";
import {isTransferable} from "./isTransferable.js";
import b4a from "b4a";
import c from "compact-encoding";
import {isReadable} from "./isReadable.js";

export function asTransferable(object, encoding) {
    if (isTransferable(object)) {
        return [object];
    }

    if (isDuplex(object)) {
        const {readable, writable} = toWeb({duplex: object});
        return [readable, writable];
    }

    if (isReadable(object)) {
        const readable = toWeb(object);
        return [readable];
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