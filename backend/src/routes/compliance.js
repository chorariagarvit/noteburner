import { Hono } from 'hono';
import { nanoid } from 'nanoid';
import { requireAuth, getUserId } from '../middleware/requireAuth.js';

const router = new Hono();

/**
 * Helper: Check team admin permission
 */
async function checkTeamAdmin(db, teamId, userId) {
  const member = await db.prepare(`
    SELECT role FROM team_members WHERE team_id = ? AND user_id = ?
  `).bind(teamId, userId).first();

  return member && member.role === 'admin';
}

/**
 * GET /api/compliance/:teamId/settings
 * Get compliance settings for a team
 */
router.get('/:teamId/settings', requireAuth, async (c) => {
  const userId = getUserId(c);
  const teamId = c.req.param('teamId');

  const isAdmin = await checkTeamAdmin(c.env.DB, teamId, userId);
  if (!isAdmin) {
    return c.json({ error: 'Admin access required', code: 'ACCESS_DENIED' }, 403);
  }

  const settings = await c.env.DB.prepare(`
    SELECT * FROM compliance_settings WHERE team_id = ?
  `).bind(teamId).first();

  if (!settings) {
    return c.json({
      settings: {
        team_id: teamId,
        data_retention_days: 30,
        gdpr_enabled: true,
        auto_delete_enabled: true,
        audit_log_retention: 90,
        require_password: false,
        min_password_strength: 2
      }
    });
  }

  return c.json({ 
    settings: {
      ...settings,
      gdpr_enabled: Boolean(settings.gdpr_enabled),
      auto_delete_enabled: Boolean(settings.auto_delete_enabled),
      require_password: Boolean(settings.require_password)
    }
  });
});

/**
 * PUT /api/compliance/:teamId/settings
 * Update compliance settings
 */
router.put('/:teamId/settings', requireAuth, async (c) => {
  const userId = getUserId(c);
  const teamId = c.req.param('teamId');
  const body = await c.req.json();

  const isAdmin = await checkTeamAdmin(c.env.DB, teamId, userId);
  if (!isAdmin) {
    return c.json({ error: 'Admin access required', code: 'ACCESS_DENIED' }, 403);
  }

  const {
    data_retention_days,
    gdpr_enabled,
    auto_delete_enabled,
    audit_log_retention,
    require_password,
    min_password_strength
  } = body;

  // Validate values
  if (data_retention_days !== undefined && (data_retention_days < 1 || data_retention_days > 3650)) {
    return c.json({ error: 'Retention days must be between 1 and 3650', code: 'INVALID_VALUE' }, 400);
  }

  if (min_password_strength !== undefined && (min_password_strength < 0 || min_password_strength > 4)) {
    return c.json({ error: 'Password strength must be between 0 and 4', code: 'INVALID_VALUE' }, 400);
  }

  const updates = [];
  const params = [];

  if (data_retention_days !== undefined) {
    updates.push('data_retention_days = ?');
    params.push(data_retention_days);
  }
  if (gdpr_enabled !== undefined) {
    updates.push('gdpr_enabled = ?');
    params.push(gdpr_enabled ? 1 : 0);
  }
  if (auto_delete_enabled !== undefined) {
    updates.push('auto_delete_enabled = ?');
    params.push(auto_delete_enabled ? 1 : 0);
  }
  if (audit_log_retention !== undefined) {
    updates.push('audit_log_retention = ?');
    params.push(audit_log_retention);
  }
  if (require_password !== undefined) {
    updates.push('require_password = ?');
    params.push(require_password ? 1 : 0);
  }
  if (min_password_strength !== undefined) {
    updates.push('min_password_strength = ?');
    params.push(min_password_strength);
  }

  if (updates.length === 0) {
    return c.json({ error: 'No updates provided', code: 'NO_UPDATES' }, 400);
  }

  updates.push('updated_at = datetime("now")');
  params.push(teamId);

  await c.env.DB.prepare(`
    UPDATE compliance_settings SET ${updates.join(', ')} WHERE team_id = ?
  `).bind(...params).run();

  return c.json({ success: true, message: 'Compliance settings updated' });
});

/**
 * GET /api/compliance/:teamId/export/audit-logs
 * Export audit logs for a team (CSV or JSON)
 */
