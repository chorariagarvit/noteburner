/**
 * Authentication middleware for NoteBurner
 * Supports both session-based and API key authentication
 */

/**
 * Simple session-based auth middleware (placeholder)
 * In production, integrate with proper auth provider (Clerk, Auth0, etc.)
 */
export function requireAuth() {
  return async (c, next) => {
    // Check for session token in Authorization header or cookie
    const authHeader = c.req.header('Authorization');
    const sessionToken = authHeader?.replace('Bearer ', '') || c.req.header('X-Session-Token');

    console.log('[AUTH] Token:', sessionToken);

    if (!sessionToken) {
      return c.json({ error: 'Authentication required', code: 'AUTH_REQUIRED' }, 401);
    }

    // In production, validate session token with auth provider
    // For now, decode a simple JWT or session token
    // This is a PLACEHOLDER - DO NOT USE IN PRODUCTION
    
    try {
      // Mock user ID extraction (replace with real auth)
      // Format: "session_<userId>"
      if (sessionToken.startsWith('session_')) {
        const userId = sessionToken.replace('session_', '');
        console.log('[AUTH] Setting userId:', userId);
        c.set('userId', userId);
        c.set('authMethod', 'session');
        await next();
      } else {
        return c.json({ error: 'Invalid session token', code: 'INVALID_TOKEN' }, 401);
      }
    } catch (err) {
      console.error('[AUTH] Error:', err);
      return c.json({ error: 'Authentication failed', code: 'AUTH_FAILED' }, 401);
    }
  };
}

/**
 * Optional auth middleware - sets userId if present but doesn't require it
 */
export function optionalAuth() {
  return async (c, next) => {
    const authHeader = c.req.header('Authorization');
    const sessionToken = authHeader?.replace('Bearer ', '') || c.req.header('X-Session-Token');

    if (sessionToken && sessionToken.startsWith('session_')) {
      const userId = sessionToken.replace('session_', '');
      c.set('userId', userId);
      c.set('authMethod', 'session');
    }

    await next();
  };
}

/**
 * API Key authentication middleware
 * Used for /api/v1 endpoints
 */
export async function requireApiKey(c, next) {
  const apiKey = c.req.header('X-API-Key');
  
  if (!apiKey) {
    return c.json({ error: 'API key required', code: 'API_KEY_MISSING' }, 401);
  }

  // Verify API key and check if active
  const keyData = await c.env.DB.prepare(`
    SELECT id, user_id, rate_limit, active, requests_today, last_reset_at
    FROM api_keys 
    WHERE key = ? AND active = 1
  `).bind(apiKey).first();

  if (!keyData) {
    return c.json({ error: 'Invalid or inactive API key', code: 'API_KEY_INVALID' }, 401);
  }

  // Check rate limit
  const now = new Date();
  const lastReset = new Date(keyData.last_reset_at);
  const hoursSinceReset = (now - lastReset) / (1000 * 60 * 60);

  let requestsToday = keyData.requests_today;

  // Reset daily counter if it's a new day
  if (hoursSinceReset >= 24) {
    requestsToday = 0;
    await c.env.DB.prepare(`
      UPDATE api_keys 
      SET requests_today = 0, last_reset_at = datetime('now')
      WHERE id = ?
    `).bind(keyData.id).run();
  }

  // Check if rate limit exceeded
  if (requestsToday >= keyData.rate_limit) {
    return c.json({ 
      error: 'Rate limit exceeded', 
      code: 'RATE_LIMIT_EXCEEDED',
      limit: keyData.rate_limit,
      reset_at: new Date(lastReset.getTime() + 24 * 60 * 60 * 1000).toISOString()
    }, 429);
  }

  // Increment request counter
  await c.env.DB.prepare(`
    UPDATE api_keys 
    SET requests_today = requests_today + 1,
        requests_month = requests_month + 1,
        last_used_at = datetime('now')
    WHERE id = ?
  `).bind(keyData.id).run();

  // Store user info in context
  c.set('userId', keyData.user_id);
  c.set('apiKeyId', keyData.id);
  c.set('authMethod', 'api_key');

  await next();
}
