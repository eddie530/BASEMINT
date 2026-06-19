import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { useAccount, useConnect, useDisconnect } from "wagmi";
import { base } from "wagmi/chains";

function shortAddr(a?: string) {
  if (!a) return "";
  return `${a.slice(0, 5)}…${a.slice(-3)}`;
}

export function AppHeader() {
  const { address, isConnected } = useAccount();
  const { connect, connectors, isPending, error } = useConnect();
  const { disconnect } = useDisconnect();
  const [connectMessage, setConnectMessage] = useState<string>();

  const handleConnect = async () => {
    setConnectMessage(undefined);
    const fc = connectors.find((c) => c.id === "farcasterMiniApp" || c.id === "farcaster");
    const inj = connectors.find((c) => c.type === "injected");

    const inFarcaster =
      typeof window !== "undefined" &&
      (Boolean(window.ReactNativeWebView) || /Warpcast|Farcaster/i.test(navigator.userAgent));

    const hasInjectedWallet = typeof window !== "undefined" && "ethereum" in window;
    const chosen = inFarcaster ? fc : hasInjectedWallet ? inj : undefined;

    if (!chosen) {
      setConnectMessage("Open in Farcaster, or install a browser wallet to connect here.");
      return;
    }
    connect(
      { connector: chosen, chainId: base.id },
      {
        onError: (e) => {
          console.error("wallet connect failed", e);
          setConnectMessage(e.message || "Could not connect wallet");
        },
      }
    );
  };

  return (
    <header className="sticky top-0 z-30 bg-black/80 backdrop-blur-md border-b border-white/5 px-4 py-3 flex items-center justify-between">
      <Link to="/" className="flex items-center gap-2">
        <div className="size-8 bg-primary rounded-full grid place-items-center font-bold text-xs text-white">B</div>
        <h1 className="font-display font-bold text-lg tracking-tight">BASEMINT</h1>
      </Link>

      {isConnected ? (
        <button
          onClick={() => disconnect()}
          className="px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-[11px] font-mono text-white/80 hover:bg-white/10 transition"
        >
          {shortAddr(address)}
        </button>
      ) : (
        <button
          onClick={handleConnect}
          disabled={isPending}
          title={connectMessage || error?.message}
          className="px-3 py-1.5 rounded-full bg-accent text-accent-foreground text-[11px] font-bold uppercase tracking-wider disabled:opacity-50"
        >
          {isPending ? "…" : "Connect"}
        </button>
      )}
      {connectMessage ? (
        <div className="absolute right-4 top-14 max-w-[260px] rounded-md border border-white/10 bg-black/95 px-3 py-2 text-[11px] leading-snug text-white/80 shadow-lg">
          {connectMessage}
        </div>
      ) : null}
    </header>
  );
}
