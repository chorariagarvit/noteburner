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

  const { name } = body;
  // Plan is NEVER client-chosen: paid plans are granted only through verified billing
  const plan = 'free';

  if (!name || name.trim().length < 3) {
    return c.json({ error: 'Team name must be at least 3 characters', code: 'INVALID_NAME' }, 400);
  }

  const teamId = nanoid(16);
  const maxMembers = 5;

  // Get user's email from users table
  const user = await c.env.DB.prepare(`
    SELECT email FROM users WHERE id = ?
  `).bind(userId).first();

  if (!user) {
    return c.json({ error: 'User not found', code: 'USER_NOT_FOUND' }, 404);
  }

  // Create team
  await c.env.DB.prepare(`
    INSERT INTO teams (id, name, owner_id, plan, max_members)
    VALUES (?, ?, ?, ?, ?)
  `).bind(teamId, name.trim(), userId, plan, maxMembers).run();

  // Add creator as admin with their actual email
  await c.env.DB.prepare(`
    INSERT INTO team_members (id, team_id, user_id, email, role)
    VALUES (?, ?, ?, ?, 'admin')
  `).bind(nanoid(16), teamId, userId, user.email).run();

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

  // Optimized: Single query with permission check
  const team = await c.env.DB.prepare(`
    SELECT t.*, COUNT(DISTINCT tm.id) as member_count,
           tm2.role as my_role
    FROM teams t
    LEFT JOIN team_members tm ON t.id = tm.team_id
    JOIN team_members tm2 ON t.id = tm2.team_id AND tm2.user_id = ?
    WHERE t.id = ?
    GROUP BY t.id
  `).bind(userId, teamId).first();

  if (!team) {
    return c.json({ error: 'Team not found or access denied', code: 'NOT_FOUND' }, 404);
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

  updates.push("updated_at = datetime('now')");
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

  // Optimized: Combine permission check with members query
  const members = await c.env.DB.prepare(`
    SELECT tm.id, tm.user_id, tm.email, tm.role, tm.joined_at
    FROM team_members tm
    WHERE tm.team_id = ?
      AND EXISTS (
        SELECT 1 FROM team_members tm2
        WHERE tm2.team_id = tm.team_id AND tm2.user_id = ?
      )
    ORDER BY tm.joined_at ASC
  `).bind(teamId, userId).all();

  if (!members.results || members.results.length === 0) {
    return c.json({ error: 'Access denied', code: 'ACCESS_DENIED' }, 403);
  }

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

  if (!['viewer', 'member', 'admin'].includes(role)) {
    return c.json({ error: 'Invalid role', code: 'INVALID_ROLE' }, 400);
  }

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

  // Look up existing registered user by email — don't create phantom rows
  const existingUser = await c.env.DB.prepare(`
    SELECT id FROM users WHERE email = ?
  `).bind(email.toLowerCase()).first();

  if (!existingUser) {
    // Same shape as success so team admins can't probe which emails have accounts
    return c.json({
      success: true,
      message: 'If an account exists for that email, it has been added to the team.'
    }, 201);
  }

  const memberId = nanoid(16);

  try {
    await c.env.DB.prepare(`
      INSERT INTO team_members (id, team_id, user_id, email, role)
      VALUES (?, ?, ?, ?, ?)
    `).bind(memberId, teamId, existingUser.id, email.toLowerCase(), role).run();

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

  // The owner's membership can't be changed, and only the owner can change another admin's role
  const target = await c.env.DB.prepare(`
    SELECT tm.user_id, tm.role, t.owner_id
    FROM team_members tm JOIN teams t ON tm.team_id = t.id
    WHERE tm.id = ? AND tm.team_id = ?
  `).bind(memberId, teamId).first();
  if (!target) {
    return c.json({ error: 'Member not found', code: 'NOT_FOUND' }, 404);
  }
  if (target.user_id === target.owner_id) {
    return c.json({ error: 'The team owner\'s role cannot be changed', code: 'CANNOT_MODIFY_OWNER' }, 403);
  }
  if ((target.role === 'admin' || role === 'admin') && userId !== target.owner_id) {
    return c.json({ error: 'Only the team owner can grant or revoke admin', code: 'OWNER_REQUIRED' }, 403);
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

  if (member) {
    const targetRole = await c.env.DB.prepare('SELECT role FROM team_members WHERE id = ? AND team_id = ?')
      .bind(memberId, teamId).first();
    if (targetRole?.role === 'admin' && userId !== member.owner_id) {
      return c.json({ error: 'Only the team owner can remove an admin', code: 'OWNER_REQUIRED' }, 403);
    }
  }

  await c.env.DB.prepare(`
    DELETE FROM team_members WHERE id = ? AND team_id = ?
  `).bind(memberId, teamId).run();

  return c.json({ success: true, message: 'Member removed' });
});

/**
 * GET /api/teams/:id/messages
 * List team messages (metadata only, never content). Burned messages are gone; see /stats.
 */
router.get('/:id/messages', requireAuth, async (c) => {
  const userId = getUserId(c);
  const teamId = c.req.param('id');
  const limit = Math.min(Math.max(parseInt(c.req.query('limit') || '50') || 50, 1), 200);
  const offset = Math.max(parseInt(c.req.query('offset') || '0') || 0, 0);

  if (!(await checkTeamPermission(c.env.DB, teamId, userId, 'viewer'))) {
    return c.json({ error: 'Access denied', code: 'ACCESS_DENIED' }, 403);
  }

  const [list, count] = await Promise.all([
    c.env.DB.prepare(`
      SELECT id, created_at, expires_at, view_count, max_views, custom_slug, user_id AS created_by
      FROM messages
      WHERE team_id = ? AND accessed = 0
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `).bind(teamId, limit, offset).all(),
    c.env.DB.prepare(
      `SELECT COUNT(*) AS total FROM messages WHERE team_id = ? AND accessed = 0`
    ).bind(teamId).first()
  ]);

  const total = count?.total || 0;
  return c.json({
    messages: list.results || [],
    pagination: { total, limit, offset, has_more: offset + limit < total }
  });
});

/**
 * GET /api/teams/:id/stats
 * Team usage statistics (admins). Totals come from the daily counters, because burned
 * messages are deleted; "active" figures describe what still exists.
 */
router.get('/:id/stats', requireAuth, async (c) => {
  const userId = getUserId(c);
  const teamId = c.req.param('id');

  if (!(await checkTeamPermission(c.env.DB, teamId, userId, 'admin'))) {
    return c.json({ error: 'Admin access required', code: 'ACCESS_DENIED' }, 403);
  }

  const [totals, active, members, recent] = await Promise.all([
    c.env.DB.prepare(`
      SELECT COALESCE(SUM(messages_created), 0) AS created,
             COALESCE(SUM(messages_viewed), 0) AS viewed,
             COALESCE(SUM(messages_burned), 0) AS burned
      FROM team_stats WHERE team_id = ?
    `).bind(teamId).first(),
    c.env.DB.prepare(
      `SELECT COUNT(*) AS n FROM messages WHERE team_id = ? AND accessed = 0`
    ).bind(teamId).first(),
    c.env.DB.prepare(`SELECT COUNT(*) AS n FROM team_members WHERE team_id = ?`).bind(teamId).first(),
    c.env.DB.prepare(`
      SELECT date, messages_created, messages_viewed, messages_burned
      FROM team_stats
      WHERE team_id = ? AND date >= date('now', '-30 days')
      ORDER BY date DESC
    `).bind(teamId).all()
  ]);

  return c.json({
    stats: {
      total_messages: totals.created,
      viewed_messages: totals.viewed,
      total_views: totals.viewed,
      burned_messages: totals.burned,
      active_messages: active.n,
      member_count: members.n,
      recent_activity: recent.results || []
    }
  });
});

export default router;
