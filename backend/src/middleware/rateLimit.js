import { consume, setRateLimitHeaders } from '../utils/rateLimitStore.js';

// Per-IP fixed-window limiter. Exact when the RATE_LIMITER Durable Object is bound, KV otherwise.
// Rate limiting is best-effort: any store error lets the request through (and logs a warning).

export function rateLimitMiddleware(limit = 10, windowSeconds = 60) {
  return async (c, next) => {
    const ip = c.req.header('CF-Connecting-IP') || 'unknown';
    const key = `rl:ip:${ip}:${limit}:${windowSeconds}`;

    let result;
    try {
      result = await consume(c.env, key, limit, windowSeconds);
    } catch (err) {
      console.warn('[RateLimit] store failed, request allowed:', err.message);
      await next();
      return;
    }

    if (!result) {
      console.warn('[RateLimit] no rate limit store configured, skipping');
      await next();
      return;
    }

    setRateLimitHeaders(c, result, limit);
    if (!result.allowed) {
      return c.json({ error: 'Rate limit exceeded. Please try again later.' }, 429);
    }
    await next();
  };
}
