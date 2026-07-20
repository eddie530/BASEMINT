import { http, createConfig } from "wagmi";
import { base, baseSepolia, polygon } from "wagmi/chains";
import { injected, coinbaseWallet } from "wagmi/connectors";
import { farcasterMiniApp } from "@farcaster/miniapp-wagmi-connector";
import { createCDPEmbeddedWalletConnector } from "@coinbase/cdp-wagmi";

const BASE_RPC_URL = import.meta.env.VITE_BASE_RPC_URL || "https://mainnet.base.org";
const BASE_SEPOLIA_RPC_URL =
  import.meta.env.VITE_BASE_SEPOLIA_RPC_URL || "https://sepolia.base.org";

const CDP_PROJECT_ID = import.meta.env.VITE_CDP_PROJECT_ID as string | undefined;

/**
 * Coinbase Developer Platform Paymaster & Bundler endpoints (Smart Wallet).
 */
export const CDP_PAYMASTER_URLS: Record<number, string | undefined> = {
  ...(import.meta.env.VITE_CDP_PAYMASTER_URL_BASE
    ? { [base.id]: import.meta.env.VITE_CDP_PAYMASTER_URL_BASE as string }
    : {}),
  ...(import.meta.env.VITE_CDP_PAYMASTER_URL_BASE_SEPOLIA
    ? { [baseSepolia.id]: import.meta.env.VITE_CDP_PAYMASTER_URL_BASE_SEPOLIA as string }
    : {}),
};

/**
 * CDP Embedded Wallet config — shared with the `<CDPReactProvider>`
 * mounted in `src/lib/providers.tsx`. EOA accounts are auto-created on
 * first sign-in (email / Google / Apple) and exposed to wagmi through
 * the `cdp-embedded-wallet` connector below.
 */
export const cdpConfig = {
  projectId: CDP_PROJECT_ID ?? "",
  appName: "Basemint",
  appLogoUrl: "https://basemint.dev/icon-512.png",
  ethereum: { createOnLogin: "eoa" as const },
  authMethods: ["email", "oauth:google", "oauth:apple"] as [
    "email",
    "oauth:google",
    "oauth:apple",
  ],
};

const connectors = [
  farcasterMiniApp(),
  injected(),
  coinbaseWallet({
    appName: "Basemint",
    appLogoUrl: "https://basemint.dev/icon-512.png",
    preference: "smartWalletOnly",
    paymasterUrls: CDP_PAYMASTER_URLS as Record<number, string>,
  }),
];

if (CDP_PROJECT_ID) {
  connectors.push(
    createCDPEmbeddedWalletConnector({
      cdpConfig,
      providerConfig: {
        chains: [base, baseSepolia],
        transports: {
          [base.id]: http(BASE_RPC_URL),
          [baseSepolia.id]: http(BASE_SEPOLIA_RPC_URL),
        },
        announceProvider: false,
      },
    }) as (typeof connectors)[number],
  );
}

const POLYGON_RPC_URL = "https://polygon-rpc.com";

export const wagmiConfig = createConfig({
  chains: [base, baseSepolia, polygon],
  connectors,
  transports: {
    [base.id]: http(BASE_RPC_URL),
    [baseSepolia.id]: http(BASE_SEPOLIA_RPC_URL),
    [polygon.id]: http(POLYGON_RPC_URL),
  },
  ssr: true,
});

/** True when the connected wallet is the Coinbase Smart Wallet (Base Account). */
export function isSmartWalletConnector(connectorId: string | undefined): boolean {
  return connectorId === "coinbaseWalletSDK" || connectorId === "coinbaseWallet";
}

/** Whether a sponsored UserOp is possible on the given chain. */
export function isGaslessEligible(connectorId: string | undefined, chainId: number | undefined) {
  return isSmartWalletConnector(connectorId) && !!chainId && !!CDP_PAYMASTER_URLS[chainId];
}

declare module "wagmi" {
  interface Register {
    config: typeof wagmiConfig;
  }
}
