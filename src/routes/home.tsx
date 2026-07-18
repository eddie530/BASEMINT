import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useAccount, useBalance, useChainId, useDisconnect } from "wagmi";
import { base, baseSepolia } from "wagmi/chains";
import {
  Compass,
  Rocket,
  Gamepad2,
  Wallet as WalletIcon,
  Sparkles,
  ArrowRight,
  Activity,
  Radio,
  Zap,
  Coins,
  ShoppingCart,
  Users,
  CheckCircle2,
  Share2,
} from "lucide-react";
import { MiniAppShell } from "@/components/MiniAppShell";
import { CoinCard } from "@/components/feed/CoinCard";
import { trendingQO } from "@/components/pages/DiscoverFeed";
import { useConnectWallet } from "@/lib/use-connect-wallet";
import { getPointsSummary, type PointEventDTO, type PointKind } from "@/lib/points.functions";

export const Route = createFileRoute("/home")({
  head: () => ({
    meta: [
      { title: "Home — Resident Labs" },
      {
        name: "description",
        content:
          "Resident Labs — discover, create, play, and earn across the Base ecosystem. BaseMint + SpinBase in one app.",
      },
      { property: "og:title", content: "Home — Resident Labs" },
      {
        property: "og:description",
        content: "Discover, create, play, and earn across the Base ecosystem.",
      },
    ],
  }),
  loader: ({ context }) => {
    void context.queryClient.prefetchQuery(trendingQO);
  },
  component: HomePage,
});

function shortAddr(a?: string) {
  if (!a) return "";
  return `${a.slice(0, 6)}…${a.slice(-4)}`;
}

function networkName(id?: number) {
  if (id === base.id) return "Base";
  if (id === baseSepolia.id) return "Base Sepolia";
  if (!id) return "—";
  return `Chain ${id}`;
}

type ModuleStatus = "live" | "beta" | "demo" | "soon";
const STATUS_STYLE: Record<ModuleStatus, string> = {
  live: "bg-accent/15 text-accent border-accent/30",
  beta: "bg-primary/15 text-primary border-primary/30",
  demo: "bg-yellow-400/10 text-yellow-300 border-yellow-400/30",
  soon: "bg-white/5 text-white/50 border-white/10",
};

function StatusPill({ status }: { status: ModuleStatus }) {
  const label = status === "soon" ? "Coming soon" : status.toUpperCase();
  return (
    <span
      className={`text-[9px] font-mono uppercase tracking-widest px-2 py-0.5 rounded-full border ${STATUS_STYLE[status]}`}
    >
      {label}
    </span>
  );
}

