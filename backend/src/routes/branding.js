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
 * GET /api/branding/:teamId
 * Get branding configuration for a team
 */
router.get('/:teamId', async (c) => {
  const teamId = c.req.param('teamId');

  const branding = await c.env.DB.prepare(`
    SELECT * FROM branding_config WHERE team_id = ?
  `).bind(teamId).first();

  if (!branding) {
    // Return defaults if not configured
    return c.json({
      branding: {
        team_id: teamId,
        primary_color: '#f59e0b',
        secondary_color: '#1f2937',
        white_label: false,
        logo_url: null,
        custom_favicon: null,
        custom_footer: null
      }
    });
  }

  return c.json({ 
    branding: {
      ...branding,
      white_label: Boolean(branding.white_label)
    }
  });
});

const HEX_COLOR = /^#(?:[A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
const MAX_URL_LENGTH = 2048;
const MAX_FOOTER_LENGTH = 500;

/** Logos and favicons are loaded by every visitor's browser: only plain https URLs are accepted. */
function validHttpsUrl(value) {
  if (typeof value !== 'string' || value.length > MAX_URL_LENGTH) return false;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password && url.hostname.length > 0;
  } catch {
    return false;
  }
}

/**
 * Validate the editable fields. Returns { fields } (only what was sent; null/'' clears optional
 * fields) or { error, code }.
 */
function parseBranding(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { error: 'Request body must be a JSON object', code: 'INVALID_BODY' };
  }
  const fields = {};

  for (const key of ['primary_color', 'secondary_color']) {
    if (body[key] === undefined) continue;
    if (typeof body[key] !== 'string' || !HEX_COLOR.test(body[key])) {
      return { error: `Invalid ${key.replace('_', ' ')} format`, code: 'INVALID_COLOR' };
    }
    fields[key] = body[key];
  }

  for (const key of ['logo_url', 'custom_favicon']) {
    if (body[key] === undefined) continue;
    if (body[key] === null || body[key] === '') { fields[key] = null; continue; }
    if (!validHttpsUrl(body[key])) {
      return { error: `${key} must be an https URL (no credentials, at most ${MAX_URL_LENGTH} characters)`, code: 'INVALID_URL' };
    }
    fields[key] = body[key];
  }

  if (body.custom_footer !== undefined) {
    const footer = body.custom_footer;
    if (footer !== null && footer !== '' && (typeof footer !== 'string' || footer.length > MAX_FOOTER_LENGTH)) {
      return { error: `custom_footer must be text of at most ${MAX_FOOTER_LENGTH} characters`, code: 'INVALID_FOOTER' };
    }
    fields.custom_footer = footer || null;
  }

  if (body.white_label !== undefined) fields.white_label = Boolean(body.white_label);
  return { fields };
}

/**
 * PUT /api/branding/:teamId
 * Update branding configuration (admin only)
 */
router.put('/:teamId', requireAuth, async (c) => {
  const userId = getUserId(c);
  const teamId = c.req.param('teamId');

  // Check admin permission
  const isAdmin = await checkTeamAdmin(c.env.DB, teamId, userId);
  if (!isAdmin) {
    return c.json({ error: 'Admin access required', code: 'ACCESS_DENIED' }, 403);
  }

  const body = await c.req.json().catch(() => undefined);
  const parsed = parseBranding(body);
  if (parsed.error) return c.json({ error: parsed.error, code: parsed.code }, 400);
  const { fields } = parsed;

  // Validate team plan supports branding
  const team = await c.env.DB.prepare(`SELECT plan FROM teams WHERE id = ?`).bind(teamId).first();
  if (!team) {
    return c.json({ error: 'Team not found', code: 'NOT_FOUND' }, 404);
  }
  if (team.plan === 'free') {
    return c.json({ error: 'Custom branding requires Team or Enterprise plan', code: 'UPGRADE_REQUIRED' }, 403);
  }
  // White label is Enterprise-only, whether the config is being created or updated
  if (fields.white_label && team.plan !== 'enterprise') {
    return c.json({ error: 'White label requires Enterprise plan', code: 'UPGRADE_REQUIRED' }, 403);
  }
  if (Object.keys(fields).length === 0) {
    return c.json({ error: 'No updates provided', code: 'NO_UPDATES' }, 400);
  }

  // One upsert for both "first save" and "update"; only the fields that were sent change
  const columns = Object.keys(fields);
  const values = columns.map((key) => (key === 'white_label' ? (fields[key] ? 1 : 0) : fields[key]));
  await c.env.DB.prepare(`
    INSERT INTO branding_config (id, team_id, ${columns.join(', ')})
    VALUES (?, ?, ${columns.map(() => '?').join(', ')})
    ON CONFLICT(team_id) DO UPDATE SET
      ${columns.map((key) => `${key} = excluded.${key}`).join(', ')},
      updated_at = datetime('now')
  `).bind(nanoid(16), teamId, ...values).run();

  return c.json({ success: true, message: 'Branding updated' });
});

/**
 * POST /api/branding/:teamId/upload-logo
 * Upload logo (placeholder - would integrate with R2/S3)
 */
router.post('/:teamId/upload-logo', requireAuth, async (c) => {
  const userId = getUserId(c);
  const teamId = c.req.param('teamId');

  const isAdmin = await checkTeamAdmin(c.env.DB, teamId, userId);
  if (!isAdmin) {
    return c.json({ error: 'Admin access required', code: 'ACCESS_DENIED'}, 403);
  }

  // In production, this would:
  // 1. Receive multipart/form-data file
  // 2. Validate file type and size
  // 3. Upload to Cloudflare R2 or S3
  // 4. Return public URL
  // 5. Update branding_config with logo_url

  // Placeholder response
  return c.json({ 
    success: true,
    message: 'Logo upload endpoint - integrate with R2/S3',
    logo_url: 'https://placeholder.example/logo.png'
  }, 501); // Not Implemented
});

/**
 * DELETE /api/branding/:teamId/logo
 * Remove custom logo
 */
router.post('/:teamId/logo', requireAuth, async (c) => {
  const userId = getUserId(c);
  const teamId = c.req.param('teamId');

  const isAdmin = await checkTeamAdmin(c.env.DB, teamId, userId);
  if (!isAdmin) {
    return c.json({ error: 'Admin access required', code: 'ACCESS_DENIED' }, 403);
  }

  await c.env.DB.prepare(`
    UPDATE branding_config 
    SET logo_url = NULL, updated_at = datetime('now')
    WHERE team_id = ?
  `).bind(teamId).run();

  return c.json({ success: true, message: 'Logo removed' });
});

/**
 * GET /api/branding/preview/:teamId
 * Get branding CSS variables for preview
 */
router.get('/preview/:teamId', async (c) => {
  const teamId = c.req.param('teamId');

  const branding = await c.env.DB.prepare(`
    SELECT primary_color, secondary_color, logo_url, white_label
    FROM branding_config WHERE team_id = ?
  `).bind(teamId).first();

  if (!branding) {
    return c.json({
      css: {
        '--color-primary': '#f59e0b',
        '--color-secondary': '#1f2937'
      },
      white_label: false,
      logo_url: null
    });
  }

  return c.json({
    css: {
      '--color-primary': branding.primary_color,
      '--color-secondary': branding.secondary_color
    },
    white_label: Boolean(branding.white_label),
    logo_url: branding.logo_url
  });
});

export default router;
