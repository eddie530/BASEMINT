import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useCallback } from "react";
import { z } from "zod";
import { useAccount, useWalletClient, usePublicClient } from "wagmi";
import { MiniAppShell } from "@/components/MiniAppShell";
import { ImagePlus, Loader2 } from "lucide-react";
import { DeployProgress, explainError, type DeployStep } from "@/components/create/DeployProgress";
import { useConnectWallet } from "@/lib/use-connect-wallet";


const searchSchema = z.object({
  kind: z.enum(["coin", "nft"]).default("coin"),
});

export const Route = createFileRoute("/create")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Create · Basemint" },
      { name: "description", content: "Launch a coin or NFT collection on Base in seconds." },
      { property: "og:title", content: "Create · Basemint" },
      { property: "og:description", content: "Launch a coin or NFT collection on Base in seconds." },
      { property: "og:url", content: "https://foxy-token-forge.lovable.app/create" },
    ],
    links: [{ rel: "canonical", href: "https://foxy-token-forge.lovable.app/create" }],
  }),
  component: CreatePage,
});

function CreatePage() {
  const { kind } = Route.useSearch();
  const navigate = useNavigate();

  return (
    <MiniAppShell>
      <div className="flex items-center justify-between">
        <h1 className="font-display font-bold text-2xl uppercase tracking-tight">Create</h1>
      </div>

      <div className="grid grid-cols-2 gap-2 p-1 bg-white/5 rounded-2xl border border-white/5">
        <button
          onClick={() => navigate({ to: "/create", search: { kind: "coin" } })}
          className={`py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest transition ${
            kind === "coin" ? "bg-accent text-accent-foreground" : "text-white/60"
          }`}
        >
          Coin
        </button>
        <button
          onClick={() => navigate({ to: "/create", search: { kind: "nft" } })}
          className={`py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest transition ${
            kind === "nft" ? "bg-accent text-accent-foreground" : "text-white/60"
          }`}
        >
          NFT
        </button>
      </div>

      {kind === "coin" ? <CoinForm /> : <NFTForm />}
    </MiniAppShell>
  );
}

function fileToDataUri(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

function MediaPicker({ onChange }: { onChange: (f: File | null) => void }) {
  const [preview, setPreview] = useState<string | null>(null);
  return (
    <label className="block aspect-square rounded-3xl bg-white/5 border border-dashed border-white/15 relative overflow-hidden cursor-pointer hover:border-accent/40 transition">
      {preview ? (
        <img src={preview} alt="Uploaded asset preview" className="w-full h-full object-cover" />
      ) : (
        <div className="absolute inset-0 grid place-items-center text-white/40">
          <div className="flex flex-col items-center gap-2">
            <ImagePlus className="size-8" />
            <span className="text-xs font-medium uppercase tracking-widest">Upload media</span>
          </div>
        </div>
      )}
      <input
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={(e) => {
          const f = e.target.files?.[0] ?? null;
          onChange(f);
          if (f) setPreview(URL.createObjectURL(f));
        }}
      />
    </label>
  );
}

function Field({ label, ...props }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block">
      <span className="text-[11px] font-bold uppercase tracking-widest text-white/50">{label}</span>
      <input
        {...props}
        className="mt-1.5 w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-accent/50 placeholder:text-white/25"
      />
    </label>
  );
}

type StepUpdater = (id: string, patch: Partial<DeployStep>) => void;

function useSteps(initial: DeployStep[]) {
  const [steps, setSteps] = useState<DeployStep[]>(initial);
  const reset = useCallback((next: DeployStep[]) => setSteps(next), []);
  const update: StepUpdater = useCallback(
    (id, patch) => setSteps((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s))),
    [],
  );
  return { steps, update, reset };
}

