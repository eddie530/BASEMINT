// Shim that resolves to the real Node.js `stream/promises` at runtime.
// String concatenation prevents bundlers from statically rewriting the specifier.
const mod = await import("node:" + "stream/promises");
const _default = mod.default ?? mod;
export default _default;
export const pipeline = mod.pipeline;
export const finished = mod.finished;
