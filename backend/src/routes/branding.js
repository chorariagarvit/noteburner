import { Hono } from 'hono';
import { nanoid } from 'nanoid';

const router = new Hono();

// Helper to extract userId from session token
function getUserId(c) {
  const authHeader = c.req.header('Authorization');
  const sessionToken = authHeader?.replace('Bearer ', '') || c.req.header('X-Session-Token');
  
  if (!sessionToken || !sessionToken.startsWith('session_')) {
    return null;
  }
  
  return sessionToken.replace('session_', '');
}

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

/**
 * PUT /api/branding/:teamId
 * Update branding configuration (admin only)
 */
router.put('/:teamId', async (c) => {
  const userId = getUserId(c); if (!userId) return c.json({ error: "Authentication required", code: "AUTH_REQUIRED" }, 401);
  const teamId = c.req.param('teamId');
  const body = await c.req.json();

  // Check admin permission
  const isAdmin = await checkTeamAdmin(c.env.DB, teamId, userId);
  if (!isAdmin) {
    return c.json({ error: 'Admin access required', code: 'ACCESS_DENIED' }, 403);
  }

  // Validate team plan supports branding
  const team = await c.env.DB.prepare(`
    SELECT plan FROM teams WHERE id = ?
  `).bind(teamId).first();

  if (!team) {
    return c.json({ error: 'Team not found', code: 'NOT_FOUND' }, 404);
  }

  if (team.plan === 'free') {
    return c.json({ 
      error: 'Custom branding requires Team or Enterprise plan', 
      code: 'UPGRADE_REQUIRED' 
    }, 403);
  }

  const {
    logo_url,
    primary_color,
    secondary_color,
    custom_favicon,
    white_label,
    custom_footer
  } = body;

  // Validate colors (simple hex validation)
  const hexColorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
  if (primary_color && !hexColorRegex.test(primary_color)) {
    return c.json({ error: 'Invalid primary color format', code: 'INVALID_COLOR' }, 400);
  }
  if (secondary_color && !hexColorRegex.test(secondary_color)) {
    return c.json({ error: 'Invalid secondary color format', code: 'INVALID_COLOR' }, 400);
  }

  // Check if branding config exists
  const existing = await c.env.DB.prepare(`
    SELECT id FROM branding_config WHERE team_id = ?
  `).bind(teamId).first();

  if (existing) {
    // Update existing
    const updates = [];
    const params = [];

    if (logo_url !== undefined) {
      updates.push('logo_url = ?');
      params.push(logo_url || null);
    }
    if (primary_color) {
      updates.push('primary_color = ?');
      params.push(primary_color);
    }
    if (secondary_color) {
      updates.push('secondary_color = ?');
      params.push(secondary_color);
    }
    if (custom_favicon !== undefined) {
      updates.push('custom_favicon = ?');
      params.push(custom_favicon || null);
    }
    if (white_label !== undefined) {
      // White label only available for Enterprise
      if (white_label && team.plan !== 'enterprise') {
        return c.json({ 
          error: 'White label requires Enterprise plan', 
          code: 'UPGRADE_REQUIRED' 
        }, 403);
      }
      updates.push('white_label = ?');
      params.push(white_label ? 1 : 0);
    }
    if (custom_footer !== undefined) {
      updates.push('custom_footer = ?');
      params.push(custom_footer || null);
    }

    if (updates.length === 0) {
      return c.json({ error: 'No updates provided', code: 'NO_UPDATES' }, 400);
    }

    updates.push('updated_at = datetime("now")');
    params.push(teamId);

    await c.env.DB.prepare(`
      UPDATE branding_config SET ${updates.join(', ')} WHERE team_id = ?
    `).bind(...params).run();
  } else {
    // Create new
    const id = nanoid(16);
    await c.env.DB.prepare(`
      INSERT INTO branding_config (
        id, team_id, logo_url, primary_color, secondary_color, 
        custom_favicon, white_label, custom_footer
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id,
      teamId,
      logo_url || null,
      primary_color || '#f59e0b',
      secondary_color || '#1f2937',
      custom_favicon || null,
      white_label ? 1 : 0,
      custom_footer || null
    ).run();
  }

  return c.json({ success: true, message: 'Branding updated' });
});

/**
 * POST /api/branding/:teamId/upload-logo
 * Upload logo (placeholder - would integrate with R2/S3)
 */
router.post('/:teamId/upload-logo', async (c) => {
  const userId = getUserId(c); if (!userId) return c.json({ error: "Authentication required", code: "AUTH_REQUIRED" }, 401);
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
router.delete('/:teamId/logo', async (c) => {
  const userId = getUserId(c); if (!userId) return c.json({ error: "Authentication required", code: "AUTH_REQUIRED" }, 401);
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