function HomePage() {
  const { address, isConnected, connector } = useAccount();
  const chainId = useChainId();
  const { disconnect } = useDisconnect();
  const { connectWallet, isPending, message } = useConnectWallet();
  const { data: balance } = useBalance({
    address,
    chainId: chainId ?? base.id,
    query: { enabled: Boolean(address) },
  });

  const inFarcaster =
    typeof window !== "undefined" &&
    (Boolean((window as unknown as { ReactNativeWebView?: unknown }).ReactNativeWebView) ||
      /Warpcast|Farcaster/i.test(navigator.userAgent));

  return (
    <MiniAppShell>
      {/* 1. Header */}
      <header className="space-y-3">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-widest text-accent font-mono">
              Resident Labs
            </p>
            <h1 className="font-display font-bold text-2xl md:text-3xl tracking-tight mt-1">
              Resident Labs
            </h1>
            <p className="text-white/60 text-sm mt-1">
              Discover, create, play, and earn across the Base ecosystem.
            </p>
          </div>
        </div>

        {/* Wallet chip row */}
        <div className="flex flex-wrap items-center gap-2">
          {isConnected ? (
            <>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[11px] font-mono">
                <span className="size-1.5 rounded-full bg-accent animate-pulse" />
                {shortAddr(address)}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[11px] font-mono text-white/70">
                <Radio className="size-3" />
                {networkName(chainId)}
              </span>
              {connector?.name ? (
                <span className="inline-flex items-center rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[11px] font-mono text-white/60">
                  {connector.name}
                </span>
              ) : null}
              {inFarcaster ? (
                <span className="inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-3 py-1.5 text-[11px] font-mono text-primary">
                  Farcaster
                </span>
              ) : null}
              <button
                onClick={() => disconnect()}
                className="ml-auto text-[11px] font-mono uppercase tracking-widest text-white/50 hover:text-white/80 transition"
              >
                Disconnect
              </button>
            </>
          ) : (
            <>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-[11px] font-mono text-white/50">
                <span className="size-1.5 rounded-full bg-white/30" />
                Wallet disconnected
              </span>
              <button
                onClick={() => connectWallet()}
                disabled={isPending}
                className="ml-auto px-3 py-1.5 rounded-full bg-accent text-accent-foreground text-[11px] font-bold uppercase tracking-wider disabled:opacity-50"
              >
                {isPending ? "Connecting…" : "Connect wallet"}
              </button>
            </>
          )}
        </div>
        {message ? (
          <p className="text-[11px] font-mono text-white/50">{message}</p>
        ) : null}
      </header>

      {/* 2. Hero */}
      <section className="relative overflow-hidden rounded-3xl border border-accent/20 bg-gradient-to-br from-accent/10 via-black/40 to-primary/10 p-6 md:p-8">
        <div
          className="pointer-events-none absolute -top-24 -right-24 size-64 rounded-full bg-accent/20 blur-3xl"
          aria-hidden="true"
        />
        <p className="text-[10px] uppercase tracking-widest text-accent font-mono">
          Welcome
        </p>
        <h2 className="font-display font-bold text-2xl md:text-3xl mt-2 tracking-tight">
          Welcome to Resident Labs
        </h2>
        <p className="text-white/70 text-sm md:text-base mt-2 max-w-lg">
          Discover tokens, launch onchain assets, play SpinBase, and manage your Base activity
          from one unified app.
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 rounded-full bg-accent text-accent-foreground px-4 py-2 text-xs font-bold uppercase tracking-wider hover:opacity-90 transition"
          >
            Explore Discover <ArrowRight className="size-3.5" />
          </Link>
          <Link
            to="/launch"
            className="inline-flex items-center gap-1.5 rounded-full bg-white text-black px-4 py-2 text-xs font-bold uppercase tracking-wider hover:opacity-90 transition"
          >
            Launch an asset <Rocket className="size-3.5" />
          </Link>
          <Link
            to="/play"
            className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.03] px-4 py-2 text-xs font-bold uppercase tracking-wider text-white/85 hover:bg-white/[0.06] transition"
          >
            Play SpinBase
          </Link>
          <Link
            to="/vault"
            className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.03] px-4 py-2 text-xs font-bold uppercase tracking-wider text-white/85 hover:bg-white/[0.06] transition"
          >
            View Vault
          </Link>
        </div>
      </section>

      {/* 3. Quick Actions */}
      <section>
        <h2 className="font-display font-bold text-lg uppercase tracking-wider mb-3">
          Quick actions
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <QuickAction
            to="/"
            icon={Compass}
            title="Discover tokens"
            desc="Live Zora coins on Base."
          />
          <QuickAction
            to="/launch"
            icon={Rocket}
            title="Launch a token"
            desc="ERC-20 or NFT in seconds."
          />
          <QuickAction
            to="/play"
            icon={Gamepad2}
            title="Play SpinBase"
            desc="Onchain games & campaigns."
            status="soon"
          />
          <QuickAction
            to="/vault"
            icon={WalletIcon}
            title="View Vault"
            desc="Assets, rewards, activity."
            status="beta"
          />
          <QuickAction
            to="/ai"
            icon={Sparkles}
            title="Resident AI"
            desc="Ask about Base & tokens."
            status="soon"
          />
        </div>
      </section>

      {/* 4. Trending on Base */}
      <TrendingPreview />

      {/* 5. Resident Labs modules */}
      <section>
        <h2 className="font-display font-bold text-lg uppercase tracking-wider mb-3">
          Resident Labs modules
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <ModuleCard
            to="/"
            title="BaseMint"
            desc="Discover and launch onchain assets."
            status="live"
          />
          <ModuleCard
            to="/play"
            title="SpinBase"
            desc="Play games, complete campaigns, and earn rewards."
            status="soon"
          />
          <ModuleCard
            to="/vault"
            title="Resident Vault"
            desc="Track assets, activity, rewards, and created tokens."
            status="beta"
          />
          <ModuleCard
            to="/ai"
            title="Resident AI"
            desc="Learn about Base, tokens, wallets, and Resident Labs features."
            status="soon"
          />
        </div>
      </section>

      {/* 6. Wallet overview */}
      <section>
        <h2 className="font-display font-bold text-lg uppercase tracking-wider mb-3">
          Wallet
        </h2>
        <div className="rounded-3xl border border-white/10 bg-white/[0.02] p-5">
          {isConnected ? (
            <div className="grid grid-cols-2 gap-4">
              <Metric label="Address" value={shortAddr(address)} mono />
              <Metric label="Network" value={networkName(chainId)} />
              <Metric
                label="Balance"
                value={
                  balance
                    ? `${Number(balance.formatted).toLocaleString(undefined, {
                        maximumFractionDigits: 4,
                      })} ${balance.symbol}`
                    : "—"
                }
              />
              <Metric label="Connector" value={connector?.name ?? "—"} />
              <div className="col-span-2">
                <Link
                  to="/profile"
                  className="inline-flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-widest text-accent hover:text-accent/80"
                >
                  Open profile <ArrowRight className="size-3" />
                </Link>
              </div>
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="text-sm text-white/70">
                Connect a wallet to see your Base balance and identity.
              </p>
              <button
                onClick={() => connectWallet()}
                disabled={isPending}
                className="mt-4 px-4 py-2 rounded-full bg-accent text-accent-foreground text-xs font-bold uppercase tracking-wider disabled:opacity-50"
              >
                {isPending ? "Connecting…" : "Connect wallet"}
              </button>
            </div>
          )}
        </div>
      </section>

      {/* 7. Recent Activity */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display font-bold text-lg uppercase tracking-wider">
            Recent activity
          </h2>
          <Link
            to="/vault"
            className="text-[11px] font-mono uppercase tracking-widest text-accent hover:text-accent/80"
          >
            View activity →
          </Link>
        </div>
        <div className="rounded-3xl border border-white/10 bg-white/[0.02] p-6 text-center">
          <Activity className="size-6 text-white/30 mx-auto mb-2" />
          <p className="text-sm text-white/60">
            Your Resident Labs activity will appear here.
          </p>
        </div>
      </section>

      {/* 8. Ecosystem status */}
      <section>
        <h2 className="font-display font-bold text-lg uppercase tracking-wider mb-3">
          Ecosystem status
        </h2>
        <div className="grid grid-cols-2 gap-2">
          <StatusRow
            label="Base network"
            state={chainId === base.id ? "ok" : chainId === baseSepolia.id ? "warn" : "idle"}
            value={networkName(chainId)}
          />
          <StatusRow
            label="Wallet"
            state={isConnected ? "ok" : "idle"}
            value={isConnected ? "Connected" : "Disconnected"}
          />
          <StatusRow
            label="Farcaster"
            state={inFarcaster ? "ok" : "idle"}
            value={inFarcaster ? "Detected" : "Not detected"}
          />
          <StatusRow
            label="Base App"
            state={connector?.id?.includes("coinbase") ? "ok" : "idle"}
            value={connector?.id?.includes("coinbase") ? "Smart Wallet" : "Not detected"}
          />
        </div>
      </section>
    </MiniAppShell>
  );
}

