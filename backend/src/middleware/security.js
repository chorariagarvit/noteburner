import { consume, setRateLimitHeaders } from '../utils/rateLimitStore.js';
/**
 * Security Headers Middleware
 * Implements Content Security Policy and other security headers
 */

export const securityHeaders = () => {
  return async (c, next) => {
    await next();

    // Content Security Policy — no unsafe-inline or unsafe-eval
    const csp = [
      "default-src 'self'",
      "script-src 'self' https://cdn.jsdelivr.net",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "img-src 'self' data: https: blob:",
      "font-src 'self' https://fonts.gstatic.com data:",
      "connect-src 'self' https://api.noteburner.work wss://api.noteburner.work",
      "media-src 'self' blob:",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
      "upgrade-insecure-requests"
    ].join('; ');

    c.header('Content-Security-Policy', csp);

    // Additional security headers
    c.header('X-Frame-Options', 'DENY');
    c.header('X-Content-Type-Options', 'nosniff');
    c.header('X-XSS-Protection', '1; mode=block');
    c.header('Referrer-Policy', 'strict-origin-when-cross-origin');
    c.header('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    
    // HSTS - Force HTTPS
    c.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');

    // Prevent clickjacking
    c.header('X-Permitted-Cross-Domain-Policies', 'none');

    // Cache control for sensitive content
    if (c.req.path.includes('/api/messages/')) {
      c.header('Cache-Control', 'no-store, no-cache, must-revalidate, private');
      c.header('Pragma', 'no-cache');
    }
  };
};

/**
 * Rate Limiting Middleware
 * KV-backed rate limiting — works correctly across all Cloudflare Worker isolates
 */
export const enhancedRateLimit = (options = {}) => {
  const {
    windowMs = 60000,
    maxRequests = 100,
    message = 'Too many requests'
  } = options;

  const windowSeconds = Math.ceil(windowMs / 1000);

  return async (c, next) => {
    const identifier = await getClientIdentifier(c.req);
    const key = `erl:${identifier}:${maxRequests}:${windowSeconds}`;

    let result;
    try {
      result = await consume(c.env, key, maxRequests, windowSeconds);
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

    setRateLimitHeaders(c, result, maxRequests);
    if (!result.allowed) {
      return c.json({ error: message, retryAfter: Math.max(1, result.resetAt - Math.floor(Date.now() / 1000)) }, 429);
    }
    await next();
  };
};

/**
 * Get client identifier for rate limiting
 * API keys are hashed before use so raw keys never appear in KV keys or logs
 */
async function getClientIdentifier(req) {
  const apiKey = req.header('X-API-Key');
  if (apiKey) {
    const encoder = new TextEncoder();
    const data = encoder.encode(apiKey);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return `api:${hashHex.slice(0, 16)}`;
  }

  const ip = req.header('CF-Connecting-IP') ||
              req.header('X-Forwarded-For')?.split(',')[0] ||
              'unknown';

  return `ip:${ip}`;
}

/**
 * DDoS Protection Middleware
 * KV-backed IP banning — persists across Worker isolates and cold starts
 */
export const ddosProtection = () => {
  const THRESHOLD = 1000; // requests per minute before ban
  const WINDOW_SECONDS = 60;
  const BAN_SECONDS = 3600; // 1 hour ban

  return async (c, next) => {
    const kv = c.env.CACHE;
    const ip = c.req.header('CF-Connecting-IP') ||
               c.req.header('X-Forwarded-For')?.split(',')[0] ||
               'unknown';

    if (!kv) {
      await next();
      return;
    }

    // Check if IP is currently banned
    const banKey = `ddos:ban:${ip}`;
    const banned = await kv.get(banKey);
    if (banned) {
      return c.json({
        error: 'Access temporarily blocked due to suspicious activity',
        retryAfter: BAN_SECONDS
      }, 403);
    }

    // Increment request counter for this IP
    const countKey = `ddos:count:${ip}`;
    const current = await kv.get(countKey);
    const count = current ? Number.parseInt(current, 10) : 0;

    if (count >= THRESHOLD) {
      // Ban the IP
      await kv.put(banKey, '1', { expirationTtl: BAN_SECONDS });
      await kv.delete(countKey);
      console.warn(`[DDoS] IP ${ip} banned after ${count} requests in ${WINDOW_SECONDS}s`);
      return c.json({
        error: 'Access temporarily blocked due to suspicious activity',
        retryAfter: BAN_SECONDS
      }, 403);
    }

    await kv.put(countKey, String(count + 1), { expirationTtl: WINDOW_SECONDS });

    await next();
  };
};

