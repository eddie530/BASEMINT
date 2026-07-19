import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
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
  Search as SearchIcon,
  History,
  Flame,
  Circle,
  Check,
  Bell,
  Star,
  Trophy,
  X,
} from "lucide-react";
import { trackDashboard } from "@/lib/dashboard-analytics";
import { MiniAppShell } from "@/components/MiniAppShell";
import { CoinCard } from "@/components/feed/CoinCard";
import { trendingQO } from "@/components/pages/DiscoverFeed";
import { useConnectWallet } from "@/lib/use-connect-wallet";
import {
  getPointsSummary,
  type PointEventDTO,
  type PointKind,
  type PointsSummary,
} from "@/lib/points.functions";
import { readLastAction, type LastAction } from "@/lib/last-action";
import type { CoinDTO } from "@/lib/zora.types";

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

  // Last-action lives in localStorage; read after hydration to avoid mismatch.
  const [lastAction, setLastAction] = useState<LastAction | null>(null);
  const [onboardingDismissed, setOnboardingDismissed] = useState(true);
  useEffect(() => {
    setLastAction(readLastAction());
    try {
      setOnboardingDismissed(
        window.localStorage.getItem("rl_onboarding_dismissed") === "1",
      );
    } catch {
      // ignore
    }
    trackDashboard({ type: "dashboard_viewed" });
  }, []);

  // Points summary — powers activity, streak, onboarding gate.
  const fetchSummary = useServerFn(getPointsSummary);
  const {
    data: summary,
    isLoading: summaryLoading,
    error: summaryError,
  } = useQuery({
    queryKey: ["points-summary", address?.toLowerCase()],
    queryFn: () => fetchSummary({ data: { address: address! } }),
    enabled: Boolean(isConnected && address),
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });

  const hasLaunched = Boolean(
    summary?.recent.some((e) => e.kind === "create_coin"),
  );
  const hasAnyActivity = Boolean(summary && summary.recent.length > 0);
  const isNewUser =
    isConnected && !summaryLoading && !hasAnyActivity && !lastAction;

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
          <NotificationBell />
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

      {/* Universal search */}
      <UniversalSearch />

      {/* 2. Hero + persistent primary action */}
      <SmartHero
        isConnected={isConnected}
        hasAnyActivity={hasAnyActivity}
        hasLaunched={hasLaunched}
        onConnect={() => connectWallet()}
        isPending={isPending}
      />

      {/* Continue where you left off — only when real local state exists */}
      {lastAction ? <ContinueCard action={lastAction} /> : null}

      {/* Personalized onboarding — only for genuinely new users, dismissible */}
      {isNewUser && !onboardingDismissed ? (
        <OnboardingChecklist
          isConnected={isConnected}
          inFarcaster={inFarcaster}
          hasViewedToken={Boolean(lastAction)}
          hasLaunched={hasLaunched}
          onDismiss={() => {
            try {
              window.localStorage.setItem("rl_onboarding_dismissed", "1");
            } catch {
              // ignore
            }
            setOnboardingDismissed(true);
            trackDashboard({ type: "onboarding_dismissed" });
          }}
        />
      ) : null}

      {/* Resident Labs Today — compact daily strip; only renders if real */}
      <ResidentLabsToday summary={summary} />

      {/* Watchlist preview — honest empty state until a real backend exists */}
      <WatchlistPreview />

      {/* Active quests — Coming Soon until secure event tracking is live */}
      <ActiveQuests />


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
      <RecentActivity
        isConnected={isConnected}
        isLoading={summaryLoading}
        error={summaryError as unknown}
        events={summary?.recent ?? []}
      />

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

      {/*
        Deferred (require real backends before shipping):
        - Watchlist movement (no watchlist table)
        - Quests card (quests table is empty)
        - Notifications center (no notifications backend)
        - Ecosystem stats row (no aggregate data source)
      */}
    </MiniAppShell>
  );
}

// -----------------------------------------------------------------------------
// Universal search — reuses the existing /search route.
// -----------------------------------------------------------------------------
function UniversalSearch() {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const trimmed = q.trim();
        if (!trimmed) return;
        trackDashboard({ type: "search_used", length: trimmed.length });
        void navigate({ to: "/search", search: { q: trimmed, type: "all", page: 1 } });
      }}
      className="relative"
      role="search"
    >
      <SearchIcon className="size-4 text-white/40 absolute left-4 top-1/2 -translate-y-1/2" />
      <input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search tokens, addresses…"
        aria-label="Search Resident Labs"
        className="w-full rounded-2xl border border-white/10 bg-white/[0.03] pl-11 pr-4 py-3 text-sm text-white placeholder:text-white/40 focus:outline-none focus:border-accent/50 transition"
      />
      <p className="text-[10px] font-mono uppercase tracking-widest text-white/35 mt-2 px-1">
        Basenames & Farcaster profiles coming soon
      </p>
    </form>
  );
}

