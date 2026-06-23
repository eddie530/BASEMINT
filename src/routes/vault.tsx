import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { MiniAppShell } from "@/components/MiniAppShell";
import { useAccount, useBalance, useDisconnect } from "wagmi";
import { getHoldings } from "@/lib/zora.functions";
import { useConnectWallet } from "@/lib/use-connect-wallet";

export const Route = createFileRoute("/vault")({
  head: () => ({
    meta: [
      { title: "Vault · Basemint" },
      { name: "description", content: "Your Zora coins and Base holdings, live." },
      { property: "og:title", content: "Vault · Basemint" },
      { property: "og:description", content: "Your Zora coins and Base holdings, live." },
      { property: "og:url", content: "https://foxy-token-forge.lovable.app/vault" },
    ],
    links: [{ rel: "canonical", href: "https://foxy-token-forge.lovable.app/vault" }],
  }),
  component: VaultPage,
});

function VaultPage() {
  const { address, isConnected } = useAccount();
  const { data: bal } = useBalance({ address });
  const { connectWallet, isPending, message } = useConnectWallet();
  const { disconnect } = useDisconnect();

  const holdingsQuery = useQuery({
    queryKey: ["holdings", address?.toLowerCase()],
    queryFn: () => getHoldings({ data: { address: address!, count: 24 } }),
    enabled: Boolean(address),
    staleTime: 30_000,
  });

  if (!isConnected) {
    return (
      <MiniAppShell>
        <div className="mt-12 text-center space-y-5">
          <h1 className="font-display font-bold text-3xl uppercase">Connect</h1>
          <p className="text-white/60 text-sm max-w-xs mx-auto">
            Sign in with your Farcaster wallet to see your coins and collected NFTs.
          </p>
          <button
            onClick={connectWallet}
            disabled={isPending}
            className="bg-accent text-accent-foreground px-8 py-4 rounded-2xl font-bold uppercase tracking-widest text-sm disabled:opacity-60"
          >
            {isPending ? "Connecting…" : "Connect Wallet"}
          </button>
          {message && <p className="text-xs text-white/60 max-w-xs mx-auto">{message}</p>}
        </div>
      </MiniAppShell>
    );
  }

  const holdings = holdingsQuery.data ?? [];

  return (
    <MiniAppShell>
      <h1 className="sr-only">Your Vault</h1>
      <section className="bg-card rounded-3xl p-5 border border-white/5">
        <p className="text-[10px] uppercase tracking-widest text-white/40 font-mono">Balance</p>
        <p className="font-display font-bold text-3xl mt-1">
          {bal ? (Number(bal.value) / 10 ** bal.decimals).toFixed(4) : "0.0000"}{" "}
          <span className="text-accent text-base">{bal?.symbol ?? "ETH"}</span>
        </p>
        <p className="text-[11px] text-white/40 font-mono mt-2 break-all">{address}</p>
        <div className="mt-4 flex flex-wrap gap-3 text-[11px] uppercase tracking-widest">
          {address && (
            <Link to="/profile/$address" params={{ address }} className="text-accent hover:underline">
              View profile
            </Link>
          )}
          <Link to="/dashboard" className="text-accent hover:underline">
            Dashboard
          </Link>
          <button onClick={() => disconnect()} className="text-white/50 hover:text-white">
            Disconnect
          </button>
        </div>
      </section>

      <section>
        <h2 className="font-display font-bold text-lg uppercase tracking-wider mb-3">Holdings</h2>
        {holdingsQuery.isLoading ? (
          <p className="text-white/40 text-sm font-mono">Loading…</p>
        ) : holdings.length === 0 ? (
          <p className="text-white/40 text-sm font-mono">No Zora coins held on this address yet.</p>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {holdings.map((i) => (
              <Link
                key={i.address}
                to="/coin/$id"
                params={{ id: i.address }}
                className="bg-card border border-white/5 rounded-2xl p-3 hover:border-white/15 transition"
              >
                <img src={i.image} alt={i.name} className="w-full aspect-square rounded-xl object-cover" loading="lazy" />
                <p className="font-bold text-sm mt-2 truncate">{i.name}</p>
                <p className="text-[11px] text-white/40 font-mono truncate">${i.symbol}</p>
              </Link>
            ))}
          </div>
        )}
      </section>
    </MiniAppShell>
  );
}
