import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check, Crown, Loader2, Settings, Sparkles, Zap, X, ArrowUpRight, TrendingUp } from "lucide-react";
import { MiniAppShell } from "@/components/MiniAppShell";
import { Button } from "@/components/ui/button";
import { PaymentTestModeBanner } from "@/components/PaymentTestModeBanner";
import { StripeEmbeddedCheckout } from "@/components/StripeEmbeddedCheckout";
import { useSubscription } from "@/hooks/useSubscription";
import { supabase } from "@/integrations/supabase/client";
import { createPortalSession } from "@/lib/payments.functions";
import { getStripeEnvironment } from "@/lib/stripe";
import { getTrendingCoins } from "@/lib/zora.functions";
import { toast } from "sonner";
import spinPack50 from "@/assets/shop-spin-50.jpg";
import spinPack200 from "@/assets/shop-spin-200.jpg";
import launchCredit from "@/assets/shop-launch.jpg";
import pointsBooster from "@/assets/shop-booster.jpg";

export const Route = createFileRoute("/shop")({
  head: () => ({
    meta: [
      { title: "Shop · Resident Labs" },
      {
        name: "description",
        content:
          "Shop Resident Pro, SpinBase packs, featured launch credits, points boosters and quick-buy trending Base tokens.",
      },
      { property: "og:title", content: "Shop · Resident Labs" },
      {
        property: "og:description",
        content: "Membership, boosters, and quick-buy Base tokens in one place.",
      },
    ],
  }),
  component: ShopPage,
});

const PERKS = [
  "Resident Pro badge on your profile",
  "2× points across BaseMint and SpinBase",
  "Boosted discovery for your launches",
  "Extra daily quests and higher spin caps",
  "Priority support from the Resident Labs team",
];

type ShopProduct = {
  priceId: string;
  name: string;
  tagline: string;
  price: string;
  image: string;
  tag: string;
};

const PRODUCTS: ShopProduct[] = [
  {
    priceId: "spin_pack_50_once",
    name: "50 Spin Pack",
    tagline: "50 spins on SpinBase.",
    price: "$8",
    image: spinPack50,
    tag: "SpinBase",
  },
  {
    priceId: "spin_pack_200_once",
    name: "200 Spin Pack",
    tagline: "Best value for grinders.",
    price: "$25",
    image: spinPack200,
    tag: "Best value",
  },
  {
    priceId: "launch_credit_once",
    name: "Featured Launch",
    tagline: "Top of Discover for 24h.",
    price: "$15",
    image: launchCredit,
    tag: "BaseMint",
  },
  {
    priceId: "points_booster_7d_once",
    name: "2× Points · 7 days",
    tagline: "Double points on every action.",
    price: "$5",
    image: pointsBooster,
    tag: "Booster",
  },
];

