import { createFileRoute, Link } from '@tanstack/react-router';
import { CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

type Kind = 'subscription' | 'launch_credit' | 'points_booster';

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

function CheckoutReturn() {
  const { session_id: sessionId, kind } = Route.useSearch();
  const content = getContent(kind);

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

function getContent(kind: Kind | undefined): {
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
        body: 'Your Featured Launch credit has been added to your account. It will apply the next time you launch a token or NFT.',
        ctaLabel: 'Launch now',
        ctaTo: '/launch',
      };
    case 'points_booster':
      return {
        title: '2× Points booster activated',
        body: 'Your 2× points booster is being applied to your account for the next 7 days across BaseMint and SpinBase.',
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