// -----------------------------------------------------------------------------
// Smart Hero — persistent primary action that adapts to user state.
// -----------------------------------------------------------------------------
function SmartHero({
  isConnected,
  hasAnyActivity,
  hasLaunched,
  onConnect,
  isPending,
}: {
  isConnected: boolean;
  hasAnyActivity: boolean;
  hasLaunched: boolean;
  onConnect: () => void;
  isPending: boolean;
}) {
  let primary: {
    label: string;
    to?: string;
    onClick?: () => void;
    icon?: typeof ArrowRight;
  };
  if (!isConnected) {
    primary = {
      label: isPending ? "Connecting…" : "Connect wallet",
      onClick: onConnect,
    };
  } else if (hasLaunched) {
    primary = { label: "Launch an asset", to: "/launch", icon: Rocket };
  } else if (hasAnyActivity) {
    primary = { label: "Continue exploring", to: "/discover", icon: ArrowRight };
  } else {
    primary = { label: "Explore Base", to: "/", icon: Compass };
  }

  return (
    <section className="relative overflow-hidden rounded-3xl border border-accent/20 bg-gradient-to-br from-accent/10 via-black/40 to-primary/10 p-6 md:p-8">
      <div
        className="pointer-events-none absolute -top-24 -right-24 size-64 rounded-full bg-accent/20 blur-3xl"
        aria-hidden="true"
      />
      <p className="text-[10px] uppercase tracking-widest text-accent font-mono">Welcome</p>
      <h2 className="font-display font-bold text-2xl md:text-3xl mt-2 tracking-tight">
        Welcome to Resident Labs
      </h2>
      <p className="text-white/70 text-sm md:text-base mt-2 max-w-lg">
        Discover tokens, launch onchain assets, play SpinBase, and manage your Base activity
        from one unified app.
      </p>
      <div className="mt-5 flex flex-wrap gap-2">
        {primary.to ? (
          <Link
            to={primary.to}
            className="inline-flex items-center gap-1.5 rounded-full bg-accent text-accent-foreground px-4 py-2 text-xs font-bold uppercase tracking-wider hover:opacity-90 transition"
          >
            {primary.label}
            {primary.icon ? <primary.icon className="size-3.5" /> : null}
          </Link>
        ) : (
          <button
            onClick={primary.onClick}
            disabled={isPending}
            className="inline-flex items-center gap-1.5 rounded-full bg-accent text-accent-foreground px-4 py-2 text-xs font-bold uppercase tracking-wider hover:opacity-90 transition disabled:opacity-50"
          >
            {primary.label}
          </button>
        )}
        <Link
          to="/launch"
          className="inline-flex items-center gap-1.5 rounded-full bg-white text-black px-4 py-2 text-xs font-bold uppercase tracking-wider hover:opacity-90 transition"
        >
          Launch <Rocket className="size-3.5" />
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
  );
}

// -----------------------------------------------------------------------------
// Continue where you left off
// -----------------------------------------------------------------------------
const LAST_ACTION_LABELS: Record<LastAction["kind"], string> = {
  view_coin: "Last viewed",
  create_coin: "You launched",
  create_nft: "You launched",
};

function ContinueCard({ action }: { action: LastAction }) {
  return (
    <section>
      <h2 className="font-display font-bold text-lg uppercase tracking-wider mb-3 flex items-center gap-2">
        <History className="size-4 text-accent" />
        Continue where you left off
      </h2>
      <Link
        to={action.href}
        className="flex items-center gap-4 rounded-3xl border border-white/10 bg-white/[0.03] p-4 hover:border-accent/40 transition"
      >
        <div className="size-12 rounded-2xl bg-accent/15 grid place-items-center text-accent shrink-0">
          <History className="size-5" strokeWidth={2.4} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] uppercase tracking-widest text-white/40 font-mono">
            {LAST_ACTION_LABELS[action.kind]}
          </p>
          <p className="text-sm font-semibold truncate mt-0.5">
            {action.label ?? shortAddr(action.ref)}
          </p>
          {action.sub ? (
            <p className="text-[11px] text-white/50 font-mono truncate">{action.sub}</p>
          ) : null}
        </div>
        <ArrowRight className="size-4 text-white/40 shrink-0" />
      </Link>
    </section>
  );
}

