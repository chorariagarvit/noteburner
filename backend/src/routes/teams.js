import { Hono } from 'hono';
import { nanoid } from 'nanoid';
import { requireAuth, getUserId } from '../middleware/requireAuth.js';

const router = new Hono();

/**
 * Helper: Check if user has permission for team action
 */
async function checkTeamPermission(db, teamId, userId, requiredRole = 'member') {
  const member = await db.prepare(`
    SELECT role FROM team_members WHERE team_id = ? AND user_id = ?
  `).bind(teamId, userId).first();

  if (!member) return false;

  const roleHierarchy = { viewer: 1, member: 2, admin: 3 };
  const requiredLevel = roleHierarchy[requiredRole];
  const userLevel = roleHierarchy[member.role];

  return userLevel >= requiredLevel;
}

/**
 * POST /api/teams
 * Create a new team
 */
router.post('/', requireAuth, async (c) => {
  const userId = getUserId(c);

  const body = await c.req.json();

  const { name, plan = 'free' } = body;

  if (!name || name.trim().length < 3) {
    return c.json({ error: 'Team name must be at least 3 characters', code: 'INVALID_NAME' }, 400);
  }

  const teamId = nanoid(16);
  const maxMembers = plan === 'enterprise' ? 100 : plan === 'team' ? 20 : 5;

  // Create team
  await c.env.DB.prepare(`
    INSERT INTO teams (id, name, owner_id, plan, max_members)
    VALUES (?, ?, ?, ?, ?)
  `).bind(teamId, name.trim(), userId, plan, maxMembers).run();

  // Add creator as admin
  await c.env.DB.prepare(`
    INSERT INTO team_members (id, team_id, user_id, email, role)
    VALUES (?, ?, ?, ?, 'admin')
  `).bind(nanoid(16), teamId, userId, 'owner@team.local').run();

  // Create default compliance settings
  await c.env.DB.prepare(`
    INSERT INTO compliance_settings (id, team_id)
    VALUES (?, ?)
  `).bind(nanoid(16), teamId).run();

  return c.json({
    success: true,
    team: {
      id: teamId,
      name: name.trim(),
      plan,
      max_members: maxMembers,
      created_at: new Date().toISOString()
    }
  }, 201);
});

/**
 * GET /api/teams
 * List user's teams
 */
router.get('/', requireAuth, async (c) => {
  const userId = getUserId(c);

  const teams = await c.env.DB.prepare(`
    SELECT t.id, t.name, t.plan, t.max_members, t.created_at,
           tm.role as my_role,
           COUNT(DISTINCT tm2.id) as member_count
    FROM teams t
    JOIN team_members tm ON t.id = tm.team_id AND tm.user_id = ?
    LEFT JOIN team_members tm2 ON t.id = tm2.team_id
    GROUP BY t.id
    ORDER BY t.created_at DESC
  `).bind(userId).all();

  return c.json({ teams: teams.results || [] });
});

/**
 * GET /api/teams/:id
 * Get team details
 */
router.get('/:id', requireAuth, async (c) => {
  const userId = getUserId(c);
  
  const teamId = c.req.param('id');

  // Check membership
  const hasAccess = await checkTeamPermission(c.env.DB, teamId, userId, 'viewer');
  if (!hasAccess) {
    return c.json({ error: 'Access denied', code: 'ACCESS_DENIED' }, 403);
  }

  const team = await c.env.DB.prepare(`
    SELECT t.*, COUNT(DISTINCT tm.id) as member_count
    FROM teams t
    LEFT JOIN team_members tm ON t.id = tm.team_id
    WHERE t.id = ?
    GROUP BY t.id
  `).bind(teamId).first();

  if (!team) {
    return c.json({ error: 'Team not found', code: 'NOT_FOUND' }, 404);
  }

  return c.json({ team });
});

/**
 * PUT /api/teams/:id
 * Update team settings
 */
router.put('/:id', requireAuth, async (c) => {
  const userId = getUserId(c);
  
  const teamId = c.req.param('id');
  const body = await c.req.json();

  // Check admin permission
  const isAdmin = await checkTeamPermission(c.env.DB, teamId, userId, 'admin');
  if (!isAdmin) {
    return c.json({ error: 'Admin access required', code: 'ACCESS_DENIED' }, 403);
  }

  const { name, custom_domain } = body;
  const updates = [];
  const params = [];

  if (name) {
    updates.push('name = ?');
    params.push(name.trim());
  }
  if (custom_domain !== undefined) {
    updates.push('custom_domain = ?');
    params.push(custom_domain || null);
  }

  if (updates.length === 0) {
    return c.json({ error: 'No updates provided', code: 'NO_UPDATES' }, 400);
  }

  updates.push('updated_at = datetime("now")');
  params.push(teamId);

  await c.env.DB.prepare(`
    UPDATE teams SET ${updates.join(', ')} WHERE id = ?
  `).bind(...params).run();

  return c.json({ success: true, message: 'Team updated' });
});

