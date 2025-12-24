// Rate limiting middleware
const rateLimitMap = new Map();

export function checkRateLimit(ip, limit = 10, window = 60000, env = {}) {
  // Skip rate limiting in local development mode
  if (env.FRONTEND_URL === 'http://localhost:5173') {
    return true;
  }

  const now = Date.now();
  const userRequests = rateLimitMap.get(ip) || [];
  const recentRequests = userRequests.filter(time => now - time < window);

  if (recentRequests.length >= limit) {
    return false;
  }

  recentRequests.push(now);
  rateLimitMap.set(ip, recentRequests);
  return true;
}

// Middleware wrapper for routes
export function rateLimitMiddleware(limit = 10, window = 60000) {
  return async (c, next) => {
    const ip = c.req.header('CF-Connecting-IP') || 'unknown';
    
    if (!checkRateLimit(ip, limit, window, c.env)) {
      return c.json({ error: 'Rate limit exceeded' }, 429);
    }
    
    await next();
  };
}
