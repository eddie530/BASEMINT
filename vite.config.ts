import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import path from "node:path";
import { nodePolyfills } from "vite-plugin-node-polyfills";

const shimRpcWs = path.resolve(process.cwd(), "src/lib/shims/rpc-websockets.ts");
const shimStreamPromises = path.resolve(
  process.cwd(),
  "src/lib/shims/node-stream-promises.mjs",
);
const shimStreamWeb = path.resolve(process.cwd(), "src/lib/shims/node-stream-web.mjs");

export default defineConfig({
  tanstackStart: {
    server: { entry: "server" },
  },
  vite: {
    plugins: [
      // Polyfills are only needed for the browser bundle. Scoping them to the
      // client environment prevents them from aliasing `stream` -> `stream-browserify`
      // in the SSR/Nitro/Worker builds.
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
        { find: /^rpc-websockets$/, replacement: shimRpcWs },
        { find: /^rpc-websockets\/dist\/.*$/, replacement: shimRpcWs },
        // The polyfill plugin can rewrite `node:stream/{promises,web}` to
        // non-existent `stream-browserify/{promises,web}` paths during the
        // Vercel/Nitro SSR build. Force both the original node: specifier and
        // the rewritten stream-browserify subpaths to a real shim file that
        // re-imports the genuine Node module at runtime via string concat
        // (so the bundler can't statically resolve it again).
        { find: "node:stream/promises", replacement: shimStreamPromises },
        { find: "stream/promises", replacement: shimStreamPromises },
        { find: "stream-browserify/promises", replacement: shimStreamPromises },
        { find: "node:stream/web", replacement: shimStreamWeb },
        { find: "stream/web", replacement: shimStreamWeb },
        { find: "stream-browserify/web", replacement: shimStreamWeb },
      ],
    },
  },
});
