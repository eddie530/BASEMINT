import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import path from "node:path";
import { nodePolyfills } from "vite-plugin-node-polyfills";

const shimRpcWs = path.resolve(process.cwd(), "src/lib/shims/rpc-websockets.ts");
const shimStreamPromises = path.resolve(process.cwd(), "src/lib/shims/node-stream-promises.mjs");
const shimStreamWeb = path.resolve(process.cwd(), "src/lib/shims/node-stream-web.mjs");
const shimEmptyCss = path.resolve(process.cwd(), "src/lib/shims/empty.css");

// @coinbase/cdp-react ships CSS files that (a) Node SSR can't import as ESM
// and (b) contain a remote `@import url(https://fonts.googleapis.com/...)`
// that Lightning CSS tries to read from disk. We swap every cdp-react CSS
// asset for an empty stylesheet — the SignIn modal still renders with its
// inline theme tokens.
const cdpReactCssShimPlugin = {
  name: "basemint:shim-cdp-react-css",
  enforce: "pre" as const,
  resolveId(id: string) {
    if (id.includes("@coinbase/cdp-react") && id.endsWith(".css")) {
      return shimEmptyCss;
    }
    return null;
  },
};


// Pre-resolver that catches both bare specifiers AND absolute node_modules
// paths the polyfill plugin rewrites to (e.g. `/vercel/path0/node_modules/
// stream-browserify/promises`), routing them to our runtime shim.
const streamSubpathShimPlugin = {
  name: "basemint:shim-stream-subpaths",
  enforce: "pre" as const,
  resolveId(id: string) {
    if (
      id === "node:stream/promises" ||
      id === "stream/promises" ||
      id === "stream-browserify/promises" ||
      id.endsWith("/stream-browserify/promises")
    ) {
      return shimStreamPromises;
    }
    if (
      id === "node:stream/web" ||
      id === "stream/web" ||
      id === "stream-browserify/web" ||
      id.endsWith("/stream-browserify/web")
    ) {
      return shimStreamWeb;
    }
    return null;
  },
};

export default defineConfig({
  tanstackStart: {
    server: { entry: "server" },
  },
  vite: {
    plugins: [
      streamSubpathShimPlugin,
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
      ],
    },
  },
});

