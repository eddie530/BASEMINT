import { http, createConfig } from "wagmi";
import { base, baseSepolia } from "wagmi/chains";
import { injected, coinbaseWallet } from "wagmi/connectors";
import { farcasterMiniApp } from "@farcaster/miniapp-wagmi-connector";

const BASE_RPC_URL =
  import.meta.env.VITE_BASE_RPC_URL || "https://mainnet.base.org";
const BASE_SEPOLIA_RPC_URL =
  import.meta.env.VITE_BASE_SEPOLIA_RPC_URL || "https://sepolia.base.org";

export const wagmiConfig = createConfig({
  chains: [base, baseSepolia],
  connectors: [
    farcasterMiniApp(),
    injected(),
    coinbaseWallet({
      appName: "Basemint",
      preference: "all",
    }),
  ],
  transports: {
    [base.id]: http(BASE_RPC_URL),
    [baseSepolia.id]: http(BASE_SEPOLIA_RPC_URL),
  },
  ssr: true,
});

declare module "wagmi" {
  interface Register {
    config: typeof wagmiConfig;
  }
}
