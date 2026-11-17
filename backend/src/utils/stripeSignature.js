import crypto from 'node:crypto';

/**
 * Verify a Stripe webhook signature (`Stripe-Signature: t=<ts>,v1=<hmac>`).
 * Fails closed when the secret is missing. 5-minute replay tolerance.
 */
export function verifyStripeSignature({ secret, header, rawBody, toleranceSeconds = 300 }) {
  if (!secret || !header) return false;
  const parts = Object.fromEntries(
    header.split(',').map((kv) => kv.split('=')).filter((p) => p.length === 2)
  );
  const timestamp = parts.t;
  const signature = parts.v1;
  if (!timestamp || !signature) return false;
  if (Math.abs(Date.now() / 1000 - Number(timestamp)) > toleranceSeconds) return false;
  const expected = crypto.createHmac('sha256', secret).update(`${timestamp}.${rawBody}`).digest('hex');
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
