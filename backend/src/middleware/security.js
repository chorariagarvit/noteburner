/**
 * Security Headers Middleware
 * Implements Content Security Policy and other security headers
 */

export const securityHeaders = () => {
  return async (c, next) => {
    await next();

    // Content Security Policy
    const csp = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net https://unpkg.com", // Allow React DevTools in dev
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
 * Enhanced rate limiting with sliding window
 */
export const enhancedRateLimit = (options = {}) => {
  const {
    windowMs = 60000, // 1 minute
    maxRequests = 100,
    message = 'Too many requests',
    skipSuccessfulRequests = false
  } = options;

  // In-memory store (for production, use Cloudflare KV or Durable Objects)
  const requests = new Map();

  return async (c, next) => {
    const identifier = getClientIdentifier(c.req);
    const now = Date.now();

    // Clean up old entries
    if (requests.size > 10000) {
      // Clean entries older than windowMs
      for (const [key, value] of requests.entries()) {
        if (now - value.resetTime > windowMs) {
          requests.delete(key);
        }
      }
    }

    // Get or create request record
    let record = requests.get(identifier);
    if (!record || now - record.resetTime > windowMs) {
      record = {
        count: 0,
        resetTime: now + windowMs
      };
    }

    // Increment request count
    record.count++;
    requests.set(identifier, record);

    // Check if rate limit exceeded
    if (record.count > maxRequests) {
      c.header('X-RateLimit-Limit', maxRequests.toString());
      c.header('X-RateLimit-Remaining', '0');
      c.header('X-RateLimit-Reset', new Date(record.resetTime).toISOString());
      c.header('Retry-After', Math.ceil((record.resetTime - now) / 1000).toString());

      return c.json({
        error: message,
        retryAfter: Math.ceil((record.resetTime - now) / 1000)
      }, 429);
    }

    // Set rate limit headers
    c.header('X-RateLimit-Limit', maxRequests.toString());
    c.header('X-RateLimit-Remaining', (maxRequests - record.count).toString());
    c.header('X-RateLimit-Reset', new Date(record.resetTime).toISOString());

    await next();

    // Reset count for successful requests if configured
    if (skipSuccessfulRequests && c.res.status < 400) {
      record.count--;
      requests.set(identifier, record);
    }
  };
};

/**
 * Get client identifier for rate limiting
 */
function getClientIdentifier(req) {
  // Priority: API key > IP address
  const apiKey = req.header('X-API-Key');
  if (apiKey) {
    return `api:${apiKey}`;
  }

  // Use Cloudflare's connecting IP
  const ip = req.header('CF-Connecting-IP') || 
              req.header('X-Forwarded-For')?.split(',')[0] ||
              'unknown';
  
  return `ip:${ip}`;
}

/**
 * DDoS Protection Middleware
 * Blocks suspicious traffic patterns
 */
export const ddosProtection = () => {
  const suspiciousIPs = new Map(); // IP -> { count, firstSeen }
  const THRESHOLD = 1000; // requests
  const TIME_WINDOW = 60000; // 1 minute
  const BAN_DURATION = 3600000; // 1 hour

  return async (c, next) => {
    const ip = c.req.header('CF-Connecting-IP') || 
               c.req.header('X-Forwarded-For')?.split(',')[0] ||
               'unknown';

    const now = Date.now();
    const record = suspiciousIPs.get(ip);

    // Check if IP is banned
    if (record?.banned && now - record.bannedAt < BAN_DURATION) {
      return c.json({
        error: 'Access temporarily blocked due to suspicious activity',
        retryAfter: Math.ceil((BAN_DURATION - (now - record.bannedAt)) / 1000)
      }, 403);
    }

    // Track request
    if (!record || now - record.firstSeen > TIME_WINDOW) {
      suspiciousIPs.set(ip, {
        count: 1,
        firstSeen: now,
        banned: false
      });
    } else {
      record.count++;
      
      // Ban if threshold exceeded
      if (record.count > THRESHOLD) {
        record.banned = true;
        record.bannedAt = now;
        console.warn(`IP ${ip} banned for DDoS-like behavior (${record.count} requests in ${TIME_WINDOW}ms)`);
        
        return c.json({
          error: 'Access temporarily blocked due to suspicious activity',
          retryAfter: BAN_DURATION / 1000
        }, 403);
      }
      
      suspiciousIPs.set(ip, record);
    }

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
