import { createFileRoute } from "@tanstack/react-router";
import { MiniAppShell } from "@/components/MiniAppShell";
import { useAccount, useBalance, useConnect, useDisconnect } from "wagmi";
import { trendingFeed } from "@/lib/mock-data";

export const Route = createFileRoute("/vault")({
  head: () => ({
    meta: [
      { title: "Vault · Basemint" },
      { name: "description", content: "Your coins and NFTs on Base." },
    ],
  }),
  component: VaultPage,
});

function VaultPage() {
  const { address, isConnected } = useAccount();
  const { data: bal } = useBalance({ address });
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();

  if (!isConnected) {
    return (
      <MiniAppShell>
        <div className="mt-12 text-center space-y-5">
          <h1 className="font-display font-bold text-3xl uppercase">Connect</h1>
          <p className="text-white/60 text-sm max-w-xs mx-auto">
            Sign in with your Farcaster wallet to see your coins and collected NFTs.
          </p>
          <button
            onClick={() => {
              const c = connectors[0];
              if (c) connect({ connector: c });
            }}
            disabled={isPending}
            className="bg-accent text-accent-foreground px-8 py-4 rounded-2xl font-bold uppercase tracking-widest text-sm disabled:opacity-60"
          >
            {isPending ? "Connecting…" : "Connect Wallet"}
          </button>
        </div>
      </MiniAppShell>
    );
  }

  return (
    <MiniAppShell>
      <section className="bg-card rounded-3xl p-5 border border-white/5">
        <p className="text-[10px] uppercase tracking-widest text-white/40 font-mono">Balance</p>
        <p className="font-display font-bold text-3xl mt-1">
          {bal ? (Number(bal.value) / 10 ** bal.decimals).toFixed(4) : "0.0000"}{" "}
          <span className="text-accent text-base">{bal?.symbol ?? "ETH"}</span>
        </p>
        <p className="text-[11px] text-white/40 font-mono mt-2 break-all">{address}</p>
        <button
          onClick={() => disconnect()}
          className="mt-4 text-[11px] uppercase tracking-widest text-white/50 hover:text-white"
        >
          Disconnect
        </button>
      </section>

      <section>
        <h2 className="font-display font-bold text-lg uppercase tracking-wider mb-3">Holdings</h2>
        <div className="grid grid-cols-2 gap-3">
          {trendingFeed.slice(0, 2).map((i) => (
            <div key={i.id} className="bg-card border border-white/5 rounded-2xl p-3">
              <img src={i.image} alt="" className="w-full aspect-square rounded-xl object-cover" />
              <p className="font-bold text-sm mt-2 truncate">{i.name}</p>
              <p className="text-[11px] text-white/40 font-mono">
                {i.kind === "coin" ? `$${i.symbol}` : "Edition"}
              </p>
            </div>
          ))}
        </div>
      </section>
    </MiniAppShell>
  );
}
