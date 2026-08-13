import { useCallback, useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useAccount, usePublicClient, useWalletClient } from "wagmi";
import { encodeFunctionData, formatEther } from "viem";
import { BadgeCheck, ExternalLink, Loader2, Lock, ShieldCheck, Sparkles } from "lucide-react";
import { MiniAppShell } from "@/components/MiniAppShell";
import { DeployProgress, explainError, type DeployStep } from "@/components/create/DeployProgress";
import { ShareRow } from "@/components/launches/ShareRow";
import { useConnectWallet } from "@/lib/use-connect-wallet";
import { sendSponsoredOrFallback } from "@/lib/sponsored-tx";
import {
  GENESIS,
  GENESIS_ABI,
  GENESIS_TEASER,
  GENESIS_URL,
  basescanAddress,
  basescanTx,
  genesisPhase,
  mintEndsAt,
} from "@/lib/genesis";

export const Route = createFileRoute("/genesis")({
  head: () => ({
    meta: [
      { title: "GENESIS PASS · Resident Labs — Mint on Base" },
      {
        name: "description",
        content:
          "Resident Labs // GENESIS PASS — the first collectible from Resident Labs. Open edition, 0.0005 ETH, 7-day mint window on Base through BaseMint.",
      },
      { property: "og:title", content: "Resident Labs // GENESIS PASS" },
      {
        property: "og:description",
        content:
          "The first collectible from Resident Labs. Minting on Base through BaseMint. 0.0005 ETH · 1 per wallet · 7-day open edition.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: GENESIS_URL }],
  }),
  component: GenesisPage,
});

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/40 px-4 py-3">
      <p className="font-mono text-[10px] uppercase tracking-widest text-white/40">{label}</p>
      <p className="font-display text-base font-bold text-accent">{value}</p>
    </div>
  );
}

function HolderBadge({ owned, preview }: { owned: boolean; preview?: boolean }) {
  return (
    <div
      className={
        "flex items-center gap-3 rounded-2xl border px-4 py-3 " +
        (owned ? "border-accent/50 bg-accent/10" : "border-white/10 bg-white/[0.03] opacity-70")
      }
    >
      <BadgeCheck className={owned ? "size-6 text-accent" : "size-6 text-white/40"} />
      <div className="min-w-0">
        <p className="font-display text-sm font-bold uppercase tracking-widest">Genesis Holder</p>
        <p className="font-mono text-[10px] uppercase tracking-widest text-white/50">
          {owned ? "Verified onchain · Resident Labs 001" : preview ? "Badge preview — mint to unlock" : "Not held yet"}
        </p>
      </div>
    </div>
  );
}

