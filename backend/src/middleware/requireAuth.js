/**
 * Authentication middleware
 * Validates session tokens and attaches user to context
 */

import { validateSession } from '../utils/session.js';

/**
 * Middleware to require authentication
 * Validates session token and attaches user to context
 * Returns 401 if authentication fails
 */
export async function requireAuth(c, next) {
  // Extract session token from header
  const authHeader = c.req.header('Authorization');
  const sessionToken = authHeader?.replace('Bearer ', '') || c.req.header('X-Session-Token');

  if (!sessionToken) {
    return c.json({ 
      error: 'Authentication required', 
      code: 'AUTH_REQUIRED' 
    }, 401);
  }

  // Validate session
  const session = await validateSession(c.env.DB, sessionToken);

  if (!session) {
    return c.json({ 
      error: 'Invalid or expired session', 
      code: 'INVALID_SESSION' 
    }, 401);
  }

  // Attach user ID to context for use in routes
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
    const session = await validateSession(c.env.DB, sessionToken);
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
