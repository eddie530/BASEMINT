const COMMERCE_API_BASE = 'https://api.commerce.coinbase.com';

function getApiKey(): string {
  const k = process.env.COMMERCE_API_KEY;
  if (!k) throw new Error('COMMERCE_API_KEY is not configured');
  return k;
}

export interface CreateChargeInput {
  name: string;
  description: string;
  amount: string; // decimal string, e.g. "9.99"
  currency: string; // ISO currency code, e.g. "USD"
  metadata: Record<string, string>;
  redirect_url?: string;
  cancel_url?: string;
}

export interface Charge {
  id: string;
  code: string;
  hosted_url: string;
}

export async function createCharge(input: CreateChargeInput): Promise<Charge> {
  const res = await fetch(`${COMMERCE_API_BASE}/charges`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-CC-Api-Key': getApiKey(),
      'X-CC-Version': '2018-03-22',
    },
    body: JSON.stringify({
      name: input.name,
      description: input.description,
      pricing_type: 'fixed_price',
      local_price: { amount: input.amount, currency: input.currency },
      metadata: input.metadata,
      ...(input.redirect_url && { redirect_url: input.redirect_url }),
      ...(input.cancel_url && { cancel_url: input.cancel_url }),
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Commerce API error ${res.status}: ${text}`);
  }
  const json = (await res.json()) as { data: Charge };
  return json.data;
}

export async function verifyCommerceSignature(
  rawBody: string,
  signature: string | null,
): Promise<boolean> {
  const secret = process.env.COMMERCE_WEBHOOK_SECRET;
  if (!secret) throw new Error('COMMERCE_WEBHOOK_SECRET is not configured');
  if (!signature) return false;
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signed = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(rawBody));
  const expected = Array.from(new Uint8Array(signed))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  if (expected.length !== signature.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
  }
  return diff === 0;
}