function ShopPage() {
  const { subscription, isPro, loading } = useSubscription();
  const [email, setEmail] = useState<string | undefined>(undefined);
  const [userId, setUserId] = useState<string | undefined>(undefined);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const [activePriceId, setActivePriceId] = useState<string | null>(null);

  const trending = useQuery({
    queryKey: ["shop", "trending", 6],
    queryFn: () => getTrendingCoins({ data: { count: 6 } }),
    staleTime: 60_000,
  });

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setEmail(data.user?.email ?? undefined);
      setUserId(data.user?.id ?? undefined);
    });
  }, []);

  const requireAuth = () => {
    if (!userId) {
      toast.error("Sign in first", {
        description: "Create a Resident Labs account so we can attach your purchase.",
      });
      return false;
    }
    return true;
  };

  const handleUpgrade = () => {
    if (!requireAuth()) return;
    setCheckoutOpen(true);
  };

  const handleBuyProduct = (priceId: string) => {
    if (!requireAuth()) return;
    setActivePriceId((prev) => (prev === priceId ? null : priceId));
  };

  const handleManage = async () => {
    try {
      setPortalLoading(true);
      const result = await createPortalSession({
        data: {
          environment: getStripeEnvironment(),
          returnUrl: window.location.href,
        },
      });
      if ("error" in result) throw new Error(result.error);
      window.open(result.url, "_blank");
    } catch (e) {
      toast.error("Could not open billing portal", {
        description: e instanceof Error ? e.message : "Try again in a moment.",
      });
    } finally {
      setPortalLoading(false);
    }
  };

  const fmtPct = (v?: number) => {
    if (typeof v !== "number") return null;
    const sign = v >= 0 ? "+" : "";
    return `${sign}${v.toFixed(1)}%`;
  };

  const fmtMcap = (v?: number) => {
    if (typeof v !== "number") return null;
    if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
    if (v >= 1_000) return `$${(v / 1_000).toFixed(1)}K`;
    return `$${v.toFixed(0)}`;
  };

  return (
    <MiniAppShell>
      <PaymentTestModeBanner />

      {/* Resident Pro */}
      <section className="rounded-3xl border border-border bg-card/60 p-6 space-y-6">
        <header className="flex items-start justify-between gap-4">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-[10px] font-mono uppercase tracking-widest text-primary">
              <Crown className="size-3" /> Membership
            </span>
            <h1 className="mt-3 text-3xl font-black tracking-tight">Resident Pro</h1>
            <p className="text-sm text-muted-foreground mt-1">
              $9 / month · cancel anytime · test mode
            </p>
          </div>
          {isPro && (
            <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 text-primary px-2.5 py-1 text-xs font-semibold">
              <Sparkles className="size-3" /> Active
            </span>
          )}
        </header>

        <ul className="space-y-2">
          {PERKS.map((perk) => (
            <li key={perk} className="flex items-start gap-2 text-sm">
              <Check className="size-4 mt-0.5 text-primary shrink-0" />
              <span>{perk}</span>
            </li>
          ))}
        </ul>

        <div className="flex flex-wrap gap-2">
          {loading ? (
            <Button disabled><Loader2 className="size-4 animate-spin" /></Button>
          ) : isPro ? (
            <>
              <Button variant="secondary" disabled>
                <Crown className="size-4" /> You're a Resident Pro
              </Button>
              <Button variant="outline" onClick={handleManage} disabled={portalLoading}>
                {portalLoading ? <Loader2 className="size-4 animate-spin" /> : <Settings className="size-4" />}
                Manage subscription
              </Button>
            </>
          ) : (
            <Button onClick={handleUpgrade} size="lg">
              <Zap className="size-4" /> Upgrade to Pro
            </Button>
          )}
          {subscription && !isPro && (
            <p className="text-xs text-muted-foreground w-full">
              Previous status: {subscription.status}
            </p>
          )}
        </div>

        {checkoutOpen && !isPro && (
          <div className="rounded-2xl border border-border bg-background p-2">
            <StripeEmbeddedCheckout
              priceId="resident_pro_monthly"
              customerEmail={email}
              userId={userId}
              returnUrl={`${window.location.origin}/checkout/return?session_id={CHECKOUT_SESSION_ID}`}
            />
          </div>
        )}
      </section>

      {/* Digital goods */}
      <section className="space-y-4">
        <header className="flex items-end justify-between">
          <div>
            <h2 className="text-xl font-black tracking-tight">Boosters & credits</h2>
            <p className="text-xs text-muted-foreground mt-0.5">One-time purchases · test mode</p>
          </div>
        </header>

        <div className="grid grid-cols-2 gap-3">
          {PRODUCTS.map((product) => (
            <article
              key={product.priceId}
              className="rounded-2xl border border-border bg-card/60 overflow-hidden flex flex-col"
            >
              <div className="relative aspect-square overflow-hidden bg-muted">
                <img
                  src={product.image}
                  alt={product.name}
                  loading="lazy"
                  width={512}
                  height={512}
                  className="h-full w-full object-cover"
                />
                <span className="absolute top-2 left-2 rounded-full bg-background/80 backdrop-blur px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider">
                  {product.tag}
                </span>
              </div>
              <div className="p-3 space-y-2 flex-1 flex flex-col">
                <div className="flex-1">
                  <h3 className="text-sm font-bold leading-tight">{product.name}</h3>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{product.tagline}</p>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-base font-black">{product.price}</span>
                  <Button
                    size="sm"
                    variant={activePriceId === product.priceId ? "secondary" : "default"}
                    onClick={() => handleBuyProduct(product.priceId)}
                    className="h-8 px-3 text-xs"
                  >
                    {activePriceId === product.priceId ? (
                      <>
                        <X className="size-3" /> Close
                      </>
                    ) : (
                      <>
                        <Zap className="size-3" /> Buy
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </article>
          ))}
        </div>

        {activePriceId && (
          <div className="rounded-2xl border border-border bg-background p-2">
            <StripeEmbeddedCheckout
              priceId={activePriceId}
              customerEmail={email}
              userId={userId}
              returnUrl={`${window.location.origin}/checkout/return?session_id={CHECKOUT_SESSION_ID}`}
            />
          </div>
        )}
      </section>

      {/* Trending Base tokens quick-buy */}
      <section className="space-y-4">
        <header className="flex items-end justify-between">
          <div>
            <h2 className="text-xl font-black tracking-tight flex items-center gap-2">
              <TrendingUp className="size-5 text-primary" /> Trending Base tokens
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Live from Zora · trade with your connected wallet
            </p>
          </div>
          <Link
            to="/discover"
            className="text-xs font-mono uppercase tracking-wider text-primary hover:underline"
          >
            All
          </Link>
        </header>

        {trending.isLoading ? (
          <div className="rounded-2xl border border-border bg-card/60 p-8 flex items-center justify-center">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : trending.data && trending.data.length > 0 ? (
          <ul className="space-y-2">
            {trending.data.slice(0, 6).map((coin) => {
              const pct = fmtPct(coin.marketCapDelta24h);
              const positive = (coin.marketCapDelta24h ?? 0) >= 0;
              return (
                <li key={coin.address}>
                  <div className="flex items-center gap-3 rounded-2xl border border-border bg-card/60 p-3">
                    <img
                      src={coin.image}
                      alt={coin.name}
                      loading="lazy"
                      width={48}
                      height={48}
                      className="size-12 rounded-xl object-cover bg-muted shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-sm truncate">{coin.name}</p>
                        <span className="text-[10px] font-mono uppercase text-muted-foreground">
                          {coin.symbol}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5">
                        {fmtMcap(coin.marketCap) && <span>{fmtMcap(coin.marketCap)} mcap</span>}
                        {pct && (
                          <span className={positive ? "text-emerald-400" : "text-red-400"}>
                            {pct}
                          </span>
                        )}
                      </div>
                    </div>
                    <Link
                      to="/coin/$id"
                      params={{ id: coin.address }}
                      className="inline-flex items-center gap-1 rounded-full bg-primary text-primary-foreground px-3 py-1.5 text-xs font-semibold hover:opacity-90 shrink-0"
                    >
                      Buy <ArrowUpRight className="size-3" />
                    </Link>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="rounded-2xl border border-border bg-card/60 p-6 text-center text-sm text-muted-foreground">
            No trending tokens right now — check back soon.
          </div>
        )}
      </section>

      <p className="text-[11px] text-muted-foreground text-center">
        Test mode — use Stripe test card 4242 4242 4242 4242, any future expiry, any CVC.
      </p>
    </MiniAppShell>
  );
}
