import { http, createConfig } from "wagmi";
import { base, baseSepolia } from "wagmi/chains";
import { injected, coinbaseWallet } from "wagmi/connectors";
import { farcasterMiniApp } from "@farcaster/miniapp-wagmi-connector";

const BASE_RPC_URL = import.meta.env.VITE_BASE_RPC_URL || "https://mainnet.base.org";
const BASE_SEPOLIA_RPC_URL =
  import.meta.env.VITE_BASE_SEPOLIA_RPC_URL || "https://sepolia.base.org";

/**
 * Coinbase Developer Platform Paymaster & Bundler endpoints.
 * Configured per-chain so Smart Wallet can sponsor gas via EIP-5792
 * `wallet_sendCalls` (and `wallet_getCapabilities` reports
 * `paymasterService.supported: true`).
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
 * Base Account / Smart Wallet support.
 *
 * `preference: "smartWalletOnly"` forces the passkey-based Base Account flow.
 * `paymasterUrls` lets Smart Wallet route sponsored UserOperations through the
 * CDP paymaster when the dapp uses EIP-5792 `wallet_sendCalls`.
 *
 * We keep `injected()` for MetaMask/Rabby users and `farcasterMiniApp()` so
 * the mini app keeps working inside Warpcast / Base App.
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
      paymasterUrls: CDP_PAYMASTER_URLS as Record<number, string>,
    }),
  ],
  transports: {
    [base.id]: http(BASE_RPC_URL),
    [baseSepolia.id]: http(BASE_SEPOLIA_RPC_URL),
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
