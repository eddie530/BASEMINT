import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  tanstackStart: {
    server: { entry: "server" },
  },
  vite: {
    resolve: {
      alias: {
        // Polyfill Node "buffer" for browser bundles (needed by @zoralabs/coins-sdk -> @solana/web3.js -> rpc-websockets)
        buffer: "buffer/",
      },
    },
    define: {
      global: "globalThis",
    },
    optimizeDeps: {
      include: ["buffer"],
    },
  },
});