/**
 * DELETE /api/teams/:id
 * Delete team (admin only)
 */
router.delete('/:id', requireAuth, async (c) => {
  const userId = getUserId(c);
  
  const teamId = c.req.param('id');

  // Check if user is owner
  const team = await c.env.DB.prepare(`
    SELECT owner_id FROM teams WHERE id = ?
  `).bind(teamId).first();

  if (!team) {
    return c.json({ error: 'Team not found', code: 'NOT_FOUND' }, 404);
  }

  if (team.owner_id !== userId) {
    return c.json({ error: 'Only team owner can delete team', code: 'ACCESS_DENIED' }, 403);
  }

  // Delete team (cascade will handle members, messages, etc.)
  await c.env.DB.prepare(`DELETE FROM teams WHERE id = ?`).bind(teamId).run();

  return c.json({ success: true, message: 'Team deleted' });
});

/**
 * GET /api/teams/:id/members
 * List team members
 */
router.get('/:id/members', requireAuth, async (c) => {
  const userId = getUserId(c);
  
  const teamId = c.req.param('id');

  const hasAccess = await checkTeamPermission(c.env.DB, teamId, userId, 'member');
  if (!hasAccess) {
    return c.json({ error: 'Access denied', code: 'ACCESS_DENIED' }, 403);
  }

  const members = await c.env.DB.prepare(`
    SELECT id, user_id, email, role, joined_at
    FROM team_members
    WHERE team_id = ?
    ORDER BY joined_at ASC
  `).bind(teamId).all();

  return c.json({ members: members.results || [] });
});

/**
 * POST /api/teams/:id/members
 * Add team member (admin only)
 */
router.post('/:id/members', requireAuth, async (c) => {
  const userId = getUserId(c);
  
  const teamId = c.req.param('id');
  const body = await c.req.json();

  const isAdmin = await checkTeamPermission(c.env.DB, teamId, userId, 'admin');
  if (!isAdmin) {
    return c.json({ error: 'Admin access required', code: 'ACCESS_DENIED' }, 403);
  }

  const { email, role = 'member' } = body;

  if (!email || !email.includes('@')) {
    return c.json({ error: 'Valid email required', code: 'INVALID_EMAIL' }, 400);
  }

  // Check team capacity
  const team = await c.env.DB.prepare(`
    SELECT max_members FROM teams WHERE id = ?
  `).bind(teamId).first();

  const memberCount = await c.env.DB.prepare(`
    SELECT COUNT(*) as count FROM team_members WHERE team_id = ?
  `).bind(teamId).first();

  if (memberCount.count >= team.max_members) {
    return c.json({ 
      error: 'Team member limit reached', 
      code: 'MEMBER_LIMIT_REACHED',
      max: team.max_members 
    }, 400);
  }

  // For now, use email as user_id (in production, would invite user properly)
  const newUserId = nanoid(16);
  const memberId = nanoid(16);

  try {
    await c.env.DB.prepare(`
      INSERT INTO team_members (id, team_id, user_id, email, role)
      VALUES (?, ?, ?, ?, ?)
    `).bind(memberId, teamId, newUserId, email, role).run();

    return c.json({
      success: true,
      member: {
        id: memberId,
        email,
        role,
        joined_at: new Date().toISOString()
      }
    }, 201);
  } catch (err) {
    if (err.message.includes('UNIQUE')) {
      return c.json({ error: 'User already in team', code: 'ALREADY_MEMBER' }, 409);
    }
    throw err;
  }
});

/**
 * PUT /api/teams/:teamId/members/:memberId
 * Update member role (admin only)
 */
router.put('/:teamId/members/:memberId', requireAuth, async (c) => {
  const userId = getUserId(c);
  
  const teamId = c.req.param('teamId');
  const memberId = c.req.param('memberId');
  const body = await c.req.json();

  const isAdmin = await checkTeamPermission(c.env.DB, teamId, userId, 'admin');
  if (!isAdmin) {
    return c.json({ error: 'Admin access required', code: 'ACCESS_DENIED' }, 403);
  }

  const { role } = body;
  const validRoles = ['viewer', 'member', 'admin'];

  if (!validRoles.includes(role)) {
    return c.json({ error: 'Invalid role', code: 'INVALID_ROLE' }, 400);
  }

  await c.env.DB.prepare(`
    UPDATE team_members SET role = ? WHERE id = ? AND team_id = ?
  `).bind(role, memberId, teamId).run();

  return c.json({ success: true, message: 'Member role updated' });
});

