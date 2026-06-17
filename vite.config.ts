import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import path from "node:path";
import { nodePolyfills } from "vite-plugin-node-polyfills";

const shimRpcWs = path.resolve(process.cwd(), "src/lib/shims/rpc-websockets.ts");

export default defineConfig({
  tanstackStart: {
    server: { entry: "server" },
  },
  vite: {
    plugins: [
      nodePolyfills({
        include: ["buffer", "process", "util", "stream", "events"],
        globals: { Buffer: true, global: true, process: true },
        protocolImports: true,
      }),
    ],
    resolve: {
      alias: [
        // Farcaster SDK pulls @solana/web3.js -> rpc-websockets, which breaks browser bundling.
        // We don't use Solana, so stub it out.
        { find: /^rpc-websockets$/, replacement: shimRpcWs },
        { find: /^rpc-websockets\/dist\/.*$/, replacement: shimRpcWs },
      ],
    },
  },
});
