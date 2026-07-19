import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Check, Crown, Loader2, Settings, Sparkles, Zap } from "lucide-react";
import { MiniAppShell } from "@/components/MiniAppShell";
import { Button } from "@/components/ui/button";
import { PaymentTestModeBanner } from "@/components/PaymentTestModeBanner";
import { StripeEmbeddedCheckout } from "@/components/StripeEmbeddedCheckout";
import { useSubscription } from "@/hooks/useSubscription";
import { supabase } from "@/integrations/supabase/client";
import { createPortalSession } from "@/lib/payments.functions";
import { getStripeEnvironment } from "@/lib/stripe";
import { toast } from "sonner";

export const Route = createFileRoute("/shop")({
  head: () => ({
    meta: [
      { title: "Shop · Resident Labs" },
      {
        name: "description",
        content:
          "Upgrade to Resident Pro — badge, boosted discovery, 2× points, and priority support across Resident Labs.",
      },
      { property: "og:title", content: "Shop · Resident Labs" },
      {
        property: "og:description",
        content: "Resident Pro membership and perks for the Resident Labs community.",
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

function ShopPage() {
  const { subscription, isPro, loading } = useSubscription();
  const [email, setEmail] = useState<string | undefined>(undefined);
  const [userId, setUserId] = useState<string | undefined>(undefined);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setEmail(data.user?.email ?? undefined);
      setUserId(data.user?.id ?? undefined);
    });
  }, []);

  const handleUpgrade = () => {
    if (!userId) {
      toast.error("Sign in first", {
        description: "Create a Resident Labs account so we can activate Pro on your profile.",
      });
      return;
    }
    setCheckoutOpen(true);
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

  return (
    <MiniAppShell>
      <PaymentTestModeBanner />

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

      <p className="text-[11px] text-muted-foreground text-center">
        Test mode — use Stripe test card 4242 4242 4242 4242, any future expiry, any CVC.
      </p>
    </MiniAppShell>
  );
}
