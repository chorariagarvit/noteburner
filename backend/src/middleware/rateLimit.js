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
      return c.json({ error: 'Rate limit exceeded. Please try again later.' }, 429);
    }

    await bumpCounter(kv, key, counter, windowSeconds);

    await next();
  };
}