/**
 * DELETE /api/teams/:teamId/members/:memberId
 * Remove team member (admin only)
 */
router.delete('/:teamId/members/:memberId', requireAuth, async (c) => {
  const userId = getUserId(c);
  
  const teamId = c.req.param('teamId');
  const memberId = c.req.param('memberId');

  const isAdmin = await checkTeamPermission(c.env.DB, teamId, userId, 'admin');
  if (!isAdmin) {
    return c.json({ error: 'Admin access required', code: 'ACCESS_DENIED' }, 403);
  }

  // Don't allow removing the owner
  const member = await c.env.DB.prepare(`
    SELECT tm.user_id, t.owner_id
    FROM team_members tm
    JOIN teams t ON tm.team_id = t.id
    WHERE tm.id = ? AND tm.team_id = ?
  `).bind(memberId, teamId).first();

  if (member && member.user_id === member.owner_id) {
    return c.json({ error: 'Cannot remove team owner', code: 'CANNOT_REMOVE_OWNER' }, 400);
  }

  await c.env.DB.prepare(`
    DELETE FROM team_members WHERE id = ? AND team_id = ?
  `).bind(memberId, teamId).run();

  return c.json({ success: true, message: 'Member removed' });
});

/**
 * GET /api/teams/:id/messages
 * List team messages
 */
router.get('/:id/messages', requireAuth, async (c) => {
  const userId = getUserId(c);
  
  const teamId = c.req.param('id');
  const limit = parseInt(c.req.query('limit') || '50');
  const offset = parseInt(c.req.query('offset') || '0');

  const hasAccess = await checkTeamPermission(c.env.DB, teamId, userId, 'viewer');
  if (!hasAccess) {
    return c.json({ error: 'Access denied', code: 'ACCESS_DENIED' }, 403);
  }

  const messages = await c.env.DB.prepare(`
    SELECT m.id, m.created_at, m.expires_at, m.view_count, m.max_views,
           m.custom_slug, tm.created_by
    FROM messages m
    JOIN team_messages tm ON m.id = tm.message_id
    WHERE tm.team_id = ?
    ORDER BY m.created_at DESC
    LIMIT ? OFFSET ?
  `).bind(teamId, limit, offset).all();

  const { total } = await c.env.DB.prepare(`
    SELECT COUNT(*) as total FROM team_messages WHERE team_id = ?
  `).bind(teamId).first();

  return c.json({
    messages: messages.results || [],
    pagination: {
      total,
      limit,
      offset,
      has_more: offset + limit < total
    }
  });
});

/**
 * GET /api/teams/:id/stats
 * Get team usage statistics
 */
router.get('/:id/stats', requireAuth, async (c) => {
  const userId = getUserId(c);
  
  const teamId = c.req.param('id');

  const isAdmin = await checkTeamPermission(c.env.DB, teamId, userId, 'admin');
  if (!isAdmin) {
    return c.json({ error: 'Admin access required', code: 'ACCESS_DENIED' }, 403);
  }

  // Get overall stats
  const stats = await c.env.DB.prepare(`
    SELECT 
      COUNT(DISTINCT tm.message_id) as total_messages,
      COUNT(DISTINCT CASE WHEN m.accessed_at IS NOT NULL THEN m.id END) as burned_messages,
      COUNT(DISTINCT CASE WHEN m.view_count > 0 THEN m.id END) as viewed_messages,
      SUM(m.view_count) as total_views
    FROM team_messages tm
    LEFT JOIN messages m ON tm.message_id = m.id
    WHERE tm.team_id = ?
  `).bind(teamId).first();

  // Get member count
  const { member_count } = await c.env.DB.prepare(`
    SELECT COUNT(*) as member_count FROM team_members WHERE team_id = ?
  `).bind(teamId).first();

  // Get recent activity (last 30 days)
  const recentStats = await c.env.DB.prepare(`
    SELECT date, messages_created, messages_viewed, messages_burned
    FROM team_stats
    WHERE team_id = ? AND date >= date('now', '-30 days')
    ORDER BY date DESC
  `).bind(teamId).all();

  return c.json({
    stats: {
      ...stats,
      member_count,
      recent_activity: recentStats.results || []
    }
  });
});

export default router;
