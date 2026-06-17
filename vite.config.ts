import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { nodePolyfills } from "vite-plugin-node-polyfills";

export default defineConfig({
  tanstackStart: {
    server: { entry: "server" },
  },
  vite: {
    plugins: [
      // Polyfills Node built-ins (Buffer, process, etc.) for browser bundles.
      // Required by @zoralabs/coins-sdk -> @solana/web3.js -> rpc-websockets.
      nodePolyfills({
        include: ["buffer", "process", "util", "stream", "events"],
        globals: { Buffer: true, global: true, process: true },
        protocolImports: true,
      }),
    ],
  },
});