function CoinForm() {
  const [name, setName] = useState("");
  const [symbol, setSymbol] = useState("");
  const [media, setMedia] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const { steps, update, reset } = useSteps([]);

  const { isConnected, address, chainId } = useAccount();
  const { connectWallet, message: connectMessage } = useConnectWallet();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();

  async function onDeploy() {
    if (!isConnected) {
      connectWallet();
      return;
    }
    if (!name || !symbol) {
      reset([{ id: "validate", label: "Add a name and ticker.", status: "error" }]);
      return;
    }
    if (!walletClient || !publicClient || !address) {
      reset([{ id: "wallet", label: "Wallet not ready.", status: "error" }]);
      return;
    }

    const initial: DeployStep[] = [
      { id: "chain", label: "Connect to Base mainnet", status: "pending" },
      { id: "calldata", label: "Prepare deployment calldata", status: "pending" },
      { id: "sign", label: "Sign & broadcast transaction", status: "pending" },
      { id: "confirm", label: "Confirm on Base", status: "pending" },
      { id: "index", label: "Finalize & index", status: "pending" },
    ];
    reset(initial);
    setBusy(true);

    try {
      // 1. Chain
      update("chain", { status: "active" });
      if (chainId !== 8453) {
        try {
          await walletClient.switchChain({ id: 8453 });
        } catch (e) {
          const { detail, hint } = explainError(e);
          update("chain", { status: "error", detail, hint });
          return;
        }
      }
      update("chain", { status: "success", detail: "Base mainnet (8453)" });

      // 2. Calldata
      update("calldata", { status: "active" });
      let prepared;
      try {
        const imageDataUri = media ? await fileToDataUri(media) : undefined;
        const { buildCreateCoinCalls } = await import("@/lib/zora-create.functions");
        prepared = await buildCreateCoinCalls({
          data: {
            creator: address,
            name,
            symbol: symbol.toUpperCase(),
            description: `${name} coin on Base`,
            imageDataUri,
            currency: "ZORA",
            chainId: 8453,
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

      // 3. Sign / 4. Confirm (loop per call, last hash drives confirm)
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
      try {
        if (lastHash) await publicClient.waitForTransactionReceipt({ hash: lastHash });
      } catch (e) {
        const { detail, hint } = explainError(e);
        update("confirm", { status: "error", detail, hint });
        return;
      }
      update("confirm", { status: "success", txHash: lastHash });

      // 5. Index / analytics
      update("index", { status: "active" });
      const coinAddress = prepared.predictedCoinAddress;
      try {
        const { track } = await import("@/lib/analytics");
        void track("mint", { wallet_address: address, coin_address: coinAddress });
        if (coinAddress) {
          const { recordPointEvent } = await import("@/lib/points.functions");
          void recordPointEvent({
            data: {
              address,
              kind: "create_coin",
              ref_key: `create:${coinAddress.toLowerCase()}`,
              metadata: { coin: coinAddress, name },
            },
          });
        }
      } catch {
        // non-fatal
      }
      update("index", {
        status: "success",
        detail: coinAddress ? `Coin ${coinAddress.slice(0, 10)}…` : "Tracked",
        link: coinAddress ? { href: `/coin/${coinAddress}`, label: "View coin" } : undefined,
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <MediaPicker onChange={setMedia} />
      <Field label="Name" placeholder="Based Cat" value={name} onChange={(e) => setName(e.target.value)} />
      <Field
        label="Ticker"
        placeholder="BCAT"
        value={symbol}
        onChange={(e) => setSymbol(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8))}
      />

      <div className="bg-white/5 rounded-2xl border border-white/5 p-4 text-[11px] text-white/60 font-mono leading-relaxed">
        <p><span className="text-accent">●</span> Network: Base mainnet</p>
        <p><span className="text-accent">●</span> Standard: Zora Coins (ERC-20 + curve)</p>
      </div>

      <DeployProgress steps={steps} onRetry={onDeploy} />
      {connectMessage && <p className="text-xs text-white/60">{connectMessage}</p>}

      <button
        onClick={onDeploy}
        disabled={busy}
        className="w-full bg-accent text-accent-foreground py-4 rounded-2xl font-bold uppercase tracking-widest text-sm active:scale-[0.98] transition disabled:opacity-60 flex items-center justify-center gap-2"
      >
        {busy && <Loader2 className="size-4 animate-spin" />}
        {isConnected ? (busy ? "Deploying…" : "Deploy Coin") : "Connect Wallet"}
      </button>
    </div>
  );
}

function NFTForm() {
  const [name, setName] = useState("");
  const [price, setPrice] = useState("0.001");
  const [supply, setSupply] = useState("100");
  const [media, setMedia] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const { steps, update, reset } = useSteps([]);
  const { isConnected, address, chainId } = useAccount();
  const { connectWallet, message: connectMessage } = useConnectWallet();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();

  async function onMint() {
    if (!isConnected) {
      connectWallet();
      return;
    }
    if (!name) {
      reset([{ id: "validate", label: "Add a title.", status: "error" }]);
      return;
    }
    if (!walletClient || !publicClient || !address) {
      reset([{ id: "wallet", label: "Wallet not ready.", status: "error" }]);
      return;
    }

    const initial: DeployStep[] = [
      { id: "chain", label: "Connect to Base mainnet", status: "pending" },
      { id: "meta", label: "Build metadata (on-chain data URI)", status: "pending" },
      { id: "prepare", label: "Prepare ERC-1155 deployment", status: "pending" },
      { id: "sign", label: "Sign & broadcast transaction", status: "pending" },
      { id: "confirm", label: "Confirm on Base", status: "pending" },
    ];
    reset(initial);
    setBusy(true);

    try {
      update("chain", { status: "active" });
      if (chainId !== 8453) {
        try {
          await walletClient.switchChain({ id: 8453 });
        } catch (e) {
          const { detail, hint } = explainError(e);
          update("chain", { status: "error", detail, hint });
          return;
        }
      }
      update("chain", { status: "success", detail: "Base mainnet (8453)" });

      update("meta", { status: "active" });
      const imageDataUri = media ? await fileToDataUri(media) : undefined;
      const tokenUri = `data:application/json;utf8,${encodeURIComponent(
        JSON.stringify({ name, description: `${name} — minted via Basemint`, image: imageDataUri }),
      )}`;
      const contractUri = `data:application/json;utf8,${encodeURIComponent(
        JSON.stringify({ name, description: `${name} collection`, image: imageDataUri }),
      )}`;
      update("meta", { status: "success", detail: imageDataUri ? "Image + JSON embedded" : "JSON only" });

      update("prepare", { status: "active" });
      let parameters;
      let contractAddress: `0x${string}` | undefined;
      try {
        const { createCreatorClient } = await import("@zoralabs/protocol-sdk");
        const creatorClient = createCreatorClient({
          chainId: 8453,
          publicClient: publicClient as unknown as Parameters<typeof createCreatorClient>[0]["publicClient"],
        });
        const res = await creatorClient.create1155({
          contract: { name, uri: contractUri },
          token: {
            tokenMetadataURI: tokenUri,
            mintToCreatorCount: 1,
            salesConfig: { pricePerToken: BigInt(Math.floor(Number(price) * 1e18)) },
            maxSupply: BigInt(supply),
          },
          account: address as `0x${string}`,
        });
        parameters = res.parameters;
        contractAddress = res.contractAddress;
      } catch (e) {
        const { detail, hint } = explainError(e);
        update("prepare", { status: "error", detail, hint });
        return;
      }
      update("prepare", { status: "success", detail: `Collection ${contractAddress?.slice(0, 10)}…` });

      update("sign", { status: "active" });
      let hash: `0x${string}`;
      try {
        hash = await walletClient.writeContract(parameters);
      } catch (e) {
        const { detail, hint } = explainError(e);
        update("sign", { status: "error", detail, hint });
        return;
      }
      update("sign", { status: "success", txHash: hash });

      update("confirm", { status: "active" });
      try {
        await publicClient.waitForTransactionReceipt({ hash });
      } catch (e) {
        const { detail, hint } = explainError(e);
        update("confirm", { status: "error", detail, hint });
        return;
      }
      update("confirm", {
        status: "success",
        txHash: hash,
        link: contractAddress
          ? { href: `https://basescan.org/address/${contractAddress}`, label: "View on Basescan" }
          : undefined,
      });

      const { track } = await import("@/lib/analytics");
      void track("mint", { wallet_address: address, coin_address: contractAddress });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <MediaPicker onChange={setMedia} />
      <Field label="Title" placeholder="Hyperstructure #04" value={name} onChange={(e) => setName(e.target.value)} />
      <div className="grid grid-cols-2 gap-3">
        <Field label="Price (ETH)" type="number" step="0.0001" value={price} onChange={(e) => setPrice(e.target.value)} />
        <Field label="Edition Supply" type="number" value={supply} onChange={(e) => setSupply(e.target.value)} />
      </div>

      <div className="bg-white/5 rounded-2xl border border-white/5 p-4 text-[11px] text-white/60 font-mono leading-relaxed">
        <p><span className="text-accent">●</span> Network: Base mainnet</p>
        <p><span className="text-accent">●</span> Standard: ERC-1155 edition (Zora)</p>
        <p><span className="text-accent">●</span> Metadata: on-chain data URI (no IPFS)</p>
      </div>

      <DeployProgress steps={steps} onRetry={onMint} />
      {connectMessage && <p className="text-xs text-white/60">{connectMessage}</p>}

      <button
        onClick={onMint}
        disabled={busy}
        className="w-full bg-white text-black py-4 rounded-2xl font-bold uppercase tracking-widest text-sm active:scale-[0.98] transition disabled:opacity-60 flex items-center justify-center gap-2"
      >
        {busy && <Loader2 className="size-4 animate-spin" />}
        {isConnected ? (busy ? "Deploying…" : "Mint Collection") : "Connect Wallet"}
      </button>
    </div>
  );
}

