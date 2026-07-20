import { useEffect, useMemo, useState } from "react";
import { useAccount, useChainId, useConnect, useReadContracts, useSwitchChain, useWalletClient, usePublicClient } from "wagmi";
import { maxUint256, formatUnits } from "viem";
import { Check, Loader2, ShieldAlert, Wallet, ExternalLink } from "lucide-react";
import {
  CTF,
  CTF_ABI,
  POLYGON_CHAIN_ID,
  POLYMARKET_OPERATORS,
  USDC_ABI,
  USDC_E,
  hasAttested,
  setAttested,
} from "@/lib/polymarket";

/**
 * Phase 2A: prepare a connected wallet to trade Polymarket on Polygon.
 * Handles: connect → self-attest → switch to Polygon → USDC + CTF approvals.
 * Order signing is Phase 2B (next turn).
 */
export function PolymarketOnramp() {
  const { address, isConnected, connector } = useAccount();
  const chainId = useChainId();
  const { connectors, connectAsync, isPending: connectPending } = useConnect();
  const { switchChainAsync, isPending: switchPending } = useSwitchChain();
  const { data: walletClient } = useWalletClient({ chainId: POLYGON_CHAIN_ID });
  const publicClient = usePublicClient({ chainId: POLYGON_CHAIN_ID });

  const [attested, setAttestedState] = useState(false);
  useEffect(() => setAttestedState(hasAttested()), []);

  const onPolygon = chainId === POLYGON_CHAIN_ID;

  // Read USDC balance + 3 allowances + 3 CTF operator flags.
  const contracts = useMemo(() => {
    if (!address) return [];
    return [
      { address: USDC_E, abi: USDC_ABI, functionName: "balanceOf", args: [address] as const, chainId: POLYGON_CHAIN_ID },
      ...POLYMARKET_OPERATORS.map((op) => ({
        address: USDC_E,
        abi: USDC_ABI,
        functionName: "allowance" as const,
        args: [address, op] as const,
        chainId: POLYGON_CHAIN_ID,
      })),
      ...POLYMARKET_OPERATORS.map((op) => ({
        address: CTF,
        abi: CTF_ABI,
        functionName: "isApprovedForAll" as const,
        args: [address, op] as const,
        chainId: POLYGON_CHAIN_ID,
      })),
    ];
  }, [address]);

  const { data: reads, refetch, isFetching } = useReadContracts({
    contracts: contracts as never,
    query: { enabled: !!address, refetchInterval: 15_000 },
  });

  const usdcBalance = reads?.[0]?.result as bigint | undefined;
  const usdcAllowances = (reads?.slice(1, 4) ?? []).map((r) => r?.result as bigint | undefined);
  const ctfFlags = (reads?.slice(4, 7) ?? []).map((r) => r?.result as boolean | undefined);

  const APPROVAL_MIN = 10n ** 18n; // treat any allowance ≥ 1e18 as "approved"
  const usdcApproved = usdcAllowances.every((a) => (a ?? 0n) >= APPROVAL_MIN);
  const ctfApproved = ctfFlags.every((f) => f === true);
  const fullyReady = attested && onPolygon && usdcApproved && ctfApproved;

  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const handleConnect = async () => {
    setErr(null);
    // Prefer an already-usable browser wallet; fall back to first connector.
    const preferred =
      connectors.find((c) => c.id === "injected" && (c as unknown as { ready?: boolean }).ready) ??
      connectors.find((c) => c.id === "farcasterMiniApp") ??
      connectors.find((c) => c.id === "coinbaseWalletSDK" || c.id === "coinbaseWallet") ??
      connectors[0];
    if (!preferred) return setErr("No wallet connectors available.");
    try {
      await connectAsync({ connector: preferred });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Connect failed");
    }
  };

  const handleSwitch = async () => {
    setErr(null);
    try {
      await switchChainAsync({ chainId: POLYGON_CHAIN_ID });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Chain switch rejected");
    }
  };

  const runApprovals = async () => {
    if (!walletClient || !address || !publicClient) return;
    setErr(null);
    try {
      for (let i = 0; i < POLYMARKET_OPERATORS.length; i++) {
        const op = POLYMARKET_OPERATORS[i];
        if ((usdcAllowances[i] ?? 0n) < APPROVAL_MIN) {
          setBusy(`Approving USDC → ${short(op)}`);
          const hash = await walletClient.writeContract({
            address: USDC_E,
            abi: USDC_ABI,
            functionName: "approve",
            args: [op, maxUint256],
            chain: walletClient.chain,
            account: address,
          });
          await publicClient.waitForTransactionReceipt({ hash });
        }
        if (ctfFlags[i] !== true) {
          setBusy(`Approving shares → ${short(op)}`);
          const hash = await walletClient.writeContract({
            address: CTF,
            abi: CTF_ABI,
            functionName: "setApprovalForAll",
            args: [op, true],
            chain: walletClient.chain,
            account: address,
          });
          await publicClient.waitForTransactionReceipt({ hash });
        }
      }
      await refetch();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Approval failed");
    } finally {
      setBusy(null);
    }
  };

  return (
    <section className="rounded-2xl border border-white/10 bg-gradient-to-br from-accent/10 to-transparent p-4 space-y-3">
      <header className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-widest text-accent font-mono">
            Real trading · Polygon
          </p>
          <h3 className="font-display font-bold text-lg mt-1">Prep your wallet for Polymarket</h3>
          <p className="text-xs text-white/60 mt-1">
            One-time setup. Order signing rolls out next.
          </p>
        </div>
        {fullyReady && (
          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 text-[10px] font-mono uppercase tracking-widest px-2 py-1">
            <Check className="size-3" /> Ready
          </span>
        )}
      </header>

      {/* Step 1 — Geo self-attest */}
      <Step
        n={1}
        title="Confirm eligibility"
        done={attested}
        body={
          <label className="flex items-start gap-2 text-xs text-white/80 cursor-pointer">
            <input
              type="checkbox"
              checked={attested}
              onChange={(e) => {
                setAttested(e.target.checked);
                setAttestedState(e.target.checked);
              }}
              className="mt-0.5 size-4 accent-accent"
            />
            <span>
              I am not a US person and not located in any jurisdiction that prohibits Polymarket.
              I understand this is real money and I trade at my own risk.
            </span>
          </label>
        }
      />

      {/* Step 2 — Wallet */}
      <Step
        n={2}
        title="Connect a wallet"
        done={isConnected}
        body={
          isConnected ? (
            <p className="text-xs text-white/60 font-mono">
              {short(address!)} · {connector?.name ?? "wallet"}
            </p>
          ) : (
            <button
              onClick={handleConnect}
              disabled={connectPending}
              className="inline-flex items-center gap-2 rounded-xl bg-white text-black text-xs font-bold uppercase tracking-widest px-3 py-2 disabled:opacity-50"
            >
              {connectPending ? <Loader2 className="size-3 animate-spin" /> : <Wallet className="size-3" />}
              Connect
            </button>
          )
        }
      />

      {/* Step 3 — Chain */}
      <Step
        n={3}
        title="Switch to Polygon"
        done={isConnected && onPolygon}
        disabled={!isConnected}
        body={
          onPolygon ? (
            <p className="text-xs text-emerald-300 font-mono">Connected to Polygon (137)</p>
          ) : (
            <button
              onClick={handleSwitch}
              disabled={!isConnected || switchPending}
              className="inline-flex items-center gap-2 rounded-xl bg-white/10 border border-white/15 text-xs font-bold uppercase tracking-widest px-3 py-2 disabled:opacity-50"
            >
              {switchPending && <Loader2 className="size-3 animate-spin" />} Switch chain
            </button>
          )
        }
      />

      {/* Step 4 — USDC balance */}
      <Step
        n={4}
        title="Fund with USDC.e on Polygon"
        done={(usdcBalance ?? 0n) > 0n}
        disabled={!isConnected || !onPolygon}
        body={
          <div className="space-y-1.5">
            <p className="text-xs font-mono">
              Balance:{" "}
              <span className="text-white">
                {usdcBalance === undefined
                  ? "—"
                  : `${Number(formatUnits(usdcBalance, 6)).toFixed(2)} USDC.e`}
              </span>
            </p>
            <p className="text-[11px] text-white/50">
              Send bridged USDC (USDC.e, not native USDC) to your address on Polygon.
              Bridge from Base or another chain via a service like{" "}
              <a
                href="https://portal.polygon.technology/bridge"
                target="_blank"
                rel="noopener noreferrer"
                className="underline inline-flex items-center gap-0.5"
              >
                Polygon Portal <ExternalLink className="size-2.5" />
              </a>
              .
            </p>
          </div>
        }
      />

      {/* Step 5 — Approvals */}
      <Step
        n={5}
        title="Approve Polymarket contracts"
        done={usdcApproved && ctfApproved}
        disabled={!isConnected || !onPolygon || !attested}
        body={
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-1.5 text-[10px] font-mono">
              <Pill label="USDC allow" ok={usdcApproved} />
              <Pill label="Shares op" ok={ctfApproved} />
            </div>
            <button
              onClick={runApprovals}
              disabled={
                !attested ||
                !isConnected ||
                !onPolygon ||
                !!busy ||
                (usdcApproved && ctfApproved)
              }
              className="inline-flex items-center gap-2 rounded-xl bg-accent text-accent-foreground text-xs font-bold uppercase tracking-widest px-3 py-2 disabled:opacity-40"
            >
              {busy ? <Loader2 className="size-3 animate-spin" /> : null}
              {busy ?? (usdcApproved && ctfApproved ? "All approved" : "Approve all")}
            </button>
            <p className="text-[10px] text-white/40">
              Up to 6 signatures on first setup (3 USDC allowances + 3 share operator flags).
            </p>
          </div>
        }
      />

      {err && (
        <div className="flex items-start gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 p-2.5 text-xs text-rose-200">
          <ShieldAlert className="size-4 shrink-0 mt-0.5" />
          <span className="break-all">{err}</span>
        </div>
      )}

      {fullyReady && (
        <p className="text-[11px] text-white/50">
          Your wallet is ready. In-app YES/NO order signing on Polymarket ships next — for now,
          use the "Trade for real on Polymarket" link on each market.
        </p>
      )}

      {isFetching && !reads && (
        <p className="text-[10px] text-white/30 font-mono">Reading on-chain state…</p>
      )}
    </section>
  );
}

