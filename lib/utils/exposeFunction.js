// Expose the function for RPC
import {createFunctionId} from "./idGenerator.js";

export function exposeFunction(_rpc, func) {
    const funcId = `__fn_${Math.random().toString(36).substring(2, 9)}`; // Create unique function ID
    _rpc.expose({ [funcId]: func });
    return funcId;
}