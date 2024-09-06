let functionId = 0;

export function createFunctionId() {
    return `__fn_${functionId++}`;
}