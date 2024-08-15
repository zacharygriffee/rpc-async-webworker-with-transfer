import {isReadableStream} from "./isReadableStream.js";
import {isWritableStream} from "./isWritableStream.js";

export function isReadableWritablePair(object) {
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