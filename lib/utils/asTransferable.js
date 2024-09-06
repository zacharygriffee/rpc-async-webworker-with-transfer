import {isDuplex} from "./isDuplex.js";
import {toWeb} from "streamx-webstream";
import {isTransferable} from "./isTransferable.js";
import b4a from "b4a";
import {isReadable} from "./isReadable.js";
import {isWritable} from "./isWritable.js";
import {exposeFunction} from "./exposeFunction.js";

const isNode = typeof process !== 'undefined' && process.versions != null && process.versions.node != null;
export function asTransferable(object, _rpc, transferMetadata = null) {
    const processedTransferables = new Map();

    // Helper to track transfer metadata for transferable objects only
    function handleTransferMetadata(value) {
        // Ensure the value is always wrapped in an array for transfer metadata
        const transferable = Array.isArray(value) ? value : [value];

        if (transferMetadata) {
            transferable.forEach(item => {
                if (!processedTransferables.has(item)) {
                    const newIndex = transferMetadata.transfer.length;
                    transferMetadata.idx.push(newIndex);
                    transferMetadata.transfer.push(item);
                    processedTransferables.set(item, newIndex);
                }
            });
        }

        return value; // Return the value directly if single, or as-is if multiple
    }

    // Traverse the object and handle functions, streams, and non-transferable objects
    function traverse(obj) {
        // Handle buffers: Account for Node.js vs Browser
        if (b4a.isBuffer(obj)) {
            return handleTransferMetadata(isNode ? typedArrayToBuffer(obj) : b4a.from(obj).buffer); // Use ArrayBuffer in browser
        }

        // Handle functions by exposing them
        if (typeof obj === 'function') {
             // Expose function ID
            return exposeFunction(_rpc, obj); // Transfer function ID
        }

        // Handle StreamX duplex streams by converting to readable/writable pairs
        if (isDuplex(obj)) {
            const dup = toWeb(obj); // Convert duplex stream to readable/writable
            return handleTransferMetadata([dup.readable, dup.writable]); // Transfer as readable/writable pair
        }

        // Handle readable or writable streams
        if (isReadable(obj) || isWritable(obj)) {
            return handleTransferMetadata(toWeb(obj)); // Transfer readable or writable stream as-is
        }

        // Handle native transferable objects like ArrayBuffer, ReadableStream
        if (isTransferable(obj)) {
            return handleTransferMetadata(obj); // Let postMessage handle native transferables
        }

        // Recursively process objects (including nested transferables)
        if (typeof obj === 'object' && obj !== null) {
            const processedObj = {};
            for (const key in obj) {
                processedObj[key] = traverse(obj[key]); // Process each key-value pair recursively
            }

            return processedObj; // Return processed object
        }

        // Return primitives or non-transferables directly
        return obj;
    }

    return Array.isArray(object) ? object.map(traverse) : traverse(object);
}



function typedArrayToBuffer(array) {
    return array.buffer.slice(array.byteOffset, array.byteLength + array.byteOffset);
}