// -----------------------------------------------------------------------------
// Onboarding checklist — for genuinely new, connected users only.
// -----------------------------------------------------------------------------
type ChecklistItem = {
  label: string;
  done: boolean;
  to?: string;
  soon?: boolean;
};

function OnboardingChecklist({
  isConnected,
  inFarcaster,
  hasViewedToken,
  hasLaunched,
  onDismiss,
}: {
  isConnected: boolean;
  inFarcaster: boolean;
  hasViewedToken: boolean;
  hasLaunched: boolean;
  onDismiss: () => void;
}) {
  const items: ChecklistItem[] = [
    { label: "Connect wallet", done: isConnected },
    {
      label: inFarcaster ? "Open in Farcaster" : "Open in Farcaster (coming soon)",
      done: inFarcaster,
    },
    { label: "Explore a token", done: hasViewedToken, to: "/" },
    { label: "Save an asset", done: false, soon: true },
    { label: "Try SpinBase", done: false, soon: true },
    { label: "Launch your first asset", done: hasLaunched, to: "/launch" },
  ];
  const doneCount = items.filter((i) => i.done).length;
  const pct = Math.round((doneCount / items.length) * 100);

  return (
    <section>
      <div className="flex items-end justify-between mb-3">
        <div>
          <h2 className="font-display font-bold text-lg uppercase tracking-wider">
            Get started
          </h2>
          <p className="text-[10px] uppercase tracking-widest text-white/40 font-mono mt-0.5">
            {doneCount} of {items.length} complete
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[11px] font-mono text-accent">{pct}%</span>
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Dismiss onboarding"
            className="size-6 grid place-items-center rounded-full border border-white/10 text-white/50 hover:text-white hover:border-white/30 transition"
          >
            <X className="size-3" />
          </button>
        </div>
      </div>
      <div className="rounded-3xl border border-white/10 bg-white/[0.02] overflow-hidden">
        <div className="h-1 bg-white/5">
          <div
            className="h-full bg-accent transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
        <ul className="divide-y divide-white/5">
          {items.map((item) => {
            const row = (
              <div className="flex items-center gap-3 px-4 py-3">
                {item.done ? (
                  <Check
                    className="size-4 text-accent shrink-0"
                    strokeWidth={3}
                  />
                ) : (
                  <Circle className="size-4 text-white/25 shrink-0" />
                )}
                <span
                  className={`text-sm flex-1 truncate ${item.done ? "text-white/50 line-through" : "text-white/85"}`}
                >
                  {item.label}
                </span>
                {item.soon ? (
                  <StatusPill status="soon" />
                ) : !item.done && item.to ? (
                  <ArrowRight className="size-4 text-white/40" />
                ) : null}
              </div>
            );
            if (!item.done && item.to && !item.soon) {
              return (
                <li key={item.label}>
                  <Link
                    to={item.to}
                    className="block hover:bg-white/[0.03] transition"
                  >
                    {row}
                  </Link>
                </li>
              );
            }
            return <li key={item.label}>{row}</li>;
          })}
        </ul>
      </div>
    </section>
  );
}

// -----------------------------------------------------------------------------
// Resident Labs Today — real-data-only daily strip.
// -----------------------------------------------------------------------------
function ResidentLabsToday({
  summary,
}: {
  summary: PointsSummary | undefined;
}) {
  const { data: trending } = useSuspenseQuery(trendingQO);

  // Pick a "new launch" via createdAt when available; otherwise fall back to
  // the last item in the trending set as a rough recency proxy.
  const withCreated = useMemo(
    () =>
      [...trending]
        .filter((c) => Boolean(c.createdAt))
        .sort(
          (a, b) =>
            new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime(),
        ),
    [trending],
  );
  const trendingTop: CoinDTO | undefined = trending[0];
  const newLaunch: CoinDTO | undefined = withCreated[0];
  const streak = summary?.daily?.streak ?? 0;

  const tiles: React.ReactNode[] = [];
  if (trendingTop) {
    tiles.push(
      <TodayTile
        key="trending"
        to={`/coin/${trendingTop.address}`}
        icon={Flame}
        header="Trending"
        title={trendingTop.name}
        sub={trendingTop.symbol ? `$${trendingTop.symbol}` : undefined}
      />,
    );
  }
  if (newLaunch && newLaunch.address !== trendingTop?.address) {
    tiles.push(
      <TodayTile
        key="new"
        to={`/coin/${newLaunch.address}`}
        icon={Rocket}
        header="New launch"
        title={newLaunch.name}
        sub={newLaunch.symbol ? `$${newLaunch.symbol}` : undefined}
      />,
    );
  }
  if (streak > 0) {
    tiles.push(
      <TodayTile
        key="streak"
        to="/points"
        icon={Zap}
        header="Your streak"
        title={`${streak} day${streak === 1 ? "" : "s"}`}
        sub="Keep it going"
      />,
    );
  }
  if (tiles.length === 0) return null;

  return (
    <section>
      <h2 className="font-display font-bold text-lg uppercase tracking-wider mb-3">
        Resident Labs today
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
        {tiles}
      </div>
    </section>
  );
}

function TodayTile({
  to,
  icon: Icon,
  header,
  title,
  sub,
}: {
  to: string;
  icon: typeof Flame;
  header: string;
  title: string;
  sub?: string;
}) {
  return (
    <Link
      to={to}
      className="group rounded-2xl border border-white/10 bg-white/[0.02] p-4 hover:border-accent/40 transition min-w-0"
    >
      <div className="flex items-center gap-2 mb-3">
        <Icon className="size-3.5 text-accent" strokeWidth={2.4} />
        <p className="text-[10px] uppercase tracking-widest text-white/50 font-mono">
          {header}
        </p>
      </div>
      <p className="text-sm font-semibold truncate">{title}</p>
      {sub ? (
        <p className="text-[11px] text-white/50 font-mono truncate mt-0.5">{sub}</p>
      ) : null}
    </Link>
  );
}

// -----------------------------------------------------------------------------
// Existing helpers below (unchanged behavior).
// -----------------------------------------------------------------------------
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
    <Link
      to={to}
      onClick={() => trackDashboard({ type: "quick_action_selected", id: title })}
      className={cls}
    >
      {content}
    </Link>
  );
}
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

const KIND_META: Record<PointKind, { icon: typeof Coins; label: string; tone: string }> = {
  create_coin: { icon: Rocket, label: "Launched a coin", tone: "text-accent" },
  buy_coin: { icon: ShoppingCart, label: "Bought a coin", tone: "text-primary" },
  referral_signup: { icon: Users, label: "Referral signup", tone: "text-white/80" },
  referral_mint: { icon: Users, label: "Referral mint", tone: "text-accent" },
  daily_checkin: { icon: CheckCircle2, label: "Daily check-in", tone: "text-primary" },
  share_cast: { icon: Share2, label: "Shared a cast", tone: "text-white/80" },
};

