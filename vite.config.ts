import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import path from "node:path";
import { nodePolyfills } from "vite-plugin-node-polyfills";

const shimRpcWs = path.resolve(process.cwd(), "src/lib/shims/rpc-websockets.ts");

// Subpaths of node:stream that the polyfill plugin can rewrite to non-existent
// `stream-browserify/<sub>` files during the Vercel/Nitro SSR build.
const STREAM_SUBPATHS = ["promises", "web"] as const;
type StreamSub = (typeof STREAM_SUBPATHS)[number];

const shimIdFor = (sub: StreamSub) => `virtual:basemint-node-stream-${sub}`;
const resolvedShimIdFor = (sub: StreamSub) => `\0${shimIdFor(sub)}`;

function matchStreamSub(id: string): StreamSub | null {
  for (const sub of STREAM_SUBPATHS) {
    if (
      id === shimIdFor(sub) ||
      id === `node:stream/${sub}` ||
      id === `stream/${sub}` ||
      id === `stream-browserify/${sub}` ||
      id.endsWith(`/node_modules/stream-browserify/${sub}`) ||
      id.endsWith(`/stream-browserify/${sub}`)
    ) {
      return sub;
    }
  }
  return null;
}

export default defineConfig({
  tanstackStart: {
    server: { entry: "server" },
  },
  vite: {
    plugins: [
      // srvx and @tanstack/router-core import `node:stream/promises` and
      // `node:stream/web`. The client polyfill plugin can rewrite those to
      // non-existent `stream-browserify/<sub>` paths during Vercel's server
      // build. Intercept before resolution and route to a virtual shim that
      // re-imports the real `node:stream/<sub>` at runtime.
      {
        name: "basemint:shim-node-stream-subpaths",
        enforce: "pre" as const,
        resolveId(id: string) {
          const sub = matchStreamSub(id);
          return sub ? resolvedShimIdFor(sub) : null;
        },
        load(id: string) {
          for (const sub of STREAM_SUBPATHS) {
            if (id === resolvedShimIdFor(sub)) {
              return `
const load = () => import("node:" + "stream/${sub}");
const mod = await load();
export default mod.default ?? mod;
export const {
${Object.keys({}).join("")}
} = {};
export * from "node:stream/${sub}";
`;
            }
          }
          return null;
        },
        transform(code: string, id: string) {
          if (id.includes("/srvx/dist/adapters/node.mjs")) {
            return {
              code: code
                .replaceAll('"node:stream/promises"', JSON.stringify(shimIdFor("promises")))
                .replaceAll("'node:stream/promises'", JSON.stringify(shimIdFor("promises"))),
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
