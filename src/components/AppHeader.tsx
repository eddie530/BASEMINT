import { Link } from "@tanstack/react-router";
import basemintIcon from "@/assets/basemint-icon.png.asset.json";
import { useState } from "react";
import { useAccount, useDisconnect } from "wagmi";
import { useConnectWallet } from "@/lib/use-connect-wallet";

function shortAddr(a?: string) {
  if (!a) return "";
  return `${a.slice(0, 5)}…${a.slice(-3)}`;
}

export function AppHeader() {
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const { connectWith, isPending, message } = useConnectWallet();
  const [open, setOpen] = useState(false);

  const hasInjected = typeof window !== "undefined" && "ethereum" in window;

  return (
    <header className="sticky top-0 z-30 bg-black/80 backdrop-blur-md border-b border-white/5 px-4 py-3 flex items-center justify-between">
      <Link to="/" className="flex items-center gap-2" aria-label="Basemint — Mint on Base">
        <img
          src={basemintIcon.url}
          alt=""
          className="size-8 rounded-full object-cover"
          aria-hidden="true"
        />
        <h1 className="font-display font-bold text-lg tracking-tight">Basemint — Mint on Base</h1>
      </Link>

      {isConnected ? (
        <button
          onClick={() => disconnect()}
          className="px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-[11px] font-mono text-white/80 hover:bg-white/10 transition"
        >
          {shortAddr(address)}
        </button>
      ) : (
        <div className="relative">
          <button
            onClick={() => setOpen((o) => !o)}
            disabled={isPending}
            className="px-3 py-1.5 rounded-full bg-accent text-accent-foreground text-[11px] font-bold uppercase tracking-wider disabled:opacity-50"
          >
            {isPending ? "…" : "Connect"}
          </button>
          {open ? (
            <div className="absolute right-0 mt-2 w-56 rounded-xl border border-white/10 bg-black/95 p-2 shadow-xl z-40">
              {hasInjected ? (
                <MenuItem
                  label="Browser wallet"
                  hint="MetaMask, Rabby, …"
                  onClick={() => {
                    setOpen(false);
                    connectWith("injected");
                  }}
                />
              ) : null}
              <MenuItem
                label="Base Account"
                hint="Smart Wallet · passkey, no install"
                onClick={() => {
                  setOpen(false);
                  connectWith("coinbase");
                }}
              />
              <MenuItem
                label="Farcaster"
                hint="Inside Warpcast only"
                onClick={() => {
                  setOpen(false);
                  connectWith("farcaster");
                }}
              />
              {message ? (
                <p className="px-3 py-2 text-[11px] leading-snug text-white/60">{message}</p>
              ) : null}
            </div>
          ) : null}
          {message && !open ? (
            <div className="absolute right-0 top-12 max-w-[260px] rounded-md border border-white/10 bg-black/95 px-3 py-2 text-[11px] leading-snug text-white/80 shadow-lg">
              {message}
            </div>
          ) : null}
        </div>
      )}
    </header>
  );
}

function MenuItem({ label, hint, onClick }: { label: string; hint: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left px-3 py-2 rounded-lg hover:bg-white/5 transition"
    >
      <p className="text-sm font-semibold text-white">{label}</p>
      <p className="text-[10px] uppercase tracking-widest text-white/40 font-mono">{hint}</p>
    </button>
  );
}
