import { useState, useCallback } from "react";
import { useConnect } from "wagmi";
import { base } from "wagmi/chains";

export function useConnectWallet() {
  const { connect, connectors, isPending } = useConnect();
  const [message, setMessage] = useState<string>();

  const connectWallet = useCallback(
    (preferred?: "farcaster" | "injected" | "coinbase") => {
      setMessage(undefined);
      const fc = connectors.find((c) => c.id === "farcasterMiniApp" || c.id === "farcaster");
      const inj = connectors.find((c) => c.type === "injected");
      const cb = connectors.find((c) => c.id === "coinbaseWalletSDK" || c.id === "coinbaseWallet");

      const inFarcaster =
        typeof window !== "undefined" &&
        (Boolean((window as unknown as { ReactNativeWebView?: unknown }).ReactNativeWebView) ||
          /Warpcast|Farcaster/i.test(navigator.userAgent));

      const hasInjectedWallet = typeof window !== "undefined" && "ethereum" in window;

      let chosen;
      if (preferred === "farcaster") chosen = fc;
      else if (preferred === "injected") chosen = inj;
      else if (preferred === "coinbase") chosen = cb;
      else if (inFarcaster) chosen = fc;
      else if (hasInjectedWallet) chosen = inj;
      else chosen = cb;

      if (!chosen) {
        setMessage("No wallet available. Install a browser wallet or open inside Farcaster.");
        return;
      }
      connect(
        { connector: chosen, chainId: base.id },
        {
          onError: (e) => {
            console.error("wallet connect failed", e);
            setMessage(e.message || "Could not connect wallet");
          },
        },
      );
    },
    [connect, connectors],
  );

  return { connectWallet, isPending, message };
}