function Step({
  n,
  title,
  done,
  disabled,
  body,
}: {
  n: number;
  title: string;
  done: boolean;
  disabled?: boolean;
  body: React.ReactNode;
}) {
  return (
    <div
      className={`rounded-xl border p-3 space-y-2 transition ${
        done
          ? "border-emerald-500/20 bg-emerald-500/5"
          : disabled
            ? "border-white/5 bg-white/[0.02] opacity-60"
            : "border-white/10 bg-white/[0.03]"
      }`}
    >
      <div className="flex items-center gap-2">
        <span
          className={`inline-flex items-center justify-center size-5 rounded-full text-[10px] font-mono ${
            done ? "bg-emerald-500 text-black" : "bg-white/10 text-white/70"
          }`}
        >
          {done ? <Check className="size-3" /> : n}
        </span>
        <p className="text-xs font-bold uppercase tracking-widest">{title}</p>
      </div>
      <div className="pl-7">{body}</div>
    </div>
  );
}

function Pill({ label, ok }: { label: string; ok: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-1 uppercase tracking-widest ${
        ok
          ? "bg-emerald-500/10 text-emerald-300 border border-emerald-500/30"
          : "bg-white/5 text-white/50 border border-white/10"
      }`}
    >
      {ok ? <Check className="size-2.5" /> : <span className="size-1.5 rounded-full bg-white/30" />}
      {label}
    </span>
  );
}

function short(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}
