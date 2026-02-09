import { Hono } from 'hono';

const router = new Hono();

/**
 * Audit Log System (Privacy-First)
 * Provides transparency without storing sensitive data
 */

/**
 * Get audit logs for a specific message (by creator)
 * GET /api/audit/:messageId
 */
router.get('/:messageId', async (c) => {
  try {
    const messageId = c.req.param('messageId');
    const creatorToken = c.req.header('X-Creator-Token');

    if (!creatorToken) {
      return c.json({ error: 'Creator token required' }, 401);
    }

    // Verify creator token matches message
    const message = await c.env.DB.prepare(`
      SELECT id, creator_token, created_at, expires_at, max_views, view_count, password_attempts
      FROM messages
      WHERE id = ? AND creator_token = ?
    `).bind(messageId, creatorToken).first();

    if (!message) {
      return c.json({ error: 'Message not found or unauthorized' }, 404);
    }

    // Get audit events for this message
    const events = await c.env.DB.prepare(`
      SELECT event_type, country, timestamp, success, metadata
      FROM audit_logs
      WHERE message_id = ?
      ORDER BY timestamp DESC
      LIMIT 100
    `).bind(messageId).all();

    return c.json({
      message: {
        id: message.id,
        created_at: message.created_at,
        expires_at: message.expires_at,
        max_views: message.max_views,
        view_count: message.view_count,
        password_attempts: message.password_attempts
      },
      events: events.results.map(event => ({
        type: event.event_type,
        country: event.country, // Country-level only for privacy
        timestamp: event.timestamp,
        success: event.success === 1,
        metadata: event.metadata ? JSON.parse(event.metadata) : null
      }))
    });

  } catch (error) {
    console.error('Audit log error:', error);
    return c.json({ error: 'Failed to fetch audit logs' }, 500);
  }
});

/**
 * Log an audit event (internal use)
 */
export async function logAuditEvent(env, data) {
  const {
    messageId,
    eventType,
    country = null,
    success = true,
    metadata = null
  } = data;

  try {
    await env.DB.prepare(`
      INSERT INTO audit_logs (message_id, event_type, country, timestamp, success, metadata)
      VALUES (?, ?, ?, datetime('now'), ?, ?)
    `).bind(
      messageId,
      eventType,
      country,
      success ? 1 : 0,
      metadata ? JSON.stringify(metadata) : null
    ).run();
  } catch (error) {
    console.error('Failed to log audit event:', error);
    // Don't fail the request if audit logging fails
  }
}

/**
 * Get country from IP (privacy-friendly)
 * Only returns country code, no city or precise location
 */
export function getCountryFromRequest(request) {
  // Cloudflare provides cf object with country code
  const country = request.cf?.country || 'UNKNOWN';
  return country;
}

/**
 * Detect suspicious activity patterns
 */
export async function detectSuspiciousActivity(env, messageId) {
  // Check for rapid password attempts from multiple countries
  const recentAttempts = await env.DB.prepare(`
    SELECT country, COUNT(*) as count
    FROM audit_logs
    WHERE message_id = ?
      AND event_type = 'password_attempt'
      AND timestamp > datetime('now', '-5 minutes')
    GROUP BY country
    HAVING count > 3
  `).bind(messageId).all();

  // Suspicious if >3 attempts from same country in 5 minutes
  const suspiciousCountries = recentAttempts.results.filter(r => r.count > 3);

  // Or if attempts from 3+ different countries rapidly
  const countryCount = recentAttempts.results.length;

  return {
    isSuspicious: suspiciousCountries.length > 0 || countryCount >= 3,
    reason: suspiciousCountries.length > 0 
      ? 'Rapid password attempts detected'
      : countryCount >= 3 
        ? 'Access attempts from multiple countries'
        : null,
    countries: recentAttempts.results.map(r => r.country)
  };
}

export default router;
