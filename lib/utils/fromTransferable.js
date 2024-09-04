import {isReadableStream} from "./isReadableStream.js";
import {isWritableStream} from "./isWritableStream.js";
import {isReadableWritablePair} from "./isReadableWritablePair.js";
import {fromWeb} from "streamx-webstream";
import b4a from "b4a";
import c from "compact-encoding";

export function fromTransferable(subject, encoding) {
    if (subject instanceof ArrayBuffer) {
        subject = b4a.from(subject);
    }

    if (b4a.isBuffer(subject)) {
        return c.decode(encoding, subject);
    }

    if (isReadableStream(subject) || isWritableStream(subject) || isReadableWritablePair(subject)) {
        if (Array.isArray(subject)) {
            return fromWeb({readable: subject[0], writable: subject[1]});
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