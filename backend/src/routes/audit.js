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
      SELECT token AS id, creator_token, created_at, expires_at, max_views, view_count, password_attempts
      FROM messages
      WHERE token = ? AND creator_token = ?
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

// Audit events are written by utils/protections.js (country-level only, no IP addresses).

export default router;
