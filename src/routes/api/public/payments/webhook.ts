import { createFileRoute } from '@tanstack/react-router';
import { createClient } from '@supabase/supabase-js';
import { type StripeEnv, verifyWebhook } from '@/lib/stripe.server';

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

function extractPriceId(subscription: any): string | undefined {
  const item = subscription.items?.data?.[0];
  return item?.price?.lookup_key
    || item?.price?.metadata?.lovable_external_id
    || item?.price?.id;
}

async function writeAudit(params: {
  subscription: any;
  env: StripeEnv;
  eventType: string;
  previousStatus?: string | null;
  newStatus?: string | null;
  previousPriceId?: string | null;
  newPriceId?: string | null;
  rawEvent?: any;
}) {
  const { subscription, env, eventType } = params;
  const item = subscription.items?.data?.[0];
  const periodEnd = item?.current_period_end ?? subscription.current_period_end;
  try {
    await (getSupabase() as any).from('subscription_audit_log').insert({
      user_id: subscription.metadata?.userId ?? null,
      stripe_subscription_id: subscription.id,
      stripe_customer_id: subscription.customer ?? null,
      event_type: eventType,
      previous_status: params.previousStatus ?? null,
      new_status: params.newStatus ?? subscription.status ?? null,
      previous_price_id: params.previousPriceId ?? null,
      new_price_id: params.newPriceId ?? extractPriceId(subscription) ?? null,
      cancel_at_period_end: subscription.cancel_at_period_end ?? null,
      current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
      environment: env,
      raw_event: params.rawEvent ?? null,
    });
  } catch (err) {
    // Audit logging must never block webhook processing.
    console.error('Failed to write subscription audit log:', err);
  }
}

async function loadExistingRow(subscriptionId: string, env: StripeEnv) {
  const { data } = await (getSupabase() as any)
    .from('subscriptions')
    .select('status, price_id')
    .eq('stripe_subscription_id', subscriptionId)
    .eq('environment', env)
    .maybeSingle();
  return data as { status?: string; price_id?: string } | null;
}

async function handleSubscriptionCreated(subscription: any, env: StripeEnv, rawEvent: any) {
  const userId = subscription.metadata?.userId;
  if (!userId) {
    console.error('No userId in subscription metadata');
    return;
  }
  const priceId = extractPriceId(subscription);
  const item = subscription.items?.data?.[0];
  const productId = item?.price?.product;
  const periodStart = item?.current_period_start ?? subscription.current_period_start;
  const periodEnd = item?.current_period_end ?? subscription.current_period_end;

  await (getSupabase() as any).from('subscriptions').upsert(
    {
      user_id: userId,
      stripe_subscription_id: subscription.id,
      stripe_customer_id: subscription.customer,
      product_id: productId,
      price_id: priceId,
      status: subscription.status,
      current_period_start: periodStart ? new Date(periodStart * 1000).toISOString() : null,
      current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
      environment: env,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'stripe_subscription_id' },
  );

  await writeAudit({
    subscription,
    env,
    eventType: 'subscription.created',
    previousStatus: null,
    newStatus: subscription.status,
    previousPriceId: null,
    newPriceId: priceId,
    rawEvent,
  });
}

async function handleSubscriptionUpdated(subscription: any, env: StripeEnv, rawEvent: any) {
  const priceId = extractPriceId(subscription);
  const item = subscription.items?.data?.[0];
  const productId = item?.price?.product;
  const periodStart = item?.current_period_start ?? subscription.current_period_start;
  const periodEnd = item?.current_period_end ?? subscription.current_period_end;

  const prev = await loadExistingRow(subscription.id, env);

  await (getSupabase() as any)
    .from('subscriptions')
    .update({
      status: subscription.status,
      product_id: productId,
      price_id: priceId,
      current_period_start: periodStart ? new Date(periodStart * 1000).toISOString() : null,
      current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
      cancel_at_period_end: subscription.cancel_at_period_end || false,
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_subscription_id', subscription.id)
    .eq('environment', env);

  const statusChanged = prev?.status !== subscription.status;
  const planChanged = prev?.price_id && priceId && prev.price_id !== priceId;
  const eventType = planChanged
    ? 'subscription.plan_changed'
    : statusChanged
      ? 'subscription.status_changed'
      : 'subscription.updated';

  await writeAudit({
    subscription,
    env,
    eventType,
    previousStatus: prev?.status ?? null,
    newStatus: subscription.status,
    previousPriceId: prev?.price_id ?? null,
    newPriceId: priceId,
    rawEvent,
  });
}

async function handleSubscriptionDeleted(subscription: any, env: StripeEnv, rawEvent: any) {
  const prev = await loadExistingRow(subscription.id, env);

  await (getSupabase() as any)
    .from('subscriptions')
    .update({ status: 'canceled', updated_at: new Date().toISOString() })
    .eq('stripe_subscription_id', subscription.id)
    .eq('environment', env);

  await writeAudit({
    subscription,
    env,
    eventType: 'subscription.canceled',
    previousStatus: prev?.status ?? null,
    newStatus: 'canceled',
    previousPriceId: prev?.price_id ?? null,
    newPriceId: extractPriceId(subscription) ?? prev?.price_id ?? null,
    rawEvent,
  });
}

async function handleWebhook(req: Request, env: StripeEnv) {
  const event = await verifyWebhook(req, env);
  switch (event.type) {
    case 'customer.subscription.created':
      await handleSubscriptionCreated(event.data.object, env, event);
      break;
    case 'customer.subscription.updated':
      await handleSubscriptionUpdated(event.data.object, env, event);
      break;
    case 'customer.subscription.deleted':
      await handleSubscriptionDeleted(event.data.object, env, event);
      break;
    default:
      console.log('Unhandled event:', event.type);
  }
}

export const Route = createFileRoute('/api/public/payments/webhook')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const rawEnv = new URL(request.url).searchParams.get('env');
        if (rawEnv !== 'sandbox' && rawEnv !== 'live') {
          console.error('Webhook received with invalid or missing env query parameter:', rawEnv);
          return Response.json({ received: true, ignored: 'invalid env' });
        }
        const env: StripeEnv = rawEnv;
        try {
          await handleWebhook(request, env);
          return Response.json({ received: true });
        } catch (e) {
          console.error('Webhook error:', e);
          return new Response('Webhook error', { status: 400 });
        }
      },
    },
  },
});
