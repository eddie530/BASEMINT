import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { useAccount, useConnect, useWalletClient, usePublicClient } from "wagmi";
import { MiniAppShell } from "@/components/MiniAppShell";
import { ImagePlus, Loader2 } from "lucide-react";

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

function CoinForm() {
  const [name, setName] = useState("");
  const [symbol, setSymbol] = useState("");
  const [, setMedia] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const { isConnected, address } = useAccount();
  const { connect, connectors } = useConnect();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();

  async function onDeploy() {
    setStatus(null);
    if (!isConnected) {
      const c = connectors[0];
      if (c) connect({ connector: c });
      return;
    }
    if (!name || !symbol) {
      setStatus("Add a name and ticker.");
      return;
    }
    if (!walletClient || !publicClient || !address) {
      setStatus("Wallet not ready.");
      return;
    }
    try {
      setBusy(true);
      setStatus("Preparing deployment on Base…");
      const { createCoin } = await import("@zoralabs/coins-sdk");
      const uri = `data:application/json;utf8,${encodeURIComponent(
        JSON.stringify({ name, description: `${name} coin on Base`, symbol }),
      )}`;
      const res = await createCoin({
        call: {
          creator: address,
          name,
          symbol: symbol.toUpperCase(),
          metadata: { type: "RAW_URI", uri },
          currency: "ZORA",
          chainId: 8453,
          skipMetadataValidation: true,
        },
        walletClient,
        publicClient,
      });
      setStatus(res.address ? `Deployed! Coin: ${res.address.slice(0, 10)}…` : `Tx sent: ${res.hash.slice(0, 10)}…`);
      const { track } = await import("@/lib/analytics");
      void track("mint", { wallet_address: address, coin_address: res.address });
      if (res.address) {
        const { recordPointEvent } = await import("@/lib/points.functions");
        void recordPointEvent({
          data: {
            address,
            kind: "create_coin",
            ref_key: `create:${res.address.toLowerCase()}`,
            metadata: { coin: res.address, name },
          },
        });
      }
    } catch (e) {
      console.error(e);
      setStatus(e instanceof Error ? e.message : "Deploy failed.");
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
        <p>
          <span className="text-accent">●</span> Network: Base mainnet
        </p>
        <p>
          <span className="text-accent">●</span> Standard: Zora Coins (ERC-20 + curve)
        </p>
      </div>

      {status && (
        <p className="text-xs text-white/70 font-mono bg-white/5 rounded-xl px-3 py-2 break-all">{status}</p>
      )}

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
  const [, setMedia] = useState<File | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const { isConnected } = useAccount();
  const { connect, connectors } = useConnect();

  function onMint() {
    if (!isConnected) {
      const c = connectors[0];
      if (c) connect({ connector: c });
      return;
    }
    setStatus("NFT collection deploy is queued — coming online with the Zora 1155 module.");
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
        <p><span className="text-accent">●</span> Standard: ERC-1155 edition</p>
      </div>

      {status && (
        <p className="text-xs text-white/70 font-mono bg-white/5 rounded-xl px-3 py-2">{status}</p>
      )}

      <button
        onClick={onMint}
        className="w-full bg-white text-black py-4 rounded-2xl font-bold uppercase tracking-widest text-sm active:scale-[0.98] transition"
      >
        {isConnected ? "Mint Collection" : "Connect Wallet"}
      </button>
    </div>
  );
}
