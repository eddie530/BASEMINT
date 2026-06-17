// Browser stub for rpc-websockets — Farcaster SDK pulls in @solana/web3.js which
// uses rpc-websockets, but we don't use Solana features. Avoids bundling Buffer/eventemitter3 nodes.
export class Client {}
export class CommonClient {}
export default { Client, CommonClient };
