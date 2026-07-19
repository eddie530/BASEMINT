import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getStripeEnvironment } from '@/lib/stripe';

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
    let env: 'sandbox' | 'live';
    try {
      env = getStripeEnvironment();
    } catch {
      setLoading(false);
      return;
    }

    async function load(uid: string) {
      const { data } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', uid)
        .eq('environment', env)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!cancelled) {
        setSubscription((data as SubscriptionRow | null) ?? null);
        setLoading(false);
      }
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
    let env: 'sandbox' | 'live';
    try {
      env = getStripeEnvironment();
    } catch {
      return;
    }
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
            .eq('environment', env)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();
          setSubscription((data as SubscriptionRow | null) ?? null);
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  return {
    subscription,
    isActive: computeActive(subscription),
    isPro: computeActive(subscription) && subscription?.price_id === 'resident_pro_monthly',
    loading,
  };
}
