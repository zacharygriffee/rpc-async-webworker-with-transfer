export function isReadable(stream) {
    return !!stream?._readableState
}