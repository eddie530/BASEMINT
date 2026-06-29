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
      // Polyfills are only needed for the browser bundle. Scoping them to the
      // client environment prevents them from aliasing `stream` -> `stream-browserify`
      // in the SSR/Nitro/Worker builds, which breaks srvx's `stream/promises` import
      // on Vercel.
      ...nodePolyfills({
        include: ["buffer", "util", "stream", "events"],
        globals: { Buffer: true, global: true, process: false },
        protocolImports: true,
      }).map((plugin) => ({
        ...plugin,
        applyToEnvironment: (env: { name: string }) => env.name === "client",
      })),
    ],
    resolve: {
      alias: [
        // Farcaster SDK pulls @solana/web3.js -> rpc-websockets, which breaks browser bundling.
        // We don't use Solana, so stub it out.
        { find: /^rpc-websockets$/, replacement: shimRpcWs },
        { find: /^rpc-websockets\/dist\/.*$/, replacement: shimRpcWs },
        // srvx (Nitro/Vercel SSR runtime) imports `node:stream/promises`. The nodePolyfills
        // plugin rewrites that to `stream-browserify/promises`, which doesn't exist and
        // breaks the Vercel build. Force it back to the real Node built-in.
        { find: /^stream-browserify\/promises$/, replacement: "node:stream/promises" },
      ],
    },

  },
});