function QuickAction({
  to,
  icon: Icon,
  title,
  desc,
  status,
}: {
  to: string;
  icon: typeof Compass;
  title: string;
  desc: string;
  status?: ModuleStatus;
}) {
  const isSoon = status === "soon";
  const content = (
    <>
      <div className="flex items-center justify-between mb-3">
        <div className="size-9 rounded-xl bg-accent/15 grid place-items-center text-accent">
          <Icon className="size-4" strokeWidth={2.4} />
        </div>
        {status ? <StatusPill status={status} /> : null}
      </div>
      <p className="font-bold text-sm">{title}</p>
      <p className="text-[11px] text-white/50 mt-0.5">{desc}</p>
    </>
  );
  const cls =
    "group rounded-2xl border border-white/10 bg-black/40 p-4 transition min-w-0 " +
    (isSoon
      ? "opacity-70 cursor-default"
      : "hover:border-accent/40 active:border-accent/60");
  if (isSoon) {
    return (
      <div className={cls} aria-disabled="true">
        {content}
      </div>
    );
  }
  return (
    <Link to={to} className={cls}>
      {content}
    </Link>
  );
}

function ModuleCard({
  to,
  title,
  desc,
  status,
}: {
  to: string;
  title: string;
  desc: string;
  status: ModuleStatus;
}) {
  const disabled = status === "soon";
  const inner = (
    <>
      <div className="flex items-center justify-between mb-2">
        <p className="font-display font-bold text-base">{title}</p>
        <StatusPill status={status} />
      </div>
      <p className="text-[13px] text-white/60">{desc}</p>
    </>
  );
  const cls =
    "block rounded-2xl border border-white/10 bg-white/[0.02] p-5 transition " +
    (disabled ? "opacity-70" : "hover:border-accent/40");
  if (disabled) return <div className={cls}>{inner}</div>;
  return (
    <Link to={to} className={cls}>
      {inner}
    </Link>
  );
}

