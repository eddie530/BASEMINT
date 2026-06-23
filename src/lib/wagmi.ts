import { http, createConfig } from "wagmi";
import { base } from "wagmi/chains";
import { injected, coinbaseWallet } from "wagmi/connectors";
import { farcasterMiniApp } from "@farcaster/miniapp-wagmi-connector";

export const wagmiConfig = createConfig({
  chains: [base],
  connectors: [
    farcasterMiniApp(),
    injected(),
    coinbaseWallet({
      appName: "Basemint",
      preference: "all",
    }),
  ],
  transports: {
    [base.id]: http("https://mainnet.base.org"),
  },
  ssr: true,
});

declare module "wagmi" {
  interface Register {
    config: typeof wagmiConfig;
  }
}
