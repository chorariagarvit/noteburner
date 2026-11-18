import { readCounter, bumpCounter } from '../utils/kvCounter.js';

// Rate limiting middleware — backed by Cloudflare KV for cross-isolate persistence

export function rateLimitMiddleware(limit = 10, windowSeconds = 60) {
  return async (c, next) => {
    const ip = c.req.header('CF-Connecting-IP') || 'unknown';
    const kv = c.env.CACHE;

    if (!kv) {
      // KV not configured — fail open with a warning
      console.warn('[RateLimit] KV namespace not available, skipping rate limit');
      await next();
      return;
    }

    const key = `rl:ip:${ip}:${limit}:${windowSeconds}`;
    const counter = await readCounter(kv, key);
    const count = counter.count;

    if (count >= limit) {
      c.header('X-RateLimit-Limit', String(limit));
      c.header('X-RateLimit-Remaining', '0');
      c.header('X-RateLimit-Reset', String(counter.resetAt));
      c.header('Retry-After', String(Math.max(1, counter.resetAt - Math.floor(Date.now() / 1000))));
      return c.json({ error: 'Rate limit exceeded. Please try again later.' }, 429);
    }

    const updated = await bumpCounter(kv, key, counter, windowSeconds);
    c.header('X-RateLimit-Limit', String(limit));
    c.header('X-RateLimit-Remaining', String(Math.max(0, limit - updated.count)));
    c.header('X-RateLimit-Reset', String(updated.resetAt));

    await next();
  };
}