function Metric({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] uppercase tracking-widest text-white/40 font-mono">{label}</p>
      <p className={`text-sm truncate mt-1 ${mono ? "font-mono" : ""}`}>{value}</p>
    </div>
  );
}

function StatusRow({
  label,
  state,
  value,
}: {
  label: string;
  state: "ok" | "warn" | "idle";
  value: string;
}) {
  const dot =
    state === "ok"
      ? "bg-accent animate-pulse"
      : state === "warn"
        ? "bg-yellow-400"
        : "bg-white/25";
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-3">
      <div className="flex items-center gap-2">
        <span className={`size-1.5 rounded-full ${dot}`} />
        <p className="text-[10px] uppercase tracking-widest text-white/40 font-mono">{label}</p>
      </div>
      <p className="text-sm mt-1 truncate">{value}</p>
    </div>
  );
}

function TrendingPreview() {
  const { data: trending } = useSuspenseQuery(trendingQO);
  const preview = trending.slice(0, 4);
  return (
    <section>
      <div className="flex items-end justify-between mb-3 gap-3">
        <div className="min-w-0">
          <h2 className="font-display font-bold text-lg uppercase tracking-wider flex items-center gap-2">
            <Zap className="size-4 text-accent" />
            Trending on Base
          </h2>
          <p className="text-[10px] uppercase tracking-widest text-white/40 font-mono mt-0.5">
            Powered by BaseMint
          </p>
        </div>
        <Link
          to="/"
          className="shrink-0 text-[11px] font-mono uppercase tracking-widest text-accent hover:text-accent/80"
        >
          View all →
        </Link>
      </div>
      {preview.length === 0 ? (
        <p className="text-sm text-white/50 font-mono">Zora feed temporarily unavailable.</p>
      ) : (
        <div className="space-y-4">
          {preview.map((coin) => (
            <CoinCard key={coin.address} coin={coin} />
          ))}
        </div>
      )}
    </section>
  );
}
