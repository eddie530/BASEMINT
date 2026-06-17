import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import path from "node:path";

const bufferPath = path.resolve(process.cwd(), "node_modules/buffer/index.js");

export default defineConfig({
  tanstackStart: {
    server: { entry: "server" },
  },
  vite: {
    resolve: {
      alias: [
        // Polyfill Node "buffer" for browser bundles (Zora SDK -> @solana/web3.js -> rpc-websockets).
        // Match both bare `buffer` and `node:buffer`.
        { find: /^buffer$/, replacement: bufferPath },
        { find: /^node:buffer$/, replacement: bufferPath },
      ],
    },
    define: {
      global: "globalThis",
    },
    optimizeDeps: {
      include: ["buffer"],
    },
  },
});
