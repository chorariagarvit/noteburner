import { Hono } from 'hono';
import { requireAuth, getUserId } from '../middleware/requireAuth.js';

const router = new Hono();

// Audit logs are kept 30 days by the hourly cleanup job, so a team cannot be promised longer
const MAX_AUDIT_RETENTION_DAYS = 30;

/** One CSV field (RFC 4180): quoted when needed, and neutralised if a spreadsheet would read it as a formula. */
function csvCell(value) {
  if (value === null || value === undefined) return '';
  let text = String(value);
  if (typeof value === 'string' && /^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}
const csvLine = (values) => values.map(csvCell).join(',');

const isInteger = (v) => typeof v === 'number' && Number.isInteger(v);

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
        audit_log_retention: MAX_AUDIT_RETENTION_DAYS,
        require_password: false,
        min_password_strength: 2
      }
    });
  }

  return c.json({ 
    settings: {
      ...settings,
      audit_log_retention: Math.min(settings.audit_log_retention, MAX_AUDIT_RETENTION_DAYS),
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

  const isAdmin = await checkTeamAdmin(c.env.DB, teamId, userId);
  if (!isAdmin) {
    return c.json({ error: 'Admin access required', code: 'ACCESS_DENIED' }, 403);
  }

  const body = await c.req.json().catch(() => undefined);
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return c.json({ error: 'Request body must be a JSON object', code: 'INVALID_BODY' }, 400);
  }

  const {
    data_retention_days,
    gdpr_enabled,
    auto_delete_enabled,
    audit_log_retention,
    require_password,
    min_password_strength
  } = body;

  // Validate values: whole numbers in range, real booleans
  const invalid = (message) => c.json({ error: message, code: 'INVALID_VALUE' }, 400);
  if (data_retention_days !== undefined && (!isInteger(data_retention_days) || data_retention_days < 1 || data_retention_days > 3650)) {
    return invalid('Retention days must be a whole number between 1 and 3650');
  }
  if (audit_log_retention !== undefined && (!isInteger(audit_log_retention) || audit_log_retention < 1 || audit_log_retention > MAX_AUDIT_RETENTION_DAYS)) {
    return invalid(`Audit log retention must be a whole number between 1 and ${MAX_AUDIT_RETENTION_DAYS} days`);
  }
  if (min_password_strength !== undefined && (!isInteger(min_password_strength) || min_password_strength < 0 || min_password_strength > 4)) {
    return invalid('Password strength must be a whole number between 0 and 4');
  }
  for (const [name, value] of Object.entries({ gdpr_enabled, auto_delete_enabled, require_password })) {
    if (value !== undefined && typeof value !== 'boolean') return invalid(`${name} must be true or false`);
  }

  const updates = [];
  const params = [];
  const fields = [
    ['data_retention_days', data_retention_days, (v) => v],
    ['gdpr_enabled', gdpr_enabled, (v) => (v ? 1 : 0)],
    ['auto_delete_enabled', auto_delete_enabled, (v) => (v ? 1 : 0)],
    ['audit_log_retention', audit_log_retention, (v) => v],
    ['require_password', require_password, (v) => (v ? 1 : 0)],
    ['min_password_strength', min_password_strength, (v) => v]
  ];
  for (const [column, value, toParam] of fields) {
    if (value !== undefined) {
      updates.push(`${column} = ?`);
      params.push(toParam(value));
    }
  }

  if (updates.length === 0) {
    return c.json({ error: 'No updates provided', code: 'NO_UPDATES' }, 400);
  }

  updates.push("updated_at = datetime('now')");
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
      csvLines.push(csvLine([log.id, log.message_id, log.event_type, log.country, log.timestamp, log.success, log.metadata]));
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
      csvLines.push(csvLine([
        msg.id,
        msg.created_at,
        msg.expires_at,
        msg.accessed_at || '',
        msg.view_count || 0,
        msg.max_views || 1,
        msg.custom_slug || '',
        msg.created_via || 'web',
        msg.content_length || 0
      ]));
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
  const body = (await c.req.json().catch(() => null)) || {};

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
