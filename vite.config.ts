import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import path from "node:path";
import { nodePolyfills } from "vite-plugin-node-polyfills";

const shimRpcWs = path.resolve(process.cwd(), "src/lib/shims/rpc-websockets.ts");
const nodeStreamPromisesShim = "virtual:basemint-node-stream-promises";
const resolvedNodeStreamPromisesShim = `\0${nodeStreamPromisesShim}`;

export default defineConfig({
  tanstackStart: {
    server: { entry: "server" },
  },
  vite: {
    plugins: [
      // srvx (Nitro/Vercel SSR runtime) imports `node:stream/promises`. The
      // client polyfill plugin can rewrite that to the non-existent package
      // subpath `stream-browserify/promises` during Vercel's server build.
      // Patch the srvx import to a virtual shim before dependency resolution,
      // and handle any already-rewritten specifier as a fallback.
      {
        name: "basemint:shim-node-stream-promises",
        enforce: "pre" as const,
        resolveId(id: string) {
          if (
            id === nodeStreamPromisesShim ||
            id === "node:stream/promises" ||
            id === "stream/promises" ||
            id === "stream-browserify/promises" ||
            id.endsWith("/node_modules/stream-browserify/promises") ||
            id.endsWith("/stream-browserify/promises")
          ) {
            return resolvedNodeStreamPromisesShim;
          }
          return null;
        },
        load(id: string) {
          if (id === resolvedNodeStreamPromisesShim) {
            return `
const loadStreamPromises = () => import("node:" + "stream/promises");

export async function pipeline(...args) {
  const mod = await loadStreamPromises();
  return mod.pipeline(...args);
}

export async function finished(...args) {
  const mod = await loadStreamPromises();
  return mod.finished(...args);
}

export default { pipeline, finished };
`;
          }
          return null;
        },
        transform(code: string, id: string) {
          if (id.includes("/srvx/dist/adapters/node.mjs") || id.includes("\\srvx\\dist\\adapters\\node.mjs")) {
            return {
              code: code
                .replaceAll('"node:stream/promises"', JSON.stringify(nodeStreamPromisesShim))
                .replaceAll("'node:stream/promises'", JSON.stringify(nodeStreamPromisesShim)),
              map: null,
            };
          }
          return null;
        },
      },

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
        // We don't use Solana, so stub it out.
        { find: /^rpc-websockets$/, replacement: shimRpcWs },
        { find: /^rpc-websockets\/dist\/.*$/, replacement: shimRpcWs },
      ],
    },
  },
});