function GenesisPage() {
  const phase = genesisPhase();
  const { address, isConnected, chainId, connector } = useAccount();
  const { connectWallet, message: connectMessage } = useConnectWallet();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();

  const [owned, setOwned] = useState(0);
  const [minted, setMinted] = useState<number | null>(null);
  const [steps, setSteps] = useState<DeployStep[]>([]);
  const [busy, setBusy] = useState(false);
  const [txHash, setTxHash] = useState<`0x${string}` | null>(null);

  const update = useCallback((id: string, patch: Partial<DeployStep>) => {
    setSteps((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  }, []);

  const refresh = useCallback(async () => {
    if (!GENESIS.address || !publicClient) return;
    try {
      const total = await publicClient.readContract({
        address: GENESIS.address,
        abi: GENESIS_ABI,
        functionName: "totalMinted",
      });
      setMinted(Number(total));
    } catch {
      /* contract may not expose totalMinted */
    }
    if (!address) return;
    try {
      const bal = await publicClient.readContract({
        address: GENESIS.address,
        abi: GENESIS_ABI,
        functionName: "balanceOf",
        args: [address],
      });
      setOwned(Number(bal));
    } catch {
      /* noop */
    }
  }, [address, publicClient]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function mint() {
    if (!GENESIS.address) return;
    if (!isConnected) {
      connectWallet();
      return;
    }
    if (!walletClient || !publicClient || !address) return;

    setSteps([
      { id: "chain", label: "Connect to Base mainnet", status: "pending" },
      { id: "sign", label: `Sign & broadcast mint (${GENESIS.priceEth} ETH)`, status: "pending" },
      { id: "confirm", label: "Confirm on Base", status: "pending" },
      { id: "badge", label: "Verify Genesis Holder badge", status: "pending" },
    ]);
    setBusy(true);
    try {
      update("chain", { status: "active" });
      if (chainId !== GENESIS.chainId) {
        try {
          await walletClient.switchChain({ id: GENESIS.chainId });
        } catch (e) {
          const { detail, hint } = explainError(e);
          update("chain", { status: "error", detail, hint });
          return;
        }
      }
      update("chain", { status: "success", detail: "Base mainnet (8453)" });

      update("sign", { status: "active" });
      let hash: `0x${string}`;
      let sponsored = false;
      try {
        const data = encodeFunctionData({
          abi: GENESIS_ABI,
          functionName: "mint",
          args: [address, 1n],
        });
        const res = await sendSponsoredOrFallback({
          walletClient,
          publicClient,
          account: address,
          chainId: GENESIS.chainId,
          connectorId: connector?.id,
          calls: [{ to: GENESIS.address, data, value: GENESIS.priceWei }],
        });
        hash = res.txHash;
        sponsored = res.sponsored;
      } catch (e) {
        const { detail, hint } = explainError(e);
        update("sign", { status: "error", detail, hint });
        return;
      }
      setTxHash(hash);
      update("sign", {
        status: "success",
        txHash: hash,
        detail: sponsored ? "⚡ Sponsored via Base paymaster" : undefined,
      });

      update("confirm", { status: "active" });
      update("confirm", {
        status: "success",
        txHash: hash,
        detail: `Minted 1 × ${GENESIS.shortName}`,
        link: { href: basescanTx(hash), label: "View transaction" },
      });

      update("badge", { status: "active" });
      await refresh();
      update("badge", { status: "success", detail: "Genesis Holder verified onchain" });

      try {
        const { track } = await import("@/lib/analytics");
        void track("mint", { wallet_address: address, coin_address: GENESIS.address });
      } catch {
        /* noop */
      }
    } finally {
      setBusy(false);
    }
  }

  const ends = mintEndsAt();

  return (
    <MiniAppShell>
      <div className="space-y-6 pb-10">
        <header className="space-y-3">
          <p className="font-mono text-[10px] uppercase tracking-widest text-accent">
            Origin Signal Detected //
          </p>
          <h1 className="font-display text-2xl font-bold uppercase tracking-wider">
            {GENESIS.name}
          </h1>
          <p className="text-sm text-white/70">
            {GENESIS.tagline} Minting on Base through BaseMint.
          </p>
          <p className="text-sm leading-relaxed text-white/60">{GENESIS.description}</p>
          <span
            className={
              "inline-flex items-center gap-2 rounded-full border px-3 py-1 font-mono text-[10px] uppercase tracking-widest " +
              (phase === "live"
                ? "border-emerald-400/40 text-emerald-300"
                : phase === "ended"
                  ? "border-white/20 text-white/50"
                  : "border-amber-400/40 text-amber-300")
            }
          >
            <span
              className={
                "size-2 rounded-full " +
                (phase === "live"
                  ? "bg-emerald-400"
                  : phase === "ended"
                    ? "bg-white/40"
                    : "bg-amber-400")
              }
            />
            {phase === "live" ? "Live" : phase === "ended" ? "Mint closed" : "Coming Soon"}
          </span>
        </header>

        <img
          src={GENESIS.artwork}
          alt="Resident Labs GENESIS PASS artwork — a neon access card on black"
          width={1024}
          height={1024}
          className="w-full rounded-3xl border border-white/10"
        />

        <div className="grid grid-cols-2 gap-2">
          <Stat label="Network" value={GENESIS.chainLabel} />
          <Stat label="Price" value={`${GENESIS.priceEth} ETH`} />
          <Stat label="Supply" value={GENESIS.supply} />
          <Stat label="Per wallet" value={`${GENESIS.perWallet}`} />
          <Stat label="Mint window" value={`${GENESIS.windowDays} days`} />
          <Stat label="Minted" value={minted === null ? "—" : String(minted)} />
        </div>

        {ends && (
          <p className="font-mono text-[10px] uppercase tracking-widest text-white/40">
            Window closes {new Date(ends).toLocaleDateString("en-US", { timeZone: "UTC", month: "short", day: "numeric", year: "numeric" })} UTC
          </p>
        )}

        <section className="space-y-3">
          <h2 className="font-display text-lg font-bold uppercase tracking-widest">Mint</h2>
          {GENESIS.address ? (
            <>
              <button
                onClick={mint}
                disabled={busy || phase !== "live" || owned >= GENESIS.perWallet}
                className="w-full rounded-2xl bg-accent py-4 font-bold uppercase tracking-widest text-sm text-accent-foreground disabled:opacity-60 inline-flex items-center justify-center gap-2"
              >
                {busy && <Loader2 className="size-4 animate-spin" />}
                {!isConnected
                  ? "Connect Wallet"
                  : owned >= GENESIS.perWallet
                    ? "Already minted"
                    : phase === "ended"
                      ? "Mint closed"
                      : busy
                        ? "Minting…"
                        : `Mint · ${GENESIS.priceEth} ETH`}
              </button>
              {connectMessage && <p className="text-xs text-white/60">{connectMessage}</p>}
              <DeployProgress steps={steps} onRetry={mint} />
              <div className="grid gap-2">
                <a
                  href={basescanAddress(GENESIS.address)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-xs font-bold uppercase tracking-widest hover:border-accent/40"
                >
                  <ExternalLink className="size-3.5" /> Contract on Basescan
                </a>
                {txHash && (
                  <a
                    href={basescanTx(txHash)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 font-mono text-[10px] uppercase tracking-widest hover:border-accent/40"
                  >
                    <ExternalLink className="size-3.5" /> Tx {txHash.slice(0, 10)}…
                  </a>
                )}
              </div>
              <p className="font-mono text-[10px] uppercase tracking-widest text-white/40">
                Ownership: {owned > 0 ? `${owned} held` : "none yet"} ·{" "}
                {isConnected
                  ? `${address?.slice(0, 6)}…${address?.slice(-4)}`
                  : "wallet not connected"}
              </p>
            </>
          ) : (
            <div className="space-y-3 rounded-2xl border border-amber-400/30 bg-amber-400/5 p-4">
              <p className="inline-flex items-center gap-2 font-display text-sm font-bold uppercase tracking-widest text-amber-300">
                <Lock className="size-4" /> Coming Soon
              </p>
              <p className="text-sm text-white/70">
                The mint configuration is locked: Base network, {GENESIS.priceEth} ETH, open
                edition for {GENESIS.windowDays} days, {GENESIS.perWallet} per wallet. The Mint
                button activates the moment the GENESIS PASS contract goes live on Base.
              </p>
              <button
                onClick={() => (isConnected ? undefined : connectWallet())}
                className="w-full rounded-2xl border border-white/15 bg-white/5 py-3 text-xs font-bold uppercase tracking-widest"
              >
                {isConnected
                  ? `Wallet ready · ${address?.slice(0, 6)}…${address?.slice(-4)}`
                  : "Connect wallet to get ready"}
              </button>
              {connectMessage && <p className="text-xs text-white/60">{connectMessage}</p>}
            </div>
          )}
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-lg font-bold uppercase tracking-widest">Holder badge</h2>
          <HolderBadge owned={owned > 0} preview={owned === 0} />
          <ul className="space-y-2">
            {GENESIS.benefits.map((b) => (
              <li key={b} className="flex items-start gap-2 text-sm text-white/70">
                <Sparkles className="mt-0.5 size-3.5 shrink-0 text-accent" />
                {b}
              </li>
            ))}
          </ul>
          <p className="inline-flex items-start gap-2 rounded-2xl border border-white/10 bg-black/40 p-3 text-xs text-white/55">
            <ShieldCheck className="mt-0.5 size-4 shrink-0 text-white/40" />
            GENESIS PASS is early-supporter recognition, not a promise of future access. Any holder
            features are possible, not guaranteed.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-lg font-bold uppercase tracking-widest">Share</h2>
          <pre className="whitespace-pre-wrap rounded-2xl border border-white/10 bg-black/40 p-4 font-mono text-[11px] leading-relaxed text-white/70">
            {GENESIS_TEASER}
          </pre>
          <ShareRow text={GENESIS_TEASER} url={GENESIS_URL} />
          {!GENESIS.address && (
            <p className="font-mono text-[10px] uppercase tracking-widest text-white/40">
              Teaser only — hold the full graphic until the mint is tested end to end.
            </p>
          )}
        </section>

        {GENESIS.address && minted !== null && (
          <p className="font-mono text-[10px] uppercase tracking-widest text-white/35">
            Price onchain check · {formatEther(GENESIS.priceWei)} ETH
          </p>
        )}
      </div>
    </MiniAppShell>
  );
}