router.get('/:teamId/export/audit-logs', requireAuth, async (c) => {
  const userId = getUserId(c);
  const teamId = c.req.param('teamId');
  const format = c.req.query('format') || 'json'; // json or csv
  const startDate = c.req.query('start_date');
  const endDate = c.req.query('end_date');

  const isAdmin = await checkTeamAdmin(c.env.DB, teamId, userId);
  if (!isAdmin) {
    return c.json({ error: 'Admin access required', code: 'ACCESS_DENIED' }, 403);
  }

  // Get audit logs for team messages
  let query = `
    SELECT al.id, al.message_id, al.event_type, al.country, al.timestamp, al.success, al.metadata,
           al.team_id, m.custom_slug
    FROM audit_logs al
    LEFT JOIN messages m ON al.message_id = m.token
    WHERE al.team_id = ?
  `;
  const params = [teamId];

  if (startDate) {
    query += ` AND al.timestamp >= ?`;
    params.push(startDate);
  }
  if (endDate) {
    query += ` AND al.timestamp <= ?`;
    params.push(endDate);
  }

  query += ` ORDER BY al.timestamp DESC LIMIT 10000`; // Max 10k records

  const logs = await c.env.DB.prepare(query).bind(...params).all();

  if (format === 'csv') {
    // Generate CSV
    const csvLines = ['ID,Message ID,Event Type,Country,Timestamp,Success,Metadata'];
    
    for (const log of (logs.results || [])) {
      csvLines.push([
        log.id,
        log.message_id,
        log.event_type,
        log.country || '',
        log.timestamp,
        log.success,
        log.metadata || ''
      ].join(','));
    }

    const csv = csvLines.join('\n');
    
    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="audit-logs-${teamId}-${new Date().toISOString().split('T')[0]}.csv"`
      }
    });
  }

  // Return JSON
  return c.json({
    audit_logs: logs.results || [],
    count: logs.results?.length || 0,
    exported_at: new Date().toISOString()
  });
});

/**
 * GET /api/compliance/:teamId/export/messages
 * Export message metadata for compliance (GDPR data export)
 */
router.get('/:teamId/export/messages', requireAuth, async (c) => {
  const userId = getUserId(c);
  const teamId = c.req.param('teamId');
  const format = c.req.query('format') || 'json';

  const isAdmin = await checkTeamAdmin(c.env.DB, teamId, userId);
  if (!isAdmin) {
    return c.json({ error: 'Admin access required', code: 'ACCESS_DENIED' }, 403);
  }

  const messages = await c.env.DB.prepare(`
    SELECT 
      m.id,
      m.created_at,
      m.expires_at,
      m.accessed_at,
      m.view_count,
      m.max_views,
      m.custom_slug,
      m.created_via,
      m.user_id as created_by,
      LENGTH(m.encrypted_data) as content_length
    FROM messages m
    WHERE m.team_id = ?
    ORDER BY m.created_at DESC
    LIMIT 50000
  `).bind(teamId).all();

  if (format === 'csv') {
    const csvLines = ['ID,Created,Expires,Accessed,Views,Max Views,Slug,Created Via,Content Length'];
    
    for (const msg of (messages.results || [])) {
      csvLines.push([
        msg.id,
        msg.created_at,
        msg.expires_at,
        msg.accessed_at || '',
        msg.view_count || 0,
        msg.max_views || 1,
        msg.custom_slug || '',
        msg.created_via || 'web',
        msg.content_length || 0
      ].join(','));
    }

    const csv = csvLines.join('\n');
    
    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="messages-${teamId}-${new Date().toISOString().split('T')[0]}.csv"`
      }
    });
  }

  return c.json({
    messages: messages.results || [],
    count: messages.results?.length || 0,
    exported_at: new Date().toISOString(),
    note: 'Content not included for security - only metadata exported'
  });
});

/**
 * POST /api/compliance/:teamId/gdpr/delete-all
 * GDPR Right to be Forgotten - Delete all team data
 */
