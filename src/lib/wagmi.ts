import { http, createConfig } from "wagmi";
import { base, baseSepolia } from "wagmi/chains";
import { injected, coinbaseWallet } from "wagmi/connectors";
import { farcasterMiniApp } from "@farcaster/miniapp-wagmi-connector";

const BASE_RPC_URL = import.meta.env.VITE_BASE_RPC_URL || "https://mainnet.base.org";
const BASE_SEPOLIA_RPC_URL =
  import.meta.env.VITE_BASE_SEPOLIA_RPC_URL || "https://sepolia.base.org";

/**
 * Base Account / Smart Wallet support.
 *
 * The Coinbase Wallet SDK is the runtime that powers Base Account today (the
 * SDK was rebranded — same connector, same RPC surface). Using
 * `preference: "smartWalletOnly"` forces the Smart Wallet flow (passkey, no
 * browser extension required) which is what the "Base App" / Base Account
 * experience uses.
 *
 * We keep `injected()` for users with MetaMask/Rabby and
 * `farcasterMiniApp()` so the mini app keeps working inside Warpcast / Base App.
 */
export const wagmiConfig = createConfig({
  chains: [base, baseSepolia],
  connectors: [
    farcasterMiniApp(),
    injected(),
    coinbaseWallet({
      appName: "Basemint",
      appLogoUrl: "https://basemint.dev/icon-512.png",
      preference: "smartWalletOnly",
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
