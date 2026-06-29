import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useAccount, usePublicClient, useReadContract, useWalletClient } from "wagmi";
import { base, baseSepolia } from "wagmi/chains";
import { decodeEventLog, encodeFunctionData, parseEther, parseUnits } from "viem";
import { Loader2, ExternalLink, Rocket, Zap } from "lucide-react";
import { MiniAppShell } from "@/components/MiniAppShell";
import { useConnectWallet } from "@/lib/use-connect-wallet";
import { sendSponsoredOrFallback } from "@/lib/sponsored-tx";
import { isGaslessEligible } from "@/lib/wagmi";
import {
  FACTORY_ADDRESSES,
  NFT_FACTORY_ABI,
  TOKEN_FACTORY_ABI,
  basescanUrl,
} from "@/lib/basemint-contracts";

type Mode = "token" | "nft";

export const Route = createFileRoute("/deploy")({
  head: () => ({
    meta: [
      { title: "Deploy on Base · Basemint" },
      {
        name: "description",
        content:
          "Deploy production ERC20 tokens and ERC721 NFT collections to Base via Basemint's audited factories.",
      },
      { property: "og:title", content: "Deploy on Base · Basemint" },
      {
        property: "og:description",
        content: "Launch tokens and NFTs to Base mainnet or Base Sepolia in one click.",
      },
    ],
    links: [{ rel: "canonical", href: "https://basemint.dev/deploy" }],
  }),
  component: DeployPage,
});

function DeployPage() {
  const [mode, setMode] = useState<Mode>("token");
  const [network, setNetwork] = useState<typeof base.id | typeof baseSepolia.id>(baseSepolia.id);

  return (
    <MiniAppShell>
      <div className="flex items-center justify-between">
        <h1 className="font-display font-bold text-2xl uppercase tracking-tight">Deploy on Base</h1>
        <Rocket className="size-5 text-accent" />
      </div>

      <p className="text-xs text-white/60 leading-relaxed">
        Launch audited contracts (Ownable · Pausable · ReentrancyGuard) through Basemint's
        factories. Test on Sepolia first, then ship to mainnet.
      </p>

      <div className="grid grid-cols-2 gap-2 p-1 bg-white/5 rounded-2xl border border-white/5">
        <Tab active={mode === "token"} onClick={() => setMode("token")}>
          Create Token
        </Tab>
        <Tab active={mode === "nft"} onClick={() => setMode("nft")}>
          Create NFT
        </Tab>
      </div>

      <div className="grid grid-cols-2 gap-2 p-1 bg-white/5 rounded-2xl border border-white/5">
        <Tab active={network === baseSepolia.id} onClick={() => setNetwork(baseSepolia.id)}>
          Base Sepolia
        </Tab>
        <Tab active={network === base.id} onClick={() => setNetwork(base.id)}>
          Base Mainnet
        </Tab>
      </div>

      {mode === "token" ? (
        <TokenDeployForm chainId={network} />
      ) : (
        <NFTDeployForm chainId={network} />
      )}
    </MiniAppShell>
  );
}

