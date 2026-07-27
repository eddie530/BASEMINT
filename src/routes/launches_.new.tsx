import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAccount, usePublicClient, useWalletClient } from "wagmi";
import { AlertTriangle, ArrowLeft, ArrowRight, Check, Copy, ExternalLink, Loader2, Upload } from "lucide-react";
import { MiniAppShell } from "@/components/MiniAppShell";
import { FeaturedLaunchHero } from "@/components/launches/FeaturedLaunchHero";
import { ShareRow } from "@/components/launches/ShareRow";
import { DeployProgress, explainError, type DeployStep } from "@/components/create/DeployProgress";
import { useConnectWallet } from "@/lib/use-connect-wallet";
import { getLaunchReadiness } from "@/lib/launch-readiness.functions";
import {
  draftToLaunch,
  farcasterPost,
  saveDraft,
  slugify,
  xPost,
  type LaunchDraft,
} from "@/lib/launch-drafts";
import {
  LAUNCH_COLLECTIONS,
  collectionLabel,
  launchUrl,
  type LaunchCollection,
} from "@/lib/resident-launches";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/launches_/new")({
  head: () => ({
    meta: [
      { title: "New Launch — Resident Labs Launch Wizard" },
      {
        name: "description",
        content:
          "Deploy a Resident Labs creator coin on Base: artwork, name, ticker, description, collection, preview, on-chain launch, and social post.",
      },
      { property: "og:title", content: "New Launch — Resident Labs Launch Wizard" },
      {
        property: "og:description",
        content: "Deploy a Resident Labs creator coin on Base in seven steps.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LaunchWizard,
});

const STEPS = [
  "Artwork",
  "Name",
  "Ticker",
  "Description",
  "Collection",
  "Preview",
  "Launch",
] as const;

const inputCls =
  "w-full rounded-xl border border-white/10 bg-black/50 px-3 py-3 text-sm outline-none placeholder:text-white/25 focus:border-accent/50";

const BASE_CHAIN_ID = 8453;

function useSteps() {
  const [steps, setSteps] = useState<DeployStep[]>([]);
  const reset = (s: DeployStep[]) => setSteps(s);
  const update = (id: string, patch: Partial<DeployStep>) =>
    setSteps((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  return { steps, reset, update };
}

function LaunchWizard() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [image, setImage] = useState("");
  const [name, setName] = useState("");
  const [ticker, setTicker] = useState("");
  const [description, setDescription] = useState("");
  const [collection, setCollection] = useState<LaunchCollection>("Signals");
  const [featured, setFeatured] = useState(true);
  const [published, setPublished] = useState<LaunchDraft | null>(null);
  const [copied, setCopied] = useState<"fc" | "x" | null>(null);
  const [busy, setBusy] = useState(false);

  const { steps: deploySteps, reset: resetSteps, update } = useSteps();
  const { isConnected, address, chainId } = useAccount();
  const { connectWallet, message: connectMessage } = useConnectWallet();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();

  const { data: readiness } = useQuery({
    queryKey: ["launch-readiness"],
    queryFn: () => getLaunchReadiness(),
    staleTime: 60_000,
  });

  const draft = useMemo<LaunchDraft>(
    () => ({
      slug: slugify(name || ticker || "launch"),
      name: name || "Untitled Resident Launch",
      ticker: (ticker || "TBD").toUpperCase(),
      collection,
      description: description || "A new Resident Labs creator coin on Base.",
      image,
      tags: ["residentlabs", "base", collection.toLowerCase()],
      launchDate: new Date().toISOString().slice(0, 10),
      createdAt: new Date().toISOString(),
      featured,
    }),
    [name, ticker, collection, description, image, featured],
  );

  const previewDraft = published ?? draft;
  const preview = useMemo(() => draftToLaunch(previewDraft), [previewDraft]);
  const url = launchUrl(preview);
  const fcPost = farcasterPost(previewDraft, url);
  const twPost = xPost(previewDraft, url);

  const canAdvance =
    (step === 0 && Boolean(image)) ||
    (step === 1 && name.trim().length > 1) ||
    (step === 2 && ticker.trim().length > 0) ||
    (step === 3 && description.trim().length > 9) ||
    step === 4 ||
    step === 5 ||
    step === 6;

  function onFile(file?: File | null) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setImage(String(reader.result));
    reader.readAsDataURL(file);
  }

  /**
   * Real end-to-end launch: build Zora create-coin calldata on the server,
   * sign with the connected wallet on Base, wait for the receipt, then persist
   * the launch with its coin address + tx hash. No local-only fallback.
   */
  async function launchOnchain() {
    if (!isConnected) {
      connectWallet();
      return;
    }
    if (!readiness?.ready) return;

    const initial: DeployStep[] = [
      { id: "wallet", label: "Wallet ready", status: "pending" },
      { id: "chain", label: "Switch to Base mainnet", status: "pending" },
      { id: "calldata", label: "Upload metadata + build calldata", status: "pending" },
      { id: "sign", label: "Confirm in wallet", status: "pending" },
      { id: "confirm", label: "Wait for Base receipt", status: "pending" },
      { id: "persist", label: "Publish to Launch Hub", status: "pending" },
    ];
    resetSteps(initial);
    setBusy(true);

    try {
      if (!walletClient || !publicClient || !address) {
        update("wallet", {
          status: "error",
          detail: "Wallet client unavailable.",
          hint: "Reconnect your wallet and try again.",
        });
        return;
      }
      update("wallet", { status: "success", detail: `${address.slice(0, 6)}…${address.slice(-4)}` });

      update("chain", { status: "active" });
      if (chainId !== BASE_CHAIN_ID) {
        try {
          await walletClient.switchChain({ id: BASE_CHAIN_ID });
        } catch (e) {
          const { detail, hint } = explainError(e);
          update("chain", { status: "error", detail, hint });
          return;
        }
      }
      update("chain", { status: "success", detail: "Base mainnet (8453)" });

      update("calldata", { status: "active" });
      let prepared;
      try {
        const { buildCreateCoinCalls } = await import("@/lib/zora-create.functions");
        prepared = await buildCreateCoinCalls({
          data: {
            creator: address,
            name: draft.name.slice(0, 64),
            symbol: draft.ticker,
            description: draft.description.slice(0, 500),
            imageDataUri: image,
            currency: "ZORA",
            chainId: BASE_CHAIN_ID,
          },
        });
      } catch (e) {
        const { detail, hint } = explainError(e);
        update("calldata", { status: "error", detail, hint });
        return;
      }
      update("calldata", {
        status: "success",
        detail: `${prepared.calls.length} call(s) · ${prepared.predictedCoinAddress?.slice(0, 10) ?? "—"}…`,
      });

      update("sign", { status: "active" });
      let lastHash: `0x${string}` | undefined;
      try {
        for (const call of prepared.calls) {
          lastHash = await walletClient.sendTransaction({
            to: call.to,
            data: call.data,
            value: BigInt(call.value),
          });
        }
      } catch (e) {
        const { detail, hint } = explainError(e);
        update("sign", { status: "error", detail, hint });
        return;
      }
      update("sign", { status: "success", txHash: lastHash });

      update("confirm", { status: "active" });
      let coinAddress = prepared.predictedCoinAddress as string | undefined;
      try {
        if (lastHash) {
          const receipt = await publicClient.waitForTransactionReceipt({ hash: lastHash });
          if (receipt.status !== "success") {
            update("confirm", {
              status: "error",
              detail: "Transaction reverted on Base.",
              hint: "Check the transaction on Basescan and try again.",
            });
            return;
          }
        }
      } catch (e) {
        const { detail, hint } = explainError(e);
        update("confirm", { status: "error", detail, hint });
        return;
      }
      update("confirm", { status: "success", txHash: lastHash });

      if (!coinAddress) {
        update("persist", {
          status: "error",
          detail: "Coin address missing from Zora response.",
          hint: "The transaction confirmed — find it on Basescan and add the address manually.",
        });
        return;
      }

      update("persist", { status: "active" });
      const launched: LaunchDraft = { ...draft, address: coinAddress, txHash: lastHash };
      saveDraft(launched);
      setPublished(launched);
      update("persist", {
        status: "success",
        detail: `${coinAddress.slice(0, 10)}… · Live`,
        link: { href: `/coin/${coinAddress}`, label: "View coin" },
      });
      try {
        const { writeLastAction } = await import("@/lib/last-action");
        writeLastAction({
          kind: "create_coin",
          ref: coinAddress,
          label: launched.name,
          sub: `$${launched.ticker}`,
          href: `/coin/${coinAddress}`,
        });
      } catch {
        /* non-fatal */
      }
    } finally {
      setBusy(false);
    }
  }

  async function copyPost(kind: "fc" | "x") {
    try {
      await navigator.clipboard.writeText(kind === "fc" ? fcPost : twPost);
      setCopied(kind);
      setTimeout(() => setCopied(null), 1800);
    } catch {
      /* noop */
    }
  }

  return (
    <MiniAppShell>
      <header className="space-y-1">
        <Link
          to="/launches"
          className="inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-widest text-white/40"
        >
          <ArrowLeft className="size-3" /> Launch Hub
        </Link>
        <h1 className="font-display text-3xl font-bold tracking-tight">New Launch</h1>
        <p className="text-sm text-white/60">
          Seven steps to a live Resident Labs creator coin on Base.
        </p>
      </header>

      <ol className="grid grid-cols-7 gap-1">
        {STEPS.map((s, i) => (
          <li key={s} className="space-y-1">
            <div
              className={cn(
                "h-1 rounded-full",
                i <= step ? "bg-accent" : "bg-white/10",
              )}
            />
            <p className="truncate font-mono text-[8px] uppercase tracking-widest text-white/35">
              {s}
            </p>
          </li>
        ))}
      </ol>

      <section className="space-y-4 rounded-2xl border border-white/10 bg-black/40 p-4">
        {step === 0 && (
          <div className="space-y-3">
            <h2 className="font-display text-lg font-bold uppercase tracking-widest">
              Upload artwork
            </h2>
            <label className="flex aspect-square cursor-pointer items-center justify-center overflow-hidden rounded-2xl border border-dashed border-white/15 bg-white/[0.02]">
              {image ? (
                <img src={image} alt="Launch artwork preview" className="h-full w-full object-cover" />
              ) : (
                <span className="inline-flex flex-col items-center gap-2 text-white/40">
                  <Upload className="size-6" />
                  <span className="font-mono text-[10px] uppercase tracking-widest">
                    Choose image
                  </span>
                </span>
              )}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => onFile(e.target.files?.[0])}
              />
            </label>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-3">
            <h2 className="font-display text-lg font-bold uppercase tracking-widest">Coin name</h2>
            <input
              className={inputCls}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Resident Labs // SIGNAL-002"
            />
          </div>
        )}

        {step === 2 && (
          <div className="space-y-3">
            <h2 className="font-display text-lg font-bold uppercase tracking-widest">Ticker</h2>
            <input
              className={cn(inputCls, "font-mono uppercase")}
              value={ticker}
              maxLength={11}
              onChange={(e) => setTicker(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
              placeholder="SIG002"
            />
          </div>
        )}

        {step === 3 && (
          <div className="space-y-3">
            <h2 className="font-display text-lg font-bold uppercase tracking-widest">
              Description
            </h2>
            <textarea
              className={cn(inputCls, "min-h-32 resize-y leading-relaxed")}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What this release documents…"
            />
          </div>
        )}

        {step === 4 && (
          <div className="space-y-3">
            <h2 className="font-display text-lg font-bold uppercase tracking-widest">Collection</h2>
            <div className="grid gap-2">
              {LAUNCH_COLLECTIONS.map((c) => (
                <button
                  key={c}
                  onClick={() => setCollection(c)}
                  className={cn(
                    "rounded-xl border px-3 py-3 text-left text-sm font-bold",
                    collection === c
                      ? "border-accent/50 bg-accent/10 text-accent"
                      : "border-white/10 bg-white/[0.02] text-white/70",
                  )}
                >
                  {collectionLabel(c)}
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 5 && (
          <div className="space-y-3">
            <h2 className="font-display text-lg font-bold uppercase tracking-widest">
              Preview launch page
            </h2>
            <FeaturedLaunchHero launch={preview} />
          </div>
        )}

        {step === 6 && (
          <div className="space-y-4">
            <h2 className="font-display text-lg font-bold uppercase tracking-widest">
              {published?.address ? "Live on Base" : "Launch on Base"}
            </h2>

            {readiness && !readiness.ready && (
              <div className="space-y-2 rounded-xl border border-amber-400/30 bg-amber-400/10 p-3 text-xs text-amber-200">
                <p className="inline-flex items-center gap-2 font-bold uppercase tracking-widest">
                  <AlertTriangle className="size-3.5" /> Setup required
                </p>
                <p className="text-amber-200/80">
                  The launch can’t be created on-chain until these are configured in Project
                  Settings → Secrets:
                </p>
                <ul className="list-disc space-y-1 pl-4 font-mono">
                  {readiness.missing.map((m) => (
                    <li key={m}>{m}</li>
                  ))}
                </ul>
              </div>
            )}

            {published?.address ? (
              <>
                <p className="inline-flex items-center gap-2 text-sm text-accent">
                  <Check className="size-4" /> {published.name} is live
                  {published.featured ? " and featured on the homepage." : "."}
                </p>
                <div className="space-y-1 rounded-xl border border-white/10 bg-black/60 p-3 font-mono text-[11px] text-white/70">
                  <p className="break-all">Coin: {published.address}</p>
                  {published.txHash && <p className="break-all">Tx: {published.txHash}</p>}
                </div>
                <div className="grid gap-2">
                  <button
                    onClick={() => navigate({ to: "/coin/$id", params: { id: published.address! } })}
                    className="w-full rounded-2xl bg-accent py-3 text-sm font-bold uppercase tracking-widest text-accent-foreground"
                  >
                    Collect
                  </button>
                  <a
                    href={`https://basescan.org/token/${published.address}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="launch-glow inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 py-3 text-xs font-bold uppercase tracking-widest"
                  >
                    View onchain <ExternalLink className="size-3.5" />
                  </a>
                </div>

                <div className="space-y-2">
                  <p className="font-mono text-[10px] uppercase tracking-widest text-white/40">
                    Farcaster post
                  </p>
                  <pre className="whitespace-pre-wrap rounded-xl border border-white/10 bg-black/60 p-3 text-xs leading-relaxed text-white/70">
                    {fcPost}
                  </pre>
                  <button
                    onClick={() => copyPost("fc")}
                    className="launch-glow inline-flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 py-3 text-xs font-bold uppercase tracking-widest"
                  >
                    {copied === "fc" ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
                    {copied === "fc" ? "Copied" : "Copy Farcaster post"}
                  </button>
                </div>

                <div className="space-y-2">
                  <p className="font-mono text-[10px] uppercase tracking-widest text-white/40">
                    X post
                  </p>
                  <pre className="whitespace-pre-wrap rounded-xl border border-white/10 bg-black/60 p-3 text-xs leading-relaxed text-white/70">
                    {twPost}
                  </pre>
                  <button
                    onClick={() => copyPost("x")}
                    className="launch-glow inline-flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 py-3 text-xs font-bold uppercase tracking-widest"
                  >
                    {copied === "x" ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
                    {copied === "x" ? "Copied" : "Copy X post"}
                  </button>
                </div>

                <ShareRow url={url} text={fcPost} />

                <button
                  onClick={() => navigate({ to: "/" })}
                  className="launch-glow w-full rounded-2xl border border-white/10 bg-white/5 py-3 text-xs font-bold uppercase tracking-widest"
                >
                  View on homepage
                </button>
              </>
            ) : (
              <>
                <p className="text-sm text-white/60">
                  Deploying creates {draft.name} (${draft.ticker}) as a real Zora creator coin on
                  Base mainnet. You’ll confirm one transaction in your wallet and pay gas.
                </p>
                <button
                  onClick={() => setFeatured((f) => !f)}
                  className={cn(
                    "launch-glow flex w-full items-center justify-between rounded-xl border px-3 py-3 text-left text-sm font-bold",
                    featured
                      ? "border-accent/50 bg-accent/10 text-accent"
                      : "border-white/10 bg-white/[0.02] text-white/70",
                  )}
                >
                  Feature on homepage
                  <span className="font-mono text-[10px] uppercase tracking-widest">
                    {featured ? "On" : "Off"}
                  </span>
                </button>

                {deploySteps.length > 0 && (
                  <DeployProgress steps={deploySteps} onRetry={launchOnchain} />
                )}
                {connectMessage && <p className="text-xs text-amber-300">{connectMessage}</p>}
                {!image && (
                  <p className="text-xs text-amber-300">
                    Artwork is required — go back to step 1 and upload an image.
                  </p>
                )}

                <button
                  onClick={launchOnchain}
                  disabled={busy || !image || (readiness ? !readiness.ready : false)}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-accent py-4 text-sm font-bold uppercase tracking-widest text-accent-foreground disabled:opacity-50"
                >
                  {busy && <Loader2 className="size-4 animate-spin" />}
                  {!isConnected
                    ? "Connect wallet"
                    : busy
                      ? "Launching…"
                      : "Launch on Base"}
                </button>
              </>
            )}
          </div>
        )}
      </section>

      {!published?.address && (
        <div className="grid grid-cols-2 gap-2">
          <button
            disabled={step === 0 || busy}
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            className="rounded-2xl border border-white/10 bg-white/5 py-3 text-xs font-bold uppercase tracking-widest disabled:opacity-30"
          >
            Back
          </button>
          <button
            disabled={!canAdvance || step === STEPS.length - 1 || busy}
            onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))}
            className="inline-flex items-center justify-center gap-1.5 rounded-2xl bg-accent py-3 text-xs font-bold uppercase tracking-widest text-accent-foreground disabled:opacity-30"
          >
            Next <ArrowRight className="size-3.5" />
          </button>
        </div>
      )}
    </MiniAppShell>
  );
}
