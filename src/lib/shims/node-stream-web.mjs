// Shim that resolves to the real Node.js `stream/web` at runtime.
// String concatenation prevents bundlers from statically rewriting the specifier.
const mod = await import("node:" + "stream/web");
const _default = mod.default ?? mod;
export default _default;
export const ReadableStream = mod.ReadableStream ?? globalThis.ReadableStream;
export const WritableStream = mod.WritableStream ?? globalThis.WritableStream;
export const TransformStream = mod.TransformStream ?? globalThis.TransformStream;
export const ByteLengthQueuingStrategy =
  mod.ByteLengthQueuingStrategy ?? globalThis.ByteLengthQueuingStrategy;
export const CountQueuingStrategy = mod.CountQueuingStrategy ?? globalThis.CountQueuingStrategy;
export const TextDecoderStream = mod.TextDecoderStream ?? globalThis.TextDecoderStream;
export const TextEncoderStream = mod.TextEncoderStream ?? globalThis.TextEncoderStream;