function Tab({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest transition ${
        active ? "bg-accent text-accent-foreground" : "text-white/60"
      }`}
    >
      {children}
    </button>
  );
}

function Field({
  label,
  ...props
}: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
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

function FactoryMissing({ chainId }: { chainId: 8453 | 84532 }) {
  return (
    <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-xs text-red-200">
      No factory configured for {chainId === base.id ? "Base mainnet" : "Base Sepolia"}. Deploy the
      factory via <code className="text-red-100">forge script</code> in{" "}
      <code className="text-red-100">/contracts</code>, then set the matching{" "}
      <code className="text-red-100">VITE_*_FACTORY_*</code> env var.
    </div>
  );
}

function ResultLinks({
  chainId,
  txHash,
  contract,
}: {
  chainId: 8453 | 84532;
  txHash?: `0x${string}`;
  contract?: `0x${string}`;
}) {
  if (!txHash && !contract) return null;
  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-3 space-y-2 text-xs">
      {txHash && (
        <a
          href={basescanUrl(chainId, txHash)}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-2 text-accent hover:underline"
        >
          <ExternalLink className="size-3.5" /> View transaction on Basescan
        </a>
      )}
      {contract && (
        <a
          href={basescanUrl(chainId, contract)}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-2 text-accent hover:underline"
        >
          <ExternalLink className="size-3.5" /> View contract on Basescan
        </a>
      )}
    </div>
  );
}

function TokenDeployForm({ chainId }: { chainId: 8453 | 84532 }) {
  const factory = FACTORY_ADDRESSES[chainId]?.tokenFactory;
  const { isConnected, address, connector } = useAccount();
  const sponsored = isGaslessEligible(connector?.id, chainId);
  const { connectWallet, message: connectMessage } = useConnectWallet();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient({ chainId });

  const [name, setName] = useState("");
  const [symbol, setSymbol] = useState("");
  const [decimals, setDecimals] = useState("18");
  const [supply, setSupply] = useState("1000000");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string>();
  const [txHash, setTxHash] = useState<`0x${string}`>();
  const [deployed, setDeployed] = useState<`0x${string}`>();

  const { data: feeData } = useReadContract({
    chainId,
    address: factory,
    abi: TOKEN_FACTORY_ABI,
    functionName: "creationFee",
    query: { enabled: Boolean(factory) },
  });
  const creationFee = useMemo(() => (feeData as bigint | undefined) ?? 0n, [feeData]);

  async function onDeploy() {
    setErr(undefined);
    if (!isConnected) {
      connectWallet();
      return;
    }
    if (!factory || !walletClient || !publicClient || !address) {
      setErr("Wallet or factory not ready.");
      return;
    }
    if (!name || !symbol) {
      setErr("Add a name and ticker.");
      return;
    }
    setBusy(true);
    setTxHash(undefined);
    setDeployed(undefined);
    try {
      if (walletClient.chain?.id !== chainId) {
        await walletClient.switchChain({ id: chainId });
      }
      const dec = Number(decimals) || 18;
      const initial = parseUnits(supply || "0", dec);
      const data = encodeFunctionData({
        abi: TOKEN_FACTORY_ABI,
        functionName: "createToken",
        args: [name, symbol.toUpperCase(), dec, initial],
      });
      const result = await sendSponsoredOrFallback({
        walletClient,
        publicClient,
        account: address,
        chainId,
        connectorId: connector?.id,
        calls: [{ to: factory, data, value: creationFee }],
      });
      setTxHash(result.txHash);
      for (const log of result.receipt.logs) {
        try {
          const ev = decodeEventLog({
            abi: TOKEN_FACTORY_ABI,
            data: log.data,
            topics: log.topics,
          });
          if (ev.eventName === "TokenCreated") {
            setDeployed((ev.args as { token: `0x${string}` }).token);
            break;
          }
        } catch {
          /* not our event */
        }
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Deploy failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <Field
        label="Name"
        placeholder="Basemint Token"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <Field
        label="Ticker"
        placeholder="BMT"
        value={symbol}
        onChange={(e) =>
          setSymbol(
            e.target.value
              .toUpperCase()
              .replace(/[^A-Z0-9]/g, "")
              .slice(0, 11),
          )
        }
      />
      <div className="grid grid-cols-2 gap-3">
        <Field
          label="Decimals"
          type="number"
          value={decimals}
          onChange={(e) => setDecimals(e.target.value)}
        />
        <Field
          label="Initial Supply"
          type="number"
          value={supply}
          onChange={(e) => setSupply(e.target.value)}
        />
      </div>

      <div className="bg-white/5 rounded-2xl border border-white/5 p-4 text-[11px] text-white/60 font-mono leading-relaxed">
        <p>
          <span className="text-accent">●</span> Network:{" "}
          {chainId === base.id ? "Base mainnet" : "Base Sepolia"}
        </p>
        <p>
          <span className="text-accent">●</span> Standard: ERC20 + Pausable + ReentrancyGuard
        </p>
        <p>
          <span className="text-accent">●</span> Creation fee: {creationFee.toString()} wei
        </p>
      </div>

      {sponsored && (
        <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-accent font-mono">
          <Zap className="size-3" /> Gasless via Base paymaster
        </div>
      )}


      {!factory && <FactoryMissing chainId={chainId} />}
      {connectMessage && <p className="text-xs text-white/60">{connectMessage}</p>}
      {err && <p className="text-xs text-red-300 break-words">{err}</p>}

      <button
        onClick={onDeploy}
        disabled={busy || !factory}
        className="w-full bg-accent text-accent-foreground py-4 rounded-2xl font-bold uppercase tracking-widest text-sm active:scale-[0.98] transition disabled:opacity-60 flex items-center justify-center gap-2"
      >
        {busy && <Loader2 className="size-4 animate-spin" />}
        {isConnected ? (busy ? "Deploying…" : "Deploy on Base") : "Connect Wallet"}
      </button>

      <ResultLinks chainId={chainId} txHash={txHash} contract={deployed} />
    </div>
  );
}

function NFTDeployForm({ chainId }: { chainId: 8453 | 84532 }) {
  const factory = FACTORY_ADDRESSES[chainId]?.nftFactory;
  const { isConnected, address, connector } = useAccount();
  const sponsored = isGaslessEligible(connector?.id, chainId);
  const { connectWallet, message: connectMessage } = useConnectWallet();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient({ chainId });

  const [name, setName] = useState("");
  const [symbol, setSymbol] = useState("");
  const [baseURI, setBaseURI] = useState("ipfs://");
  const [maxSupply, setMaxSupply] = useState("1000");
  const [mintPrice, setMintPrice] = useState("0.001");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string>();
  const [txHash, setTxHash] = useState<`0x${string}`>();
  const [deployed, setDeployed] = useState<`0x${string}`>();

  const { data: feeData } = useReadContract({
    chainId,
    address: factory,
    abi: NFT_FACTORY_ABI,
    functionName: "creationFee",
    query: { enabled: Boolean(factory) },
  });
  const creationFee = useMemo(() => (feeData as bigint | undefined) ?? 0n, [feeData]);

  async function onDeploy() {
    setErr(undefined);
    if (!isConnected) {
      connectWallet();
      return;
    }
    if (!factory || !walletClient || !publicClient || !address) {
      setErr("Wallet or factory not ready.");
      return;
    }
    if (!name || !symbol) {
      setErr("Add a name and symbol.");
      return;
    }
    setBusy(true);
    setTxHash(undefined);
    setDeployed(undefined);
    try {
      if (walletClient.chain?.id !== chainId) {
        await walletClient.switchChain({ id: chainId });
      }
      const data = encodeFunctionData({
        abi: NFT_FACTORY_ABI,
        functionName: "createCollection",
        args: [
          name,
          symbol.toUpperCase(),
          baseURI,
          BigInt(maxSupply || "0"),
          parseEther(mintPrice || "0"),
        ],
      });
      const result = await sendSponsoredOrFallback({
        walletClient,
        publicClient,
        account: address,
        chainId,
        connectorId: connector?.id,
        calls: [{ to: factory, data, value: creationFee }],
      });
      setTxHash(result.txHash);
      for (const log of result.receipt.logs) {
        try {
          const ev = decodeEventLog({
            abi: NFT_FACTORY_ABI,
            data: log.data,
            topics: log.topics,
          });
          if (ev.eventName === "CollectionCreated") {
            setDeployed((ev.args as { collection: `0x${string}` }).collection);
            break;
          }
        } catch {
          /* not our event */
        }
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Deploy failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <Field
        label="Name"
        placeholder="Basemint Collection"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <Field
        label="Symbol"
        placeholder="BMNFT"
        value={symbol}
        onChange={(e) =>
          setSymbol(
            e.target.value
              .toUpperCase()
              .replace(/[^A-Z0-9]/g, "")
              .slice(0, 11),
          )
        }
      />
      <Field
        label="Base URI"
        placeholder="ipfs://CID/"
        value={baseURI}
        onChange={(e) => setBaseURI(e.target.value)}
      />
      <div className="grid grid-cols-2 gap-3">
        <Field
          label="Max Supply"
          type="number"
          value={maxSupply}
          onChange={(e) => setMaxSupply(e.target.value)}
        />
        <Field
          label="Mint Price (ETH)"
          type="number"
          step="0.0001"
          value={mintPrice}
          onChange={(e) => setMintPrice(e.target.value)}
        />
      </div>

      <div className="bg-white/5 rounded-2xl border border-white/5 p-4 text-[11px] text-white/60 font-mono leading-relaxed">
        <p>
          <span className="text-accent">●</span> Network:{" "}
          {chainId === base.id ? "Base mainnet" : "Base Sepolia"}
        </p>
        <p>
          <span className="text-accent">●</span> Standard: ERC721 + Pausable + ReentrancyGuard
        </p>
        <p>
          <span className="text-accent">●</span> Creation fee: {creationFee.toString()} wei
        </p>
      </div>

      {!factory && <FactoryMissing chainId={chainId} />}
      {connectMessage && <p className="text-xs text-white/60">{connectMessage}</p>}
      {err && <p className="text-xs text-red-300 break-words">{err}</p>}

      <button
        onClick={onDeploy}
        disabled={busy || !factory}
        className="w-full bg-accent text-accent-foreground py-4 rounded-2xl font-bold uppercase tracking-widest text-sm active:scale-[0.98] transition disabled:opacity-60 flex items-center justify-center gap-2"
      >
        {busy && <Loader2 className="size-4 animate-spin" />}
        {isConnected ? (busy ? "Deploying…" : "Deploy on Base") : "Connect Wallet"}
      </button>

      <ResultLinks chainId={chainId} txHash={txHash} contract={deployed} />
    </div>
  );
}
