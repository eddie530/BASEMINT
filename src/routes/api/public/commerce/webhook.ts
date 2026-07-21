import { createFileRoute } from '@tanstack/react-router';
import { createClient } from '@supabase/supabase-js';
import { verifyCommerceSignature } from '@/lib/commerce.server';

let _supabase: ReturnType<typeof createClient> | null = null;
function getSupabase() {
  if (!_supabase) {
    _supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
  }
  return _supabase;
}

const CONFIRMED_EVENTS = new Set(['charge:confirmed', 'charge:resolved']);

async function handleConfirmedCharge(charge: any, rawEvent: any) {
  const metadata = charge?.metadata ?? {};
  const userId: string | undefined = metadata.userId;
  const priceId: string | undefined = metadata.priceId;
  if (!userId || !priceId) {
    console.error('Commerce charge missing userId/priceId metadata', charge?.code);
    return;
  }

  if (priceId === 'resident_pro_monthly') {
    const now = new Date();
    const end = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const subscriptionId = `commerce_${charge.code}`;

    await (getSupabase() as any).from('subscriptions').upsert(
      {
        user_id: userId,
        stripe_subscription_id: subscriptionId,
        stripe_customer_id: `commerce_${userId}`,
        product_id: 'resident_pro',
        price_id: 'resident_pro_monthly',
        status: 'active',
        current_period_start: now.toISOString(),
        current_period_end: end.toISOString(),
        cancel_at_period_end: true,
        environment: 'crypto',
        updated_at: now.toISOString(),
      },
      { onConflict: 'stripe_subscription_id' },
    );

    try {
      await (getSupabase() as any).from('subscription_audit_log').insert({
        user_id: userId,
        stripe_subscription_id: subscriptionId,
        stripe_customer_id: `commerce_${userId}`,
        event_type: 'subscription.created',
        previous_status: null,
        new_status: 'active',
        previous_price_id: null,
        new_price_id: 'resident_pro_monthly',
        cancel_at_period_end: true,
        current_period_end: end.toISOString(),
        environment: 'crypto',
        raw_event: rawEvent ?? null,
      });
    } catch (err) {
      console.error('Failed to write commerce audit log:', err);
    }
  }
  // One-time items (spins/launch credit/booster) are credited on the client
  // via the redirect_url session_id (same pattern as Stripe flow).
}

export const Route = createFileRoute('/api/public/commerce/webhook')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const signature = request.headers.get('x-cc-webhook-signature');
        const body = await request.text();
        try {
          const ok = await verifyCommerceSignature(body, signature);
          if (!ok) return new Response('Invalid signature', { status: 401 });
          const parsed = JSON.parse(body);
          const event = parsed?.event;
          if (event?.type && CONFIRMED_EVENTS.has(event.type)) {
            await handleConfirmedCharge(event.data, event);
          } else {
            console.log('Commerce webhook: unhandled event', event?.type);
          }
          return Response.json({ received: true });
        } catch (e) {
          console.error('Commerce webhook error:', e);
          return new Response('Webhook error', { status: 400 });
        }
      },
    },
  },
});
