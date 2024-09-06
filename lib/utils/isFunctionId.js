export function isFunctionId(id) {
    return typeof id === 'string' && id.startsWith('__fn_');
}