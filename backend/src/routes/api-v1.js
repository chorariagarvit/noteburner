import { Hono } from 'hono';
import { nanoid } from 'nanoid';
import { sha256hex } from '../utils/password.js';
import { readCountry } from '../utils/geo.js';
import { validateSlug, sanitizeSlug, isSlugAvailable } from '../utils/slugValidation.js';
import { limitOrUnlimited, flag, validIvOrSalt, MAX_ENCRYPTED_CHARS } from '../utils/messageOptions.js';

const router = new Hono();

/**
 * Middleware: API Key Authentication
 */
async function requireApiKey(c, next) {
  const apiKey = c.req.header('X-API-Key');
  
  if (!apiKey) {
    return c.json({ error: 'API key required', code: 'API_KEY_MISSING' }, 401);
  }

  // Hash the incoming key before DB lookup — raw keys are never stored
  const hashedKey = await sha256hex(apiKey);

  // Verify API key and check if active
  const keyData = await c.env.DB.prepare(`
    SELECT id, user_id, rate_limit, active, requests_today, last_reset_at
    FROM api_keys
    WHERE key = ? AND active = 1
  `).bind(hashedKey).first();

  if (!keyData) {
    return c.json({ error: 'Invalid or inactive API key', code: 'API_KEY_INVALID' }, 401);
  }

  // Check rate limit
  const now = new Date();
  const lastReset = new Date(keyData.last_reset_at);
  const hoursSinceReset = (now - lastReset) / (1000 * 60 * 60);

  let requestsToday = keyData.requests_today;

  // Reset daily counter if it's a new day
  if (hoursSinceReset >= 24) {
    requestsToday = 0;
    await c.env.DB.prepare(`
      UPDATE api_keys 
      SET requests_today = 0, last_reset_at = datetime('now')
      WHERE id = ?
    `).bind(keyData.id).run();
  }

  // Check if rate limit exceeded
  if (requestsToday >= keyData.rate_limit) {
    return c.json({ 
      error: 'Rate limit exceeded', 
      code: 'RATE_LIMIT_EXCEEDED',
      limit: keyData.rate_limit,
      reset_at: new Date(lastReset.getTime() + 24 * 60 * 60 * 1000).toISOString()
    }, 429);
  }

  // Increment request counter
  await c.env.DB.prepare(`
    UPDATE api_keys 
    SET requests_today = requests_today + 1,
        requests_month = requests_month + 1,
        last_used_at = datetime('now')
    WHERE id = ?
  `).bind(keyData.id).run();

  // Store user info in context
  c.set('userId', keyData.user_id);
  c.set('apiKeyId', keyData.id);

  await next();
}

// Apply API key middleware to all routes
router.use('*', requireApiKey);

/**
 * GET /api/v1/messages
 * List messages for authenticated user/team
 */
router.get('/messages', async (c) => {
  const userId = c.get('userId');
  const limit = parseInt(c.req.query('limit') || '50');
  const offset = parseInt(c.req.query('offset') || '0');
  const teamId = c.req.query('team_id');

  let query = `
    SELECT token, created_at, expires_at, view_count, max_views, 
           custom_slug, team_id, user_id, creator_token
    FROM messages 
    WHERE user_id = ?
  `;
  const params = [userId];

  if (teamId) {
    query += ` AND team_id = ?`;
    params.push(teamId);
  }

  query += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
  params.push(limit, offset);

  const messages = await c.env.DB.prepare(query).bind(...params).all();

  // Get total count
  let countQuery = `SELECT COUNT(*) as total FROM messages WHERE user_id = ?`;
  const countParams = [userId];
  if (teamId) {
    countQuery += ` AND team_id = ?`;
    countParams.push(teamId);
  }
  const { total } = await c.env.DB.prepare(countQuery).bind(...countParams).first();

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
 * POST /api/v1/messages
 * Create a new message programmatically
 */
router.post('/messages', async (c) => {
  const userId = c.get('userId');
  const body = await c.req.json();

  const { encryptedData, iv, salt, customSlug, teamId, authTag } = body;

  if (typeof encryptedData !== 'string' || !encryptedData || !iv || !salt) {
    return c.json({ error: 'encryptedData, iv, and salt are required', code: 'ENCRYPTION_DATA_REQUIRED' }, 400);
  }
  if (!validIvOrSalt(iv) || !validIvOrSalt(salt)) {
    return c.json({ error: 'iv and salt must be 16 bytes (24 base64 characters)', code: 'INVALID_IV_OR_SALT' }, 400);
  }
  if (encryptedData.length > MAX_ENCRYPTED_CHARS) {
    return c.json({ error: 'Message too large', code: 'MESSAGE_TOO_LARGE' }, 413);
  }
  if (authTag !== undefined && (typeof authTag !== 'string' || authTag.length < 32 || authTag.length > 128)) {
    return c.json({ error: 'Invalid auth tag', code: 'INVALID_AUTH_TAG' }, 400);
  }

  // Same bounds as the public endpoint: 1 minute .. 30 days
  const expiresInMinutes = body.expiresInMinutes === undefined ? 1440 : Number(body.expiresInMinutes);
  if (!Number.isFinite(expiresInMinutes) || expiresInMinutes < 1 || expiresInMinutes > 30 * 24 * 60) {
    return c.json({ error: 'expiresInMinutes must be between 1 and 43200', code: 'INVALID_EXPIRY' }, 400);
  }
  const maxViews = limitOrUnlimited(body.maxViews, 1);
  const maxPasswordAttempts = limitOrUnlimited(body.maxPasswordAttempts, 3);
  const requireGeoMatch = flag(body.requireGeoMatch);
  const autoBurnOnSuspicious = flag(body.autoBurnOnSuspicious);

  // Custom slug: same sanitising/validation/availability rules as the public endpoint
  let finalSlug = null;
  if (customSlug) {
    const sanitized = sanitizeSlug(String(customSlug));
    const validation = validateSlug(sanitized);
    if (!validation.valid) {
      return c.json({ error: validation.error, code: 'INVALID_SLUG' }, 400);
    }
    if (!(await isSlugAvailable(c.env.DB, sanitized))) {
      return c.json({ error: 'Custom slug already taken', code: 'SLUG_TAKEN' }, 409);
    }
    finalSlug = sanitized;
  }

  // A key may only write into teams its owner actually belongs to (members and admins, not viewers)
  if (teamId) {
    const membership = await c.env.DB.prepare(
      `SELECT role FROM team_members WHERE team_id = ? AND user_id = ? AND role IN ('member', 'admin')`
    ).bind(String(teamId), userId).first();
    if (!membership) {
      return c.json({ error: 'You are not a member of this team', code: 'TEAM_ACCESS_DENIED' }, 403);
    }
  }

  const authHash = authTag ? await sha256hex(authTag) : null;

  const token = nanoid(32);
  const creatorToken = nanoid(32);
  const createdAt = Date.now();
  const expiresAt = createdAt + (expiresInMinutes * 60 * 1000);
  const { country: creatorCountry } = readCountry(c);
  if (requireGeoMatch && !creatorCountry) {
    return c.json({
      error: 'Your country could not be determined, so a country restriction cannot be applied.',
      code: 'GEO_UNAVAILABLE'
    }, 400);
  }

  try {
    await c.env.DB.prepare(`
      INSERT INTO messages (
        token, encrypted_data, iv, salt, expires_at, created_at, 
        custom_slug, user_id, team_id, created_via, creator_token,
        max_views, view_count, max_password_attempts, 
        require_geo_match, creator_country, auto_burn_suspicious, accessed, auth_hash
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'api', ?, ?, 0, ?, ?, ?, ?, 0, ?)
    `).bind(
      token,
      encryptedData,
      iv,
      salt,
      expiresAt,
      createdAt,
      finalSlug,
      userId,
      teamId ? String(teamId) : null,
      creatorToken,
      maxViews,
      maxPasswordAttempts,
      requireGeoMatch,
      creatorCountry,
      autoBurnOnSuspicious,
      authHash
    ).run();
  } catch (err) {
    // A concurrent request claimed the same slug between our availability check and the insert
    if (/UNIQUE/i.test(String(err?.message))) {
      return c.json({ error: 'Custom slug already taken', code: 'SLUG_TAKEN' }, 409);
    }
    throw err;
  }

  // Log creation in audit log
  await c.env.DB.prepare(`
    INSERT INTO audit_logs (message_id, event_type, country, success, metadata)
    VALUES (?, 'created', ?, 1, ?)
  `).bind(token, creatorCountry, JSON.stringify({ via: 'api', user_id: userId })).run();

  const frontendUrl = c.env.FRONTEND_URL || 'https://noteburner.work';
  const messageUrl = finalSlug
    ? `${frontendUrl}/m/${finalSlug}`
    : `${frontendUrl}/m/${token}`;

  return c.json({
    success: true,
    token: token,
    creator_token: creatorToken,
    url: messageUrl,
    expires_at: new Date(expiresAt).toISOString()
  }, 201);
});

/**
 * GET /api/v1/messages/:id
 * Get message metadata (not content)
 */
router.get('/messages/:id', async (c) => {
  const userId = c.get('userId');
  const messageId = c.req.param('id');

  const message = await c.env.DB.prepare(`
    SELECT token, created_at, expires_at, view_count, max_views,
           custom_slug, team_id, creator_token, accessed
    FROM messages 
    WHERE token = ? AND user_id = ?
  `).bind(messageId, userId).first();

  if (!message) {
    return c.json({ error: 'Message not found', code: 'NOT_FOUND' }, 404);
  }

  return c.json({ message });
});

/**
 * DELETE /api/v1/messages/:id
 * Delete/burn a message
 */
router.delete('/messages/:id', async (c) => {
  const userId = c.get('userId');
  const messageId = c.req.param('id');

  const message = await c.env.DB.prepare(`
    SELECT token FROM messages WHERE token = ? AND user_id = ?
  `).bind(messageId, userId).first();

  if (!message) {
    return c.json({ error: 'Message not found', code: 'NOT_FOUND' }, 404);
  }

  await c.env.DB.prepare(`
    DELETE FROM messages WHERE token = ?
  `).bind(messageId).run();

  // Log the burn
  await c.env.DB.prepare(`
    INSERT INTO audit_logs (message_id, event_type, success, metadata)
    VALUES (?, 'burned', 1, ?)
  `).bind(messageId, JSON.stringify({ via: 'api', user_id: userId })).run();

  return c.json({ success: true, message: 'Message deleted' });
});

/**
 * GET /api/v1/stats
 * Get usage statistics
 */
router.get('/stats', async (c) => {
  const userId = c.get('userId');
  const teamId = c.req.query('team_id');

  let query = `
    SELECT 
      COUNT(*) as total_messages,
      COUNT(CASE WHEN accessed > 0 THEN 1 END) as viewed_messages,
      SUM(view_count) as total_views
    FROM messages 
    WHERE user_id = ?
  `;
  const params = [userId];

  if (teamId) {
    query += ` AND team_id = ?`;
    params.push(teamId);
  }

  const stats = await c.env.DB.prepare(query).bind(...params).first();

  return c.json({ stats });
});

/**
 * GET /api/v1/api-keys
 * List API keys for user
 */
router.get('/api-keys', async (c) => {
  const userId = c.get('userId');

  const keys = await c.env.DB.prepare(`
    SELECT id, name, created_at, last_used_at, rate_limit, active, requests_today, requests_month
    FROM api_keys 
    WHERE user_id = ?
    ORDER BY created_at DESC
  `).bind(userId).all();

  return c.json({ api_keys: keys.results || [] });
});

// Key creation is intentionally NOT available with an API key: use POST /api/api-keys (session auth)
// so a leaked key cannot mint more keys or raise its own rate limit.

/**
 * DELETE /api/v1/api-keys/:id
 * Revoke an API key
 */
router.delete('/api-keys/:id', async (c) => {
  const userId = c.get('userId');
  const keyId = c.req.param('id');

  const result = await c.env.DB.prepare(`
    UPDATE api_keys 
    SET active = 0 
    WHERE id = ? AND user_id = ?
  `).bind(keyId, userId).run();

  if (result.meta.changes === 0) {
    return c.json({ error: 'API key not found', code: 'NOT_FOUND' }, 404);
  }

  return c.json({ success: true, message: 'API key revoked' });
});

export default router;
