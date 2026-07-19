import { createFileRoute, Link } from '@tanstack/react-router';
import { CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const Route = createFileRoute('/checkout/return')({
  head: () => ({
    meta: [
      { title: 'Checkout complete · Resident Labs' },
      { name: 'description', content: 'Thanks for supporting Resident Labs.' },
      { name: 'robots', content: 'noindex' },
    ],
  }),
  validateSearch: (search: Record<string, unknown>): { session_id?: string } => ({
    session_id: typeof search.session_id === 'string' ? search.session_id : undefined,
  }),
  component: CheckoutReturn,
});

function CheckoutReturn() {
  const { session_id: sessionId } = Route.useSearch();

  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="max-w-md w-full rounded-2xl border border-border bg-card p-8 text-center space-y-4">
        <CheckCircle2 className="w-12 h-12 mx-auto text-primary" />
        <h1 className="text-2xl font-semibold">You're a Resident Pro</h1>
        <p className="text-sm text-muted-foreground">
          {sessionId
            ? 'Your subscription is being activated. It may take a few seconds to appear on your account.'
            : 'Your payment was recorded.'}
        </p>
        <div className="flex gap-2 justify-center pt-2">
          <Button asChild variant="outline"><Link to="/shop">Back to Shop</Link></Button>
          <Button asChild><Link to="/home">Go to Home</Link></Button>
        </div>
      </div>
    </div>
  );
}
