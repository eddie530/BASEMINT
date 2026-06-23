import { useState, useCallback } from "react";
import { useConnect } from "wagmi";
import { base } from "wagmi/chains";

export function useConnectWallet() {
  const { connect, connectors, isPending } = useConnect();
  const [message, setMessage] = useState<string>();

  const connectWallet = useCallback(() => {
    setMessage(undefined);
    const fc = connectors.find((c) => c.id === "farcasterMiniApp" || c.id === "farcaster");
    const inj = connectors.find((c) => c.type === "injected");

    const inFarcaster =
      typeof window !== "undefined" &&
      (Boolean((window as unknown as { ReactNativeWebView?: unknown }).ReactNativeWebView) ||
        /Warpcast|Farcaster/i.test(navigator.userAgent));

    const hasInjectedWallet = typeof window !== "undefined" && "ethereum" in window;
    const chosen = inFarcaster ? fc : hasInjectedWallet ? inj : undefined;

    if (!chosen) {
      setMessage("Open in Farcaster, or install a browser wallet to connect here.");
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
  }, [connect, connectors]);

  return { connectWallet, isPending, message };
}
