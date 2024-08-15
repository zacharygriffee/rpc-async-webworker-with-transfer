export function isWritable(stream) {
    return !!stream?._writableState
}