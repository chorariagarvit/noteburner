/**
 * Session management utilities
 * Handles session creation, validation, and cleanup
 */

import { customAlphabet } from 'nanoid';

// Session expiration times (in milliseconds)
const SESSION_EXPIRY_SHORT = 7 * 24 * 60 * 60 * 1000; // 7 days
const SESSION_EXPIRY_LONG = 30 * 24 * 60 * 60 * 1000; // 30 days (remember me)

/**
 * Generate a secure session token
 * Format: session_{userId}_{randomToken}
 * @param {string} userId - User ID
 * @returns {string} - Session token
 */
export function generateSessionToken(userId) {
  const alphabet = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
  const nanoid = customAlphabet(alphabet, 32);
  const randomToken = nanoid();
  return `session_${userId}_${randomToken}`;
}

/**
 * Extract user ID from session token
 * @param {string} sessionToken - Session token
 * @returns {string|null} - User ID or null
 */
export function extractUserIdFromToken(sessionToken) {
  if (!sessionToken || typeof sessionToken !== 'string') {
    return null;
  }

  // Format: session_{userId}_{randomToken}
  const parts = sessionToken.split('_');
  if (parts.length >= 3 && parts[0] === 'session') {
    // Join all parts except first (session) and last (random token)
    return parts.slice(1, -1).join('_');
  }

  return null;
}

/**
 * Create a new session in the database
 * @param {Object} db - D1 database connection
 * @param {string} userId - User ID
 * @param {Object} options - Session options
 * @returns {Promise<Object>} - Session data
 */
export async function createSession(db, userId, options = {}) {
  const {
    rememberMe = false,
    ipAddress = null,
    userAgent = null
  } = options;

  const sessionToken = generateSessionToken(userId);
  const expiryMs = rememberMe ? SESSION_EXPIRY_LONG : SESSION_EXPIRY_SHORT;
  const expiresAt = new Date(Date.now() + expiryMs).toISOString();

  await db.prepare(`
    INSERT INTO sessions (session_token, user_id, expires_at, ip_address, user_agent, remember_me)
    VALUES (?, ?, ?, ?, ?, ?)
  `).bind(sessionToken, userId, expiresAt, ipAddress, userAgent, rememberMe ? 1 : 0).run();

  return {
    sessionToken,
    userId,
    expiresAt,
    rememberMe
  };
}

/**
 * Validate a session token
 * @param {Object} db - D1 database connection
 * @param {string} sessionToken - Session token to validate
 * @returns {Promise<Object|null>} - Session data or null if invalid
 */
export async function validateSession(db, sessionToken) {
  if (!sessionToken) {
    return null;
  }

  const session = await db.prepare(`
    SELECT session_token, user_id, expires_at, remember_me, created_at
    FROM sessions
    WHERE session_token = ?
  `).bind(sessionToken).first();

  if (!session) {
    return null;
  }

  // Check if session has expired
  const expiresAt = new Date(session.expires_at);
  if (expiresAt < new Date()) {
    // Session expired, delete it
    await revokeSession(db, sessionToken);
    return null;
  }

  // Update last_accessed_at
  await db.prepare(`
    UPDATE sessions
    SET last_accessed_at = CURRENT_TIMESTAMP
    WHERE session_token = ?
  `).bind(sessionToken).run();

  return {
    sessionToken: session.session_token,
    userId: session.user_id,
    expiresAt: session.expires_at,
    rememberMe: session.remember_me === 1,
    createdAt: session.created_at
  };
}

/**
 * Refresh a session (extend expiration time)
 * @param {Object} db - D1 database connection
 * @param {string} sessionToken - Session token to refresh
 * @returns {Promise<Object|null>} - Updated session data or null
 */
export async function refreshSession(db, sessionToken) {
  const session = await validateSession(db, sessionToken);
  
  if (!session) {
    return null;
  }

  const expiryMs = session.rememberMe ? SESSION_EXPIRY_LONG : SESSION_EXPIRY_SHORT;
  const newExpiresAt = new Date(Date.now() + expiryMs).toISOString();

  await db.prepare(`
    UPDATE sessions
    SET expires_at = ?, last_accessed_at = CURRENT_TIMESTAMP
    WHERE session_token = ?
  `).bind(newExpiresAt, sessionToken).run();

  return {
    ...session,
    expiresAt: newExpiresAt
  };
}

/**
 * Revoke a specific session
 * @param {Object} db - D1 database connection
 * @param {string} sessionToken - Session token to revoke
 * @returns {Promise<void>}
 */
export async function revokeSession(db, sessionToken) {
  await db.prepare(`
    DELETE FROM sessions WHERE session_token = ?
  `).bind(sessionToken).run();
}

/**
 * Revoke all sessions for a user
 * @param {Object} db - D1 database connection
 * @param {string} userId - User ID
 * @returns {Promise<void>}
 */
export async function revokeAllUserSessions(db, userId) {
  await db.prepare(`
    DELETE FROM sessions WHERE user_id = ?
  `).bind(userId).run();
}

/**
 * Get all active sessions for a user
 * @param {Object} db - D1 database connection
 * @param {string} userId - User ID
 * @returns {Promise<Array>} - List of active sessions
 */
export async function getUserSessions(db, userId) {
  const now = new Date().toISOString();
  
  const sessions = await db.prepare(`
    SELECT session_token, created_at, last_accessed_at, ip_address, user_agent, remember_me
    FROM sessions
    WHERE user_id = ? AND expires_at > ?
    ORDER BY last_accessed_at DESC
  `).bind(userId, now).all();

  return sessions.results || [];
}

/**
 * Clean up expired sessions
 * @param {Object} db - D1 database connection
 * @returns {Promise<number>} - Number of sessions deleted
 */
export async function cleanupExpiredSessions(db) {
  const now = new Date().toISOString();
  
  const result = await db.prepare(`
    DELETE FROM sessions WHERE expires_at < ?
  `).bind(now).run();

  return result.meta.changes || 0;
}
