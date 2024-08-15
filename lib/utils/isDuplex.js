export function isDuplex(stream) {
    return !!stream?._readableState && !!stream?._writableState
}