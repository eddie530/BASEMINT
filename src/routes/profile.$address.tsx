import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery, useQuery } from "@tanstack/react-query";
import { MiniAppShell } from "@/components/MiniAppShell";
import { CoinCard } from "@/components/feed/CoinCard";
import { ProfileContractsPanel } from "@/components/profile/ProfileContractsPanel";
import { getCoinsByCreator } from "@/lib/zora.functions";
import { getProfile, getReferralStats } from "@/lib/profiles.functions";
import { Globe, Twitter } from "lucide-react";

const addrRegex = /^0x[a-fA-F0-9]{40}$/;

const profileQO = (address: string) =>
  queryOptions({
    queryKey: ["profile", address.toLowerCase()],
    queryFn: () => getProfile({ data: { address } }),
    staleTime: 60_000,
  });

const creatorCoinsQO = (address: string) =>
  queryOptions({
    queryKey: ["creator-coins", address.toLowerCase()],
    queryFn: () => getCoinsByCreator({ data: { address, count: 20 } }),
    staleTime: 30_000,
  });

const refStatsQO = (address: string) =>
  queryOptions({
    queryKey: ["ref-stats", address.toLowerCase()],
    queryFn: () => getReferralStats({ data: { address } }),
    staleTime: 30_000,
  });

export const Route = createFileRoute("/profile/$address")({
  head: ({ params }) => {
    const short = `${params.address.slice(0, 6)}…${params.address.slice(-4)}`;
    const url = `https://foxy-token-forge.lovable.app/profile/${params.address}`;
    return {
      meta: [
        { title: `${short} · Basemint Profile` },
        { name: "description", content: `Creator profile and Zora coins by ${short} on Base.` },
        { property: "og:title", content: `${short} · Basemint Profile` },
        {
          property: "og:description",
          content: `Creator profile and Zora coins by ${short} on Base.`,
        },
        { property: "og:url", content: url },
      ],
      links: [{ rel: "canonical", href: url }],
    };
  },
  beforeLoad: ({ params }) => {
    if (!addrRegex.test(params.address)) throw notFound();
  },
  loader: ({ params, context }) => {
    void context.queryClient.prefetchQuery(profileQO(params.address));
    void context.queryClient.prefetchQuery(creatorCoinsQO(params.address));
  },
  notFoundComponent: () => (
    <MiniAppShell>
      <p className="text-white/60">Invalid wallet address.</p>
    </MiniAppShell>
  ),
  errorComponent: ({ error }) => (
    <MiniAppShell>
      <p className="text-destructive text-sm">{error.message}</p>
    </MiniAppShell>
  ),
  component: ProfilePage,
});

function ProfilePage() {
  const { address } = Route.useParams();
  const { data: profile } = useSuspenseQuery(profileQO(address));
  const { data: coins } = useSuspenseQuery(creatorCoinsQO(address));
  const refStats = useQuery(refStatsQO(address));

  const display = profile?.display_name ?? `${address.slice(0, 6)}…${address.slice(-4)}`;
  const avatar =
    profile?.avatar_url ??
    `https://api.dicebear.com/9.x/shapes/svg?seed=${address}&backgroundColor=0052ff,00ffd1`;
  const refUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/?ref=${address.slice(2, 10).toLowerCase()}`
      : `https://foxy-token-forge.lovable.app/?ref=${address.slice(2, 10).toLowerCase()}`;

  return (
    <MiniAppShell>
      <section className="bg-card border border-white/5 rounded-3xl p-5 space-y-4">
        <div className="flex items-start gap-4">
          <img src={avatar} alt={display} className="size-16 rounded-2xl object-cover" />
          <div className="flex-1 min-w-0">
            <h1 className="font-display font-bold text-xl truncate">{display}</h1>
            <p className="text-[11px] font-mono text-white/40 break-all">{address}</p>
          </div>
        </div>
        {profile?.bio && <p className="text-sm text-white/70">{profile.bio}</p>}
        <div className="flex flex-wrap gap-2 text-xs">
          {profile?.twitter && (
            <a
              href={`https://x.com/${profile.twitter.replace(/^@/, "")}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 bg-white/5 px-3 py-1.5 rounded-full text-white/70 hover:text-white"
            >
              <Twitter className="size-3.5" /> @{profile.twitter.replace(/^@/, "")}
            </a>
          )}
          {profile?.farcaster && (
            <a
              href={`https://warpcast.com/${profile.farcaster.replace(/^@/, "")}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 bg-white/5 px-3 py-1.5 rounded-full text-white/70 hover:text-white"
            >
              <span className="font-mono">fc</span> @{profile.farcaster.replace(/^@/, "")}
            </a>
          )}
          {profile?.website && (
            <a
              href={profile.website}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 bg-white/5 px-3 py-1.5 rounded-full text-white/70 hover:text-white"
            >
              <Globe className="size-3.5" /> Site
            </a>
          )}
          <Link
            to="/settings/profile"
            search={{ address }}
            className="inline-flex items-center gap-1.5 bg-accent/20 text-accent px-3 py-1.5 rounded-full font-bold uppercase tracking-widest"
          >
            Edit
          </Link>
        </div>
      </section>

      <section className="bg-card border border-white/5 rounded-3xl p-5">
        <h2 className="font-display font-bold text-sm uppercase tracking-widest mb-3">Referral</h2>
        <div className="grid grid-cols-3 gap-2 text-center">
          <RefStat label="Visits" value={refStats.data?.totals.visit ?? 0} />
          <RefStat label="Connects" value={refStats.data?.totals.connect ?? 0} />
          <RefStat label="Trades" value={refStats.data?.totals.trade ?? 0} />
        </div>
        <button
          onClick={() => {
            if (typeof navigator !== "undefined") void navigator.clipboard?.writeText(refUrl);
          }}
          className="mt-3 w-full text-[11px] font-mono text-white/70 bg-white/5 hover:bg-white/10 px-3 py-2 rounded-lg break-all text-left"
        >
          {refUrl}
        </button>
      </section>

      <ProfileContractsPanel wallet={address} editable={false} />

      <section>
        <h2 className="font-display font-bold text-lg uppercase tracking-wider mb-3">
          Coins by creator
        </h2>
        {coins.length === 0 ? (
          <p className="text-sm text-white/40 font-mono">No Zora coins from this address yet.</p>
        ) : (
          <div className="space-y-4">
            {coins.map((c) => (
              <CoinCard key={c.address} coin={c} />
            ))}
          </div>
        )}
      </section>
    </MiniAppShell>
  );
}

function RefStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-white/5 rounded-xl py-2.5 border border-white/5">
      <p className="text-[9px] uppercase tracking-widest text-white/40 font-mono">{label}</p>
      <p className="font-display font-bold text-sm mt-0.5">{value.toLocaleString()}</p>
    </div>
  );
}
