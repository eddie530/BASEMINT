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
      // srvx (Nitro/Vercel SSR runtime) imports `node:stream/promises`. The
      // nodePolyfills plugin rewrites that to `stream-browserify/promises`,
      // which doesn't exist on disk. Intercept the bare specifier with a
      // pre-resolver and externalize it back to the real Node built-in so
      // the Nitro/Vercel build doesn't try to bundle it.
      {
        name: "basemint:force-node-stream-promises",
        enforce: "pre" as const,
        resolveId(id: string) {
          if (id === "stream-browserify/promises" || id === "node:stream/promises") {
            return { id: "node:stream/promises", external: true };
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
