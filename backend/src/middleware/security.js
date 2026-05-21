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
      "connect-src 'self' https://api.noteburner.app wss://api.noteburner.app",
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
    const kv = c.env.CACHE;

    if (!kv) {
      console.warn('[RateLimit] KV namespace not available, skipping rate limit');
      await next();
      return;
    }

    const identifier = await getClientIdentifier(c.req);
    const key = `erl:${identifier}:${maxRequests}:${windowSeconds}`;
    const current = await kv.get(key);
    const count = current ? parseInt(current, 10) : 0;

    if (count >= maxRequests) {
      c.header('X-RateLimit-Limit', maxRequests.toString());
      c.header('X-RateLimit-Remaining', '0');
      c.header('Retry-After', windowSeconds.toString());
      return c.json({ error: message, retryAfter: windowSeconds }, 429);
    }

    // Only set TTL on first write to avoid sliding the window on every request
    if (count === 0) {
      await kv.put(key, '1', { expirationTtl: windowSeconds });
    } else {
      await kv.put(key, String(count + 1));
    }

    c.header('X-RateLimit-Limit', maxRequests.toString());
    c.header('X-RateLimit-Remaining', String(maxRequests - count - 1));

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
      const ttl = parseInt(banned, 10);
      return c.json({
        error: 'Access temporarily blocked due to suspicious activity',
        retryAfter: BAN_SECONDS
      }, 403);
    }

    // Increment request counter for this IP
    const countKey = `ddos:count:${ip}`;
    const current = await kv.get(countKey);
    const count = current ? parseInt(current, 10) : 0;

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

/**
 * API Key Validation Middleware
 */
export const requireApiKey = () => {
  return async (c, next) => {
    const apiKey = c.req.header('X-API-Key');

    if (!apiKey) {
      return c.json({ error: 'API key required' }, 401);
    }

    // Validate API key from database
    const validKey = await c.env.DB.prepare(`
      SELECT id, user_id, rate_limit, last_used_at
      FROM api_keys
      WHERE key = ? AND active = 1
    `).bind(apiKey).first();

    if (!validKey) {
      return c.json({ error: 'Invalid API key' }, 401);
    }

    // Update last used timestamp
    await c.env.DB.prepare(`
      UPDATE api_keys SET last_used_at = datetime('now') WHERE id = ?
    `).bind(validKey.id).run();

    // Store key info in context for later use
    c.set('apiKey', validKey);

    await next();
  };
};