router.post('/:teamId/gdpr/delete-all', requireAuth, async (c) => {
  const userId = getUserId(c);
  const teamId = c.req.param('teamId');
  const body = await c.req.json();

  // Verify team owner (not just admin)
  const team = await c.env.DB.prepare(`
    SELECT owner_id FROM teams WHERE id = ?
  `).bind(teamId).first();

  if (!team || team.owner_id !== userId) {
    return c.json({ error: 'Team owner access required', code: 'ACCESS_DENIED' }, 403);
  }

  // Require confirmation
  if (body.confirmation !== 'DELETE_ALL_DATA') {
    return c.json({ 
      error: 'Confirmation required', 
      code: 'CONFIRMATION_REQUIRED',
      message: 'Send {"confirmation": "DELETE_ALL_DATA"} to confirm'
    }, 400);
  }

  // Delete everything tied to the team. CASCADE only covers members/branding/settings, so
  // messages, their audit logs and R2 media must be removed explicitly (in D1-safe chunks).
  const teamMessages = await c.env.DB.prepare(
    `SELECT token, media_files FROM messages WHERE team_id = ?`
  ).bind(teamId).all();
  const rows = teamMessages.results || [];
  const tokens = rows.map(r => r.token);
  const mediaIds = rows.flatMap(r => (r.media_files ? JSON.parse(r.media_files) : []));
  await Promise.allSettled(mediaIds.map(id => c.env.MEDIA_BUCKET.delete(id)));
  for (let i = 0; i < tokens.length; i += 90) {
    const chunk = tokens.slice(i, i + 90);
    const ph = chunk.map(() => '?').join(', ');
    await c.env.DB.prepare(`DELETE FROM audit_logs WHERE message_id IN (${ph})`).bind(...chunk).run();
    await c.env.DB.prepare(`DELETE FROM messages WHERE token IN (${ph})`).bind(...chunk).run();
  }
  await c.env.DB.prepare(`DELETE FROM audit_logs WHERE team_id = ?`).bind(teamId).run();
  await c.env.DB.prepare(`DELETE FROM teams WHERE id = ?`).bind(teamId).run();

  return c.json({ 
    success: true, 
    message: 'Team, its members, settings, messages, audit logs and attached files were deleted.',
    deleted_messages: tokens.length,
    deleted_at: new Date().toISOString()
  });
});

/**
 * GET /api/compliance/:teamId/report
 * Generate compliance report
 */
router.get('/:teamId/report', requireAuth, async (c) => {
  const userId = getUserId(c);
  const teamId = c.req.param('teamId');

  const isAdmin = await checkTeamAdmin(c.env.DB, teamId, userId);
  if (!isAdmin) {
    return c.json({ error: 'Admin access required', code: 'ACCESS_DENIED' }, 403);
  }

  // Get team info
  const team = await c.env.DB.prepare(`
    SELECT * FROM teams WHERE id = ?
  `).bind(teamId).first();

  // Get compliance settings
  const settings = await c.env.DB.prepare(`
    SELECT * FROM compliance_settings WHERE team_id = ?
  `).bind(teamId).first();

  // Get message statistics
  const messageStats = await c.env.DB.prepare(`
    SELECT 
      COUNT(*) as total_messages,
      COUNT(CASE WHEN view_count > 0 THEN 1 END) as accessed_messages,
      COUNT(CASE WHEN max_views > 0 AND view_count >= max_views THEN 1 END) as fully_viewed,
      COUNT(CASE WHEN expires_at IS NOT NULL AND expires_at < ? THEN 1 END) as expired_messages
    FROM messages
    WHERE team_id = ?
  `).bind(Date.now(), teamId).first();

  // Lifetime activity from the daily counters (burned messages no longer have a row)
  const lifetime = await c.env.DB.prepare(`
    SELECT COALESCE(SUM(messages_created), 0) AS created,
           COALESCE(SUM(messages_viewed), 0) AS viewed,
           COALESCE(SUM(messages_burned), 0) AS burned
    FROM team_stats WHERE team_id = ?
  `).bind(teamId).first();

  // Get audit log count
  const { audit_count } = await c.env.DB.prepare(`
    SELECT COUNT(*) as audit_count
    FROM audit_logs
    WHERE team_id = ?
  `).bind(teamId).first();

  // Get member count
  const { member_count } = await c.env.DB.prepare(`
    SELECT COUNT(*) as member_count FROM team_members WHERE team_id = ?
  `).bind(teamId).first();

  return c.json({
    report: {
      team: {
        id: team.id,
        name: team.name,
        plan: team.plan,
        created_at: team.created_at
      },
      compliance_settings: settings,
      statistics: {
        ...messageStats,
        lifetime_created: lifetime.created,
        lifetime_viewed: lifetime.viewed,
        lifetime_burned: lifetime.burned,
        audit_log_entries: audit_count,
        team_members: member_count
      },
      gdpr_compliance: {
        enabled: Boolean(settings?.gdpr_enabled),
        data_retention_days: settings?.data_retention_days || 30,
        auto_delete_enabled: Boolean(settings?.auto_delete_enabled),
        right_to_access: 'API available',
        right_to_deletion: 'Supported via /gdpr/delete-all endpoint',
        right_to_export: 'Supported via /export endpoints'
      },
      generated_at: new Date().toISOString()
    }
  });
});

export default router;
