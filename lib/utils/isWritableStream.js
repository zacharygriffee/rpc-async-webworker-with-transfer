export function isWritableStream(object) {
    return typeof WritableStream !== 'undefined' && object instanceof WritableStream;
}