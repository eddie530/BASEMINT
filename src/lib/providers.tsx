import { useEffect, type ReactNode } from "react";
import { WagmiProvider } from "wagmi";
import { wagmiConfig } from "./wagmi";

export function Web3Providers({ children }: { children: ReactNode }) {
  useEffect(() => {
    // Signal to Farcaster client that the mini app is ready
    let cancelled = false;
    (async () => {
      try {
        const { sdk } = await import("@farcaster/miniapp-sdk");
        if (!cancelled) await sdk.actions.ready();
      } catch {
        // running outside of a Farcaster client
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return <WagmiProvider config={wagmiConfig}>{children}</WagmiProvider>;
}
