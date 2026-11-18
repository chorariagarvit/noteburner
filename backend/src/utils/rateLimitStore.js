/**
 * Consume one unit of a rate-limit budget.
 *
 *  - If the RATE_LIMITER Durable Object binding exists, the count is exact (atomic).
 *  - Otherwise it falls back to the KV fixed-window counter (best effort, eventually consistent).
 *  - With neither, nothing is limited.
 *
 * Returns { allowed, count, resetAt } or null when no store is configured. Errors are thrown so the
 * caller can fail open (a limiter outage must never take the API down).
 */
import { readCounter, bumpCounter } from './kvCounter.js';

export async function consume(env, key, limit, windowSeconds) {
  if (env.RATE_LIMITER) {
    const stub = env.RATE_LIMITER.get(env.RATE_LIMITER.idFromName(key));
    const res = await stub.fetch('https://rate-limiter/consume', {
      method: 'POST',
      body: JSON.stringify({ limit, windowSeconds }),
    });
    if (!res.ok) throw new Error(`rate limiter responded ${res.status}`);
    return res.json();
  }

  if (env.CACHE) {
    const counter = await readCounter(env.CACHE, key);
    if (counter.count >= limit) {
      return { allowed: false, count: counter.count, resetAt: counter.resetAt };
    }
    try {
      const updated = await bumpCounter(env.CACHE, key, counter, windowSeconds);
      return { allowed: true, count: updated.count, resetAt: updated.resetAt };
    } catch (err) {
      // e.g. Cloudflare KV allows only ~1 write/second per key: count it locally, allow the request
      console.warn('[RateLimit] KV write failed, request allowed:', err.message);
      return { allowed: true, count: counter.count + 1, resetAt: counter.resetAt || Math.floor(Date.now() / 1000) + windowSeconds };
    }
  }

  return null;
}

/** Apply the standard X-RateLimit-* / Retry-After headers for a consume() result. */
export function setRateLimitHeaders(c, result, limit) {
  c.header('X-RateLimit-Limit', String(limit));
  c.header('X-RateLimit-Remaining', String(Math.max(0, limit - result.count)));
  c.header('X-RateLimit-Reset', String(result.resetAt));
  if (!result.allowed) {
    c.header('Retry-After', String(Math.max(1, result.resetAt - Math.floor(Date.now() / 1000))));
  }
}
