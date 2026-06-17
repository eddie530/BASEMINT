// Browser stub — Farcaster SDK pulls @solana/web3.js -> rpc-websockets; we don't use Solana.
export class Client {}
export class CommonClient {}
export const WebSocket: typeof globalThis.WebSocket =
  (typeof globalThis !== "undefined" && (globalThis as { WebSocket?: typeof globalThis.WebSocket }).WebSocket) ||
  (class {} as unknown as typeof globalThis.WebSocket);
export default { Client, CommonClient, WebSocket };
