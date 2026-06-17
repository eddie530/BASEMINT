import { Link } from "@tanstack/react-router";
import { useAccount, useConnect, useDisconnect } from "wagmi";

function shortAddr(a?: string) {
  if (!a) return "";
  return `${a.slice(0, 5)}…${a.slice(-3)}`;
}

export function AppHeader() {
  const { address, isConnected } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const connector = connectors[0];

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
          onClick={() => connector && connect({ connector })}
          disabled={isPending}
          className="px-3 py-1.5 rounded-full bg-accent text-accent-foreground text-[11px] font-bold uppercase tracking-wider disabled:opacity-50"
        >
          {isPending ? "…" : "Connect"}
        </button>
      )}
    </header>
  );
}
