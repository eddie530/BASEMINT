import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

type SubscriptionRow = {
  id: string;
  user_id: string;
  stripe_subscription_id: string;
  stripe_customer_id: string;
  product_id: string | null;
  price_id: string | null;
  status: string;
  current_period_end: string | null;
  cancel_at_period_end: boolean | null;
  environment: string;
};

function computeActive(sub: SubscriptionRow | null): boolean {
  if (!sub) return false;
  const end = sub.current_period_end ? new Date(sub.current_period_end).getTime() : null;
  const future = end === null || end > Date.now();
  if (['active', 'trialing', 'past_due'].includes(sub.status) && future) return true;
  if (sub.status === 'canceled' && end && end > Date.now()) return true;
  return false;
}

export function useSubscription() {
  const [subscription, setSubscription] = useState<SubscriptionRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load(uid: string) {
      // Query across all environments (stripe sandbox/live + crypto) and pick
      // the most recently updated active row.
      const { data } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', uid)
        .order('current_period_end', { ascending: false, nullsFirst: false })
        .limit(5);
      if (cancelled) return;
      const rows = ((data as SubscriptionRow[] | null) ?? []);
      const active = rows.find(computeActive) ?? rows[0] ?? null;
      setSubscription(active);
      setLoading(false);
    }

    supabase.auth.getUser().then(({ data }) => {
      const uid = data.user?.id ?? null;
      setUserId(uid);
      if (uid) load(uid);
      else setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      const uid = session?.user?.id ?? null;
      setUserId(uid);
      if (uid) load(uid);
      else {
        setSubscription(null);
        setLoading(false);
      }
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`subscriptions:${userId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'subscriptions', filter: `user_id=eq.${userId}` },
        async () => {
          const { data } = await supabase
            .from('subscriptions')
            .select('*')
            .eq('user_id', userId)
            .order('current_period_end', { ascending: false, nullsFirst: false })
            .limit(5);
          const rows = ((data as SubscriptionRow[] | null) ?? []);
          const active = rows.find(computeActive) ?? rows[0] ?? null;
          setSubscription(active);
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const pricePro = subscription?.price_id;
  const isProPrice =
    pricePro === "resident_pro_monthly" || pricePro === "resident_pro_monthly_v2";

  return {
    subscription,
    environment: subscription?.environment ?? null,
    isActive: computeActive(subscription),
    isPro: computeActive(subscription) && isProPrice,
    loading,
  };
}
