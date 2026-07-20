import { createFileRoute, Link } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

type Kind = 'subscription' | 'launch_credit' | 'points_booster';

const CREDITED_KEY = 'resident:credited-sessions';
const LAUNCH_CREDITS_KEY = 'resident:launch-credits';
const BOOSTER_KEY = 'resident:points-booster-until';

export const Route = createFileRoute('/checkout/return')({
  head: () => ({
    meta: [
      { title: 'Checkout complete · Resident Labs' },
      { name: 'description', content: 'Thanks for supporting Resident Labs.' },
      { name: 'robots', content: 'noindex' },
    ],
  }),
  validateSearch: (search: Record<string, unknown>): { session_id?: string; kind?: Kind } => {
    const allowed: Kind[] = ['subscription', 'launch_credit', 'points_booster'];
    const kind = typeof search.kind === 'string' && (allowed as string[]).includes(search.kind)
      ? (search.kind as Kind)
      : undefined;
    return {
      session_id: typeof search.session_id === 'string' ? search.session_id : undefined,
      kind,
    };
  },
  component: CheckoutReturn,
});

function markCredited(sid: string): boolean {
  try {
    const raw = window.localStorage.getItem(CREDITED_KEY);
    const seen: string[] = raw ? JSON.parse(raw) : [];
    if (seen.includes(sid)) return false;
    window.localStorage.setItem(CREDITED_KEY, JSON.stringify([...seen, sid].slice(-50)));
    return true;
  } catch {
    return false;
  }
}

function CheckoutReturn() {
  const { session_id: sessionId, kind } = Route.useSearch();
  const [applied, setApplied] = useState(false);

  useEffect(() => {
    if (!sessionId || !kind) return;
    const isNew = markCredited(sessionId);
    if (!isNew) {
      setApplied(true);
      return;
    }
    try {
      if (kind === 'launch_credit') {
        const raw = window.localStorage.getItem(LAUNCH_CREDITS_KEY);
        const current = raw ? Number(raw) || 0 : 0;
        window.localStorage.setItem(LAUNCH_CREDITS_KEY, String(current + 1));
      } else if (kind === 'points_booster') {
        const until = Date.now() + 7 * 24 * 60 * 60 * 1000;
        window.localStorage.setItem(BOOSTER_KEY, String(until));
      }
      setApplied(true);
    } catch {
      // ignore local storage failures — Stripe already recorded the charge.
    }
  }, [sessionId, kind]);

  const content = getContent(kind, applied);

  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="max-w-md w-full rounded-2xl border border-border bg-card p-8 text-center space-y-4">
        <CheckCircle2 className="w-12 h-12 mx-auto text-primary" />
        <h1 className="text-2xl font-semibold">{content.title}</h1>
        <p className="text-sm text-muted-foreground">
          {sessionId ? content.body : 'Your payment was recorded.'}
        </p>
        <div className="flex gap-2 justify-center pt-2 flex-wrap">
          <Button asChild variant="outline"><Link to="/shop">Back to Shop</Link></Button>
          <Button asChild><Link to={content.ctaTo}>{content.ctaLabel}</Link></Button>
        </div>
      </div>
    </div>
  );
}

function getContent(kind: Kind | undefined, applied: boolean): {
  title: string;
  body: string;
  ctaLabel: string;
  ctaTo: '/home' | '/launch';
} {
  switch (kind) {
    case 'subscription':
      return {
        title: "You're a Resident Pro",
        body: 'Your subscription is being activated. It may take a few seconds to appear on your account.',
        ctaLabel: 'Go to Home',
        ctaTo: '/home',
      };
    case 'launch_credit':
      return {
        title: 'Featured Launch credit added',
        body: applied
          ? 'A Featured Launch credit is on your account. Use it the next time you launch a token or NFT.'
          : 'Payment recorded. Your Featured Launch credit will appear shortly.',
        ctaLabel: 'Launch now',
        ctaTo: '/launch',
      };
    case 'points_booster':
      return {
        title: '2× Points booster active',
        body: applied
          ? 'Your 2× points booster is active for the next 7 days across BaseMint and SpinBase.'
          : 'Payment recorded. Your booster will activate shortly.',
        ctaLabel: 'Go to Home',
        ctaTo: '/home',
      };
    default:
      return {
        title: 'Thanks for your purchase',
        body: "Your payment was recorded. If you don't see your item applied within a few minutes, contact support.",
        ctaLabel: 'Go to Home',
        ctaTo: '/home',
      };
  }
}
