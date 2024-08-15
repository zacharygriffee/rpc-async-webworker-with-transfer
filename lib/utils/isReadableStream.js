export function isReadableStream(object) {
    return typeof ReadableStream !== 'undefined' && object instanceof ReadableStream;
}