import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useAccount, usePublicClient, useReadContract, useWalletClient } from "wagmi";
import { base, baseSepolia } from "wagmi/chains";
import { decodeEventLog, encodeFunctionData, parseEther, parseUnits } from "viem";
import { Loader2, ExternalLink, Rocket, Zap } from "lucide-react";
import { MiniAppShell } from "@/components/MiniAppShell";
import { useConnectWallet } from "@/lib/use-connect-wallet";
import { sendSponsoredOrFallback } from "@/lib/sponsored-tx";
import { isGaslessEligible } from "@/lib/wagmi";
import { getCreationConfig } from "@/lib/zora-create.functions";
import {
  FACTORY_ADDRESSES,
  NFT_FACTORY_ABI,
  TOKEN_FACTORY_ABI,
  basescanUrl,
} from "@/lib/basemint-contracts";

function short(addr?: string) {
  return addr ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : "—";
}

function CreationConfigPanel({ chainId }: { chainId: 8453 | 84532 }) {
  const fetchConfig = useServerFn(getCreationConfig);
  const { data, isLoading } = useQuery({
    queryKey: ["creation-config", chainId],
    queryFn: () => fetchConfig({ data: { chainId } }),
    staleTime: 60_000,
  });

  return (
    <div className="bg-white/5 rounded-2xl border border-white/5 p-4 text-[11px] text-white/70 font-mono leading-relaxed space-y-1">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] uppercase tracking-widest text-white/40">
          Base Builder config
        </span>
        {isLoading && <Loader2 className="size-3 animate-spin text-white/40" />}
      </div>
      <p>
        <span className="text-accent">●</span> Chain: {data?.chainName ?? "…"} ({chainId})
      </p>
      <p>
        <span className="text-accent">●</span> Currencies:{" "}
        {data?.currencies.map((c) => c.symbol).join(" · ") ?? "…"}
      </p>
      <p>
        <span className="text-accent">●</span> Zora factory: {short(data?.zoraFactory)}
      </p>
      <p>
        <span className="text-accent">●</span> Basemint token factory:{" "}
        {short(data?.basemintTokenFactory)}
      </p>
      <p>
        <span className="text-accent">●</span> Basemint NFT factory:{" "}
        {short(data?.basemintNftFactory)}
      </p>
      <p>
        <span className="text-accent">●</span> Sponsored mint:{" "}
        {data?.supportsSponsoredMint ? "enabled" : "disabled"}
      </p>
    </div>
  );
}

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

      <CreationConfigPanel chainId={network} />



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

function WalletApproval({
  approved,
  onApprovedChange,
  chainId,
}: {
  approved: boolean;
  onApprovedChange: (v: boolean) => void;
  chainId: 8453 | 84532;
}) {
  const { isConnected, address, connector } = useAccount();
  const { connectWallet, message } = useConnectWallet();
  const label = chainId === base.id ? "Base mainnet" : "Base Sepolia";

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-widest text-white/40 font-mono">
          Step 1 · Wallet
        </span>
        <span
          className={`text-[10px] uppercase tracking-widest font-mono ${
            isConnected ? "text-accent" : "text-white/40"
          }`}
        >
          {isConnected ? "Connected" : "Not connected"}
        </span>
      </div>

      {isConnected ? (
        <div className="text-xs text-white/70 font-mono break-all">
          {address?.slice(0, 6)}…{address?.slice(-4)}
          {connector?.name ? ` · ${connector.name}` : ""}
        </div>
      ) : (
        <button
          onClick={() => connectWallet()}
          className="w-full bg-white text-black py-3 rounded-xl font-bold uppercase tracking-widest text-xs active:scale-[0.98] transition"
        >
          Connect Wallet
        </button>
      )}
      {message && <p className="text-[11px] text-white/50">{message}</p>}

      <div className="border-t border-white/5 pt-3">
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={approved}
            disabled={!isConnected}
            onChange={(e) => onApprovedChange(e.target.checked)}
            className="mt-0.5 size-4 accent-accent shrink-0 disabled:opacity-40"
          />
          <span className="text-[11px] text-white/70 leading-relaxed">
            <span className="block text-[10px] uppercase tracking-widest text-white/40 font-mono mb-0.5">
              Step 2 · Approve
            </span>
            I approve deploying this contract to <strong>{label}</strong> from my wallet. I
            understand the transaction is irreversible and I'll be prompted to sign it.
          </span>
        </label>
      </div>
    </div>
  );
}

type VerifyState =
  | { status: "idle" }
  | { status: "verifying" }
  | {
      status: "success";
      address: `0x${string}`;
      name?: string;
      symbol?: string;
      totalSupply?: string;
      maxSupply?: string;
    }
  | { status: "failure"; reason: string };

const ERC20_METADATA_ABI = [
  { type: "function", name: "name", stateMutability: "view", inputs: [], outputs: [{ type: "string" }] },
  { type: "function", name: "symbol", stateMutability: "view", inputs: [], outputs: [{ type: "string" }] },
  { type: "function", name: "totalSupply", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
] as const;

const ERC721_METADATA_ABI = [
  { type: "function", name: "name", stateMutability: "view", inputs: [], outputs: [{ type: "string" }] },
  { type: "function", name: "symbol", stateMutability: "view", inputs: [], outputs: [{ type: "string" }] },
  { type: "function", name: "maxSupply", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
] as const;

function VerificationBanner({ state, chainId }: { state: VerifyState; chainId: 8453 | 84532 }) {
  if (state.status === "idle") return null;
  if (state.status === "verifying") {
    return (
      <div className="bg-white/5 border border-white/10 rounded-xl p-3 text-xs text-white/70 flex items-center gap-2">
        <Loader2 className="size-3.5 animate-spin" /> Verifying deployment on-chain…
      </div>
    );
  }
  if (state.status === "failure") {
    return (
      <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-xs text-red-200 space-y-1">
        <p className="font-bold uppercase tracking-widest text-[10px]">Verification failed</p>
        <p className="break-words">{state.reason}</p>
      </div>
    );
  }
  return (
    <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3 text-xs text-emerald-200 space-y-1 font-mono">
      <p className="font-bold uppercase tracking-widest text-[10px]">✓ Verified on-chain</p>
      <p className="break-all">
        <span className="text-emerald-100/70">addr </span>
        <a
          className="underline"
          href={basescanUrl(chainId, state.address)}
          target="_blank"
          rel="noreferrer"
        >
          {state.address}
        </a>
      </p>
      {state.name && (
        <p>
          <span className="text-emerald-100/70">name </span>
          {state.name}
        </p>
      )}
      {state.symbol && (
        <p>
          <span className="text-emerald-100/70">symbol </span>
          {state.symbol}
        </p>
      )}
      {state.totalSupply && (
        <p>
          <span className="text-emerald-100/70">totalSupply </span>
          {state.totalSupply}
        </p>
      )}
      {state.maxSupply && (
        <p>
          <span className="text-emerald-100/70">maxSupply </span>
          {state.maxSupply}
        </p>
      )}
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
  const { connectWallet } = useConnectWallet();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient({ chainId });

  const [name, setName] = useState("");
  const [symbol, setSymbol] = useState("");
  const [decimals, setDecimals] = useState("18");
  const [supply, setSupply] = useState("1000000");
  const [approved, setApproved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string>();
  const [txHash, setTxHash] = useState<`0x${string}`>();
  const [deployed, setDeployed] = useState<`0x${string}`>();
  const [verify, setVerify] = useState<VerifyState>({ status: "idle" });

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
    if (!approved) {
      setErr("Approve the deployment before continuing.");
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
    setVerify({ status: "idle" });
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

      if (result.receipt.status !== "success") {
        setVerify({ status: "failure", reason: "Transaction reverted on-chain." });
        return;
      }

      let tokenAddr: `0x${string}` | undefined;
      for (const log of result.receipt.logs) {
        try {
          const ev = decodeEventLog({
            abi: TOKEN_FACTORY_ABI,
            data: log.data,
            topics: log.topics,
          });
          if (ev.eventName === "TokenCreated") {
            tokenAddr = (ev.args as { token: `0x${string}` }).token;
            setDeployed(tokenAddr);
            break;
          }
        } catch {
          /* not our event */
        }
      }

      if (!tokenAddr) {
        setVerify({ status: "failure", reason: "No TokenCreated event found in receipt logs." });
        return;
      }

      setVerify({ status: "verifying" });
      const code = await publicClient.getCode({ address: tokenAddr });
      if (!code || code === "0x") {
        setVerify({ status: "failure", reason: `No bytecode at ${tokenAddr}.` });
        return;
      }
      const [onchainName, onchainSymbol, onchainSupply] = await Promise.all([
        publicClient
          .readContract({ address: tokenAddr, abi: ERC20_METADATA_ABI, functionName: "name" })
          .catch(() => undefined),
        publicClient
          .readContract({ address: tokenAddr, abi: ERC20_METADATA_ABI, functionName: "symbol" })
          .catch(() => undefined),
        publicClient
          .readContract({ address: tokenAddr, abi: ERC20_METADATA_ABI, functionName: "totalSupply" })
          .catch(() => undefined),
      ]);
      setVerify({
        status: "success",
        address: tokenAddr,
        name: onchainName as string | undefined,
        symbol: onchainSymbol as string | undefined,
        totalSupply: onchainSupply != null ? (onchainSupply as bigint).toString() : undefined,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Deploy failed";
      setErr(msg);
      setVerify({ status: "failure", reason: msg });
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

      <WalletApproval approved={approved} onApprovedChange={setApproved} chainId={chainId} />

      {err && <p className="text-xs text-red-300 break-words">{err}</p>}

      <button
        onClick={onDeploy}
        disabled={busy || !factory || (isConnected && !approved)}
        className="w-full bg-accent text-accent-foreground py-4 rounded-2xl font-bold uppercase tracking-widest text-sm active:scale-[0.98] transition disabled:opacity-40 flex items-center justify-center gap-2"
      >
        {busy && <Loader2 className="size-4 animate-spin" />}
        {!isConnected
          ? "Connect Wallet"
          : !approved
            ? "Approve to Deploy"
            : busy
              ? "Deploying…"
              : "Deploy on Base"}
      </button>

      <VerificationBanner state={verify} chainId={chainId} />
      <ResultLinks chainId={chainId} txHash={txHash} contract={deployed} />
    </div>
  );
}

function NFTDeployForm({ chainId }: { chainId: 8453 | 84532 }) {
  const factory = FACTORY_ADDRESSES[chainId]?.nftFactory;
  const { isConnected, address, connector } = useAccount();
  const sponsored = isGaslessEligible(connector?.id, chainId);
  const { connectWallet } = useConnectWallet();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient({ chainId });

  const [name, setName] = useState("");
  const [symbol, setSymbol] = useState("");
  const [baseURI, setBaseURI] = useState("ipfs://");
  const [maxSupply, setMaxSupply] = useState("1000");
  const [mintPrice, setMintPrice] = useState("0.001");
  const [approved, setApproved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string>();
  const [txHash, setTxHash] = useState<`0x${string}`>();
  const [deployed, setDeployed] = useState<`0x${string}`>();
  const [verify, setVerify] = useState<VerifyState>({ status: "idle" });

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
    if (!approved) {
      setErr("Approve the deployment before continuing.");
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
    setVerify({ status: "idle" });
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

      if (result.receipt.status !== "success") {
        setVerify({ status: "failure", reason: "Transaction reverted on-chain." });
        return;
      }

      let collectionAddr: `0x${string}` | undefined;
      for (const log of result.receipt.logs) {
        try {
          const ev = decodeEventLog({
            abi: NFT_FACTORY_ABI,
            data: log.data,
            topics: log.topics,
          });
          if (ev.eventName === "CollectionCreated") {
            collectionAddr = (ev.args as { collection: `0x${string}` }).collection;
            setDeployed(collectionAddr);
            break;
          }
        } catch {
          /* not our event */
        }
      }

      if (!collectionAddr) {
        setVerify({
          status: "failure",
          reason: "No CollectionCreated event found in receipt logs.",
        });
        return;
      }

      setVerify({ status: "verifying" });
      const code = await publicClient.getCode({ address: collectionAddr });
      if (!code || code === "0x") {
        setVerify({ status: "failure", reason: `No bytecode at ${collectionAddr}.` });
        return;
      }
      const [onchainName, onchainSymbol, onchainMax] = await Promise.all([
        publicClient
          .readContract({
            address: collectionAddr,
            abi: ERC721_METADATA_ABI,
            functionName: "name",
          })
          .catch(() => undefined),
        publicClient
          .readContract({
            address: collectionAddr,
            abi: ERC721_METADATA_ABI,
            functionName: "symbol",
          })
          .catch(() => undefined),
        publicClient
          .readContract({
            address: collectionAddr,
            abi: ERC721_METADATA_ABI,
            functionName: "maxSupply",
          })
          .catch(() => undefined),
      ]);
      setVerify({
        status: "success",
        address: collectionAddr,
        name: onchainName as string | undefined,
        symbol: onchainSymbol as string | undefined,
        maxSupply: onchainMax != null ? (onchainMax as bigint).toString() : undefined,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Deploy failed";
      setErr(msg);
      setVerify({ status: "failure", reason: msg });
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

      {sponsored && (
        <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-accent font-mono">
          <Zap className="size-3" /> Gasless via Base paymaster
        </div>
      )}

      {!factory && <FactoryMissing chainId={chainId} />}

      <WalletApproval approved={approved} onApprovedChange={setApproved} chainId={chainId} />

      {err && <p className="text-xs text-red-300 break-words">{err}</p>}

      <button
        onClick={onDeploy}
        disabled={busy || !factory || (isConnected && !approved)}
        className="w-full bg-accent text-accent-foreground py-4 rounded-2xl font-bold uppercase tracking-widest text-sm active:scale-[0.98] transition disabled:opacity-40 flex items-center justify-center gap-2"
      >
        {busy && <Loader2 className="size-4 animate-spin" />}
        {!isConnected
          ? "Connect Wallet"
          : !approved
            ? "Approve to Deploy"
            : busy
              ? "Deploying…"
              : "Deploy on Base"}
      </button>

      <ResultLinks chainId={chainId} txHash={txHash} contract={deployed} />
    </div>
  );
}
