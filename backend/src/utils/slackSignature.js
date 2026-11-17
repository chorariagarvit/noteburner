import crypto from 'crypto';

/**
 * Verify a Slack request signature (v0 scheme). Fails closed when the secret is missing.
 * https://api.slack.com/authentication/verifying-requests-from-slack
 */
export function verifySlackSignature({ secret, timestamp, signature, rawBody }) {
  if (!secret || !timestamp || !signature) return false;
  if (Math.abs(Date.now() / 1000 - Number(timestamp)) > 300) return false; // replay window
  const expected = 'v0=' + crypto.createHmac('sha256', secret)
    .update(`v0:${timestamp}:${rawBody}`).digest('hex');
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
