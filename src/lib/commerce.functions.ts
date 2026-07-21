import { createServerFn } from '@tanstack/react-start';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { createCharge } from './commerce.server';


type ProductDef = {
  name: string;
  description: string;
  amount: string;
  kind: 'subscription' | 'spins_50' | 'spins_200' | 'launch_credit' | 'points_booster';
};

const PRODUCTS: Record<string, ProductDef> = {
  resident_pro_monthly: {
    name: 'Resident Pro · 30 days',
    description: 'Resident Pro membership. Unlimited launches, premium analytics, verified badge, early access, 2× referral rewards and priority support for 30 days.',
    amount: '9.99',
    kind: 'subscription',
  },
  spin_pack_50_once: {
    name: '50 Spin Pack',
    description: '50 spins on SpinBase.',
    amount: '8.00',
    kind: 'spins_50',
  },
  spin_pack_200_once: {
    name: '200 Spin Pack',
    description: '200 spins on SpinBase — best value.',
    amount: '25.00',
    kind: 'spins_200',
  },
  launch_credit_once: {
    name: 'Featured Launch',
    description: 'Featured on top of Discover for 24 hours.',
    amount: '15.00',
    kind: 'launch_credit',
  },
  points_booster_7d_once: {
    name: '2× Points Booster · 7 days',
    description: 'Double points on every action for 7 days.',
    amount: '5.00',
    kind: 'points_booster',
  },
};

type Result = { hostedUrl: string; code: string; sessionId: string } | { error: string };

export const createCommerceCharge = createServerFn({ method: 'POST' })
  .inputValidator((data: {
    priceId: string;
    userId: string;
    sessionId: string;
    origin: string;
  }) => {
    if (!PRODUCTS[data.priceId]) throw new Error('Unknown product');
    if (!/^[a-zA-Z0-9-]+$/.test(data.userId)) throw new Error('Invalid userId');
    if (!/^[a-zA-Z0-9-]{8,64}$/.test(data.sessionId)) throw new Error('Invalid sessionId');
    if (!/^https?:\/\//.test(data.origin)) throw new Error('Invalid origin');
    return data;
  })
  .handler(async ({ data }): Promise<Result> => {
    try {
      const p = PRODUCTS[data.priceId];
      const sid = data.sessionId;
      const returnPath =
        p.kind === 'subscription'
          ? `/checkout/return?kind=subscription&session_id=${sid}`
          : p.kind === 'spins_50'
            ? `/play?spins=50&session_id=${sid}`
            : p.kind === 'spins_200'
              ? `/play?spins=200&session_id=${sid}`
              : p.kind === 'launch_credit'
                ? `/checkout/return?kind=launch_credit&session_id=${sid}`
                : `/checkout/return?kind=points_booster&session_id=${sid}`;

      const charge = await createCharge({
        name: p.name,
        description: p.description,
        amount: p.amount,
        currency: 'USD',
        metadata: {
          userId: data.userId,
          priceId: data.priceId,
          kind: p.kind,
          sessionId: sid,
        },
        redirect_url: `${data.origin}${returnPath}`,
        cancel_url: `${data.origin}/shop`,
      });
      return { hostedUrl: charge.hosted_url, code: charge.code, sessionId: sid };
    } catch (e) {
      return { error: e instanceof Error ? e.message : 'Commerce request failed' };
    }
  });
