/**
 * Authentication middleware
 * Validates session tokens and attaches user to context
 * Uses KV cache to avoid a D1 lookup on every request
 */

import { validateSession } from '../utils/session.js';
import { cacheAside, getSessionCacheKey, CACHE_TTL } from '../utils/cache.js';

/**
 * Middleware to require authentication
 * Validates session token and attaches user to context
 * Returns 401 if authentication fails
 */
export async function requireAuth(c, next) {
  const authHeader = c.req.header('Authorization');
  const sessionToken = authHeader?.replace('Bearer ', '') || c.req.header('X-Session-Token');

  if (!sessionToken) {
    return c.json({ error: 'Authentication required', code: 'AUTH_REQUIRED' }, 401);
  }

  // Use KV cache-aside: avoids D1 on every authenticated request
  const session = await cacheAside(
    c.env.CACHE,
    getSessionCacheKey(sessionToken),
    () => validateSession(c.env.DB, sessionToken),
    CACHE_TTL.USER_SESSION
  );

  if (!session) {
    return c.json({ error: 'Invalid or expired session', code: 'INVALID_SESSION' }, 401);
  }

  c.set('userId', session.userId);
  c.set('sessionToken', session.sessionToken);

  await next();
}

/**
 * Middleware to optionally authenticate
 * Attaches user to context if valid session, but doesn't require it
 */
export async function optionalAuth(c, next) {
  const authHeader = c.req.header('Authorization');
  const sessionToken = authHeader?.replace('Bearer ', '') || c.req.header('X-Session-Token');

  if (sessionToken) {
    const session = await cacheAside(
      c.env.CACHE,
      getSessionCacheKey(sessionToken),
      () => validateSession(c.env.DB, sessionToken),
      CACHE_TTL.USER_SESSION
    );
    if (session) {
      c.set('userId', session.userId);
      c.set('sessionToken', session.sessionToken);
    }
  }

  await next();
}

/**
 * Helper to get user ID from context
 * @param {Object} c - Hono context
 * @returns {string|null} - User ID or null
 */
export function getUserId(c) {
  return c.get('userId') || null;
}
