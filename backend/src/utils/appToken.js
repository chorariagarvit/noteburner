/**
 * Signed app tokens for anonymous API access.
 *
 * Anonymous senders/recipients have no account, so every API call must still carry
 * proof it came through the app's session-start flow. Tokens are stateless:
 *   base64url(JSON{exp,n}) + "." + hex(HMAC-SHA256(secret, payload))
 * Secret: Worker secret APP_TOKEN_SECRET (never in code).
 */
import crypto from 'crypto';

const DEFAULT_TTL_MS = 60 * 60 * 1000; // 1 hour

const b64url = (buf) => Buffer.from(buf).toString('base64url');

function sign(secret, payload) {
  return crypto.createHmac('sha256', secret).update(payload).digest('hex');
}

export function createAppToken(secret, ttlMs = DEFAULT_TTL_MS) {
  if (!secret) throw new Error('APP_TOKEN_SECRET is not configured');
  const payload = b64url(JSON.stringify({ exp: Date.now() + ttlMs, n: crypto.randomUUID() }));
  return { token: `${payload}.${sign(secret, payload)}`, expiresAt: Date.now() + ttlMs };
}

export function verifyAppToken(token, secret) {
  if (!token || !secret || typeof token !== 'string') return false;
  const [payload, mac] = token.split('.');
  if (!payload || !mac) return false;
  const expected = sign(secret, payload);
  const a = Buffer.from(mac);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return false;
  try {
    const { exp } = JSON.parse(Buffer.from(payload, 'base64url').toString());
    return Number.isFinite(exp) && Date.now() < exp;
  } catch {
    return false;
  }
}
