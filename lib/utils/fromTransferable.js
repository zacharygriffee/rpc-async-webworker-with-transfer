import { isReadableStream } from "./isReadableStream.js";
import { isWritableStream } from "./isWritableStream.js";
import { isReadableWritablePair } from "./isReadableWritablePair.js";
import { fromWeb } from "streamx-webstream";
import b4a from "b4a";

export function fromTransferable(subject, _rpc) {
    function traverse(obj) {
        // Convert ArrayBuffer to Buffer (if applicable)
        if (obj instanceof ArrayBuffer) {
            obj = b4a.from(obj); // Convert ArrayBuffer to Buffer
        }

        // Handle buffers as-is (decoded buffers should already be in proper form)
        if (b4a.isBuffer(obj)) {
            return obj; // Return decoded buffer
        }

        // Reconstruct functions from their IDs
        if (typeof obj === 'string' && obj.startsWith('__fn_')) {
            const funcId = obj; // Retrieve function ID
            const fn = (...args) => _rpc.request[funcId](...args); // Reconstruct async function
            fn.notify = function(...args) {
                _rpc.notify[funcId](...args);
            }
            return fn;
        }

        // Handle StreamX streams (convert back using fromWeb)
        if (isReadableStream(obj) || isWritableStream(obj) || isReadableWritablePair(obj)) {
            // If it's a readable/writable pair, handle it
            if (Array.isArray(obj) && obj.length === 2) {
                return fromWeb({ readable: obj[0], writable: obj[1] }); // Reconstruct readable/writable pair
            }
            return fromWeb(obj); // Handle readable or writable stream
        }

        // If it's an array, recursively process each element
        if (Array.isArray(obj)) {
            const processedArray = obj.map(val => traverse(val));

            // Automatically unpack single-length arrays
            return processedArray.length === 1 ? processedArray[0] : processedArray;
        }


        // Reconstruct objects
        if (typeof obj === 'object' && obj !== null) {
            const processedObj = {};
            for (const key in obj) {
                processedObj[key] = traverse(obj[key]); // Recursively reconstruct objects
            }
            return processedObj;
        }

        // Return the object as-is for other cases (e.g., primitives)
        return obj;
    }

    // Traverse the subject and automatically unpack single-length arrays if needed
    const result = traverse(subject);
    return Array.isArray(result) && result.length === 1 ? result[0] : result;
}




// Check for the encoding marker at the beginning of the buffer
function hasEncodingMarker(buffer) {
    const marker = b4a.from("__encoded__");
    return b4a.compare(buffer.slice(0, marker.length), marker) === 0;
}

// Remove the encoding marker from the buffer
function removeEncodingMarker(buffer) {
    const marker = b4a.from("__encoded__");
    return buffer.slice(marker.length);
}