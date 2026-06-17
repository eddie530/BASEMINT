import { Link } from "@tanstack/react-router";
import { useAccount, useConnect, useDisconnect } from "wagmi";

function shortAddr(a?: string) {
  if (!a) return "";
  return `${a.slice(0, 5)}…${a.slice(-3)}`;
}

export function AppHeader() {
  const { address, isConnected } = useAccount();
  const { connect, connectors, isPending, error } = useConnect();
  const { disconnect } = useDisconnect();

  const handleConnect = () => {
    // Prefer Farcaster connector when running inside a Farcaster client,
    // otherwise fall back to an injected browser wallet (MetaMask, Rabby, etc.).
    const fc = connectors.find((c) => c.id === "farcasterMiniApp" || c.id === "farcaster");
    const inj = connectors.find((c) => c.type === "injected");
    const inFarcaster =
      typeof window !== "undefined" &&
      (window.parent !== window || /Warpcast|Farcaster/i.test(navigator.userAgent));
    const chosen = (inFarcaster && fc) || inj || fc || connectors[0];
    if (!chosen) {
      alert("No wallet available. Install MetaMask or open this app inside Farcaster.");
      return;
    }
    connect(
      { connector: chosen },
      {
        onError: (e) => {
          console.error("wallet connect failed", e);
          alert(e.message || "Could not connect wallet");
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
          title={error?.message}
          className="px-3 py-1.5 rounded-full bg-accent text-accent-foreground text-[11px] font-bold uppercase tracking-wider disabled:opacity-50"
        >
          {isPending ? "…" : "Connect"}
        </button>
      )}
    </header>
  );
}