function timeAgo(iso: string): string {
  const s = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

function RecentActivity({
  isConnected,
  isLoading,
  error,
  events,
}: {
  isConnected: boolean;
  isLoading: boolean;
  error: unknown;
  events: PointEventDTO[];
}) {
  const list = events.slice(0, 6);
  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-display font-bold text-lg uppercase tracking-wider">
          Recent activity
        </h2>
        <Link
          to="/points"
          className="text-[11px] font-mono uppercase tracking-widest text-accent hover:text-accent/80"
        >
          View all →
        </Link>
      </div>

      {!isConnected ? (
        <div className="rounded-3xl border border-white/10 bg-white/[0.02] p-6 text-center">
          <Activity className="size-6 text-white/30 mx-auto mb-2" />
          <p className="text-sm text-white/60">
            Connect a wallet to see your Resident Labs activity.
          </p>
        </div>
      ) : isLoading ? (
        <div className="rounded-3xl border border-white/10 bg-white/[0.02] p-6 text-center">
          <p className="text-sm text-white/50 font-mono">Loading activity…</p>
        </div>
      ) : error ? (
        <div className="rounded-3xl border border-white/10 bg-white/[0.02] p-6 text-center">
          <p className="text-sm text-white/50 font-mono">Couldn't load activity.</p>
        </div>
      ) : list.length === 0 ? (
        <div className="rounded-3xl border border-white/10 bg-white/[0.02] p-6 text-center">
          <Activity className="size-6 text-white/30 mx-auto mb-2" />
          <p className="text-sm text-white/60">
            No activity yet. Launch a coin, trade, or claim your daily check-in.
          </p>
          <div className="mt-4 flex flex-wrap gap-2 justify-center">
            <Link
              to="/launch"
              className="px-3 py-1.5 rounded-full bg-accent text-accent-foreground text-[11px] font-bold uppercase tracking-wider"
            >
              Launch
            </Link>
            <Link
              to="/points"
              className="px-3 py-1.5 rounded-full border border-white/15 text-[11px] font-bold uppercase tracking-wider text-white/85"
            >
              Daily check-in
            </Link>
          </div>
        </div>
      ) : (
        <ul className="rounded-3xl border border-white/10 bg-white/[0.02] divide-y divide-white/5 overflow-hidden">
          {list.map((e) => {
            const meta = KIND_META[e.kind] ?? {
              icon: Activity,
              label: e.kind,
              tone: "text-white/80",
            };
            const Icon = meta.icon;
            return (
              <li key={e.id} className="flex items-center gap-3 px-4 py-3">
                <div
                  className={`size-9 rounded-xl bg-white/[0.04] border border-white/10 grid place-items-center ${meta.tone}`}
                >
                  <Icon className="size-4" strokeWidth={2.4} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm truncate">{meta.label}</p>
                  <p className="text-[10px] uppercase tracking-widest text-white/40 font-mono mt-0.5">
                    {timeAgo(e.created_at)}
                  </p>
                </div>
                <span className="text-[11px] font-mono font-bold text-accent shrink-0">
                  +{e.points}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

// -----------------------------------------------------------------------------
// Notification bell — honest empty state until a real notifications backend.
// -----------------------------------------------------------------------------
function NotificationBell() {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative shrink-0">
      <button
        type="button"
        aria-label="Notifications"
        onClick={() => {
          setOpen((v) => !v);
          if (!open) trackDashboard({ type: "notifications_opened" });
        }}
        className="size-10 grid place-items-center rounded-full border border-white/10 bg-white/[0.03] text-white/70 hover:text-white hover:border-white/30 transition"
      >
        <Bell className="size-4" />
      </button>
      {open ? (
        <div
          role="dialog"
          aria-label="Notifications"
          className="absolute right-0 mt-2 w-72 rounded-2xl border border-white/10 bg-black/90 backdrop-blur p-4 shadow-2xl z-30"
        >
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] uppercase tracking-widest text-white/50 font-mono">
              Notifications
            </p>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-white/50 hover:text-white"
              aria-label="Close notifications"
            >
              <X className="size-3.5" />
            </button>
          </div>
          <div className="py-6 text-center">
            <Bell className="size-5 text-white/25 mx-auto mb-2" />
            <p className="text-sm text-white/60">You're all caught up.</p>
            <p className="text-[11px] text-white/40 font-mono mt-1">
              Launch & trade alerts coming soon.
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}

// -----------------------------------------------------------------------------
// Watchlist preview — no backend yet; invite users to save from Discover.
// -----------------------------------------------------------------------------
function WatchlistPreview() {
  return (
    <section>
      <div className="flex items-end justify-between mb-3">
        <h2 className="font-display font-bold text-lg uppercase tracking-wider flex items-center gap-2">
          <Star className="size-4 text-accent" />
          Watchlist
        </h2>
        <StatusPill status="soon" />
      </div>
      <div className="rounded-3xl border border-white/10 bg-white/[0.02] p-6 text-center">
        <Star className="size-6 text-white/30 mx-auto mb-2" />
        <p className="text-sm text-white/70">
          No saved assets yet.
        </p>
        <p className="text-[11px] text-white/45 font-mono mt-1">
          Save tokens from Discover to track them here.
        </p>
        <Link
          to="/"
          onClick={() => trackDashboard({ type: "watchlist_cta_selected" })}
          className="inline-flex mt-4 items-center gap-1.5 px-3 py-1.5 rounded-full bg-accent text-accent-foreground text-[11px] font-bold uppercase tracking-wider"
        >
          Browse Discover <ArrowRight className="size-3" />
        </Link>
      </div>
    </section>
  );
}

// -----------------------------------------------------------------------------
// Active Quests — disabled until secure server-side event tracking exists.
// -----------------------------------------------------------------------------
function ActiveQuests() {
  const quests = [
    "Explore three tokens",
    "Save your first asset",
    "Complete your profile",
    "Try SpinBase",
    "Launch your first asset",
  ];
  return (
    <section>
      <div className="flex items-end justify-between mb-3">
        <h2 className="font-display font-bold text-lg uppercase tracking-wider flex items-center gap-2">
          <Trophy className="size-4 text-accent" />
          Active quests
        </h2>
        <StatusPill status="soon" />
      </div>
      <div className="rounded-3xl border border-white/10 bg-white/[0.02] overflow-hidden opacity-80">
        <ul className="divide-y divide-white/5">
          {quests.map((q) => (
            <li
              key={q}
              className="flex items-center gap-3 px-4 py-3"
              aria-disabled="true"
            >
              <Circle className="size-4 text-white/20 shrink-0" />
              <span className="text-sm text-white/60 flex-1 truncate">{q}</span>
              <span className="text-[10px] font-mono uppercase tracking-widest text-white/40">
                Soon
              </span>
            </li>
          ))}
        </ul>
      </div>
      <p className="text-[11px] text-white/40 font-mono mt-2 px-1">
        Quests unlock once secure onchain event tracking is live.
      </p>
    </section>
  );
}

