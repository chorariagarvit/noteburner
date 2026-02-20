import { Hono } from 'hono';
import { nanoid } from 'nanoid';

const router = new Hono();

/**
 * Middleware: API Key Authentication
 */
async function requireApiKey(c, next) {
  const apiKey = c.req.header('X-API-Key');
  
  if (!apiKey) {
    return c.json({ error: 'API key required', code: 'API_KEY_MISSING' }, 401);
  }

  // Verify API key and check if active
  const keyData = await c.env.DB.prepare(`
    SELECT id, user_id, rate_limit, active, requests_today, last_reset_at
    FROM api_keys 
    WHERE key = ? AND active = 1
  `).bind(apiKey).first();

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

  const {
    encryptedData,
    iv,
    salt,
    expiresInMinutes = 1440,
    maxViews = 1,
    customSlug,
    teamId,
    maxPasswordAttempts = 3,
    requireGeoMatch = false,
    autoBurnOnSuspicious = false
  } = body;

  if (!encryptedData || !iv || !salt) {
    return c.json({ error: 'encryptedData, iv, and salt are required', code: 'ENCRYPTION_DATA_REQUIRED' }, 400);
  }

  // Validate custom slug if provided
  if (customSlug) {
    const existing = await c.env.DB.prepare(
      'SELECT id FROM messages WHERE custom_slug = ?'
    ).bind(customSlug).first();
    
    if (existing) {
      return c.json({ error: 'Custom slug already taken', code: 'SLUG_TAKEN' }, 409);
    }
  }

  const token = nanoid(32);
  const creatorToken = nanoid(32);
  const createdAt = Date.now();
  const expiresAt = createdAt + (expiresInMinutes * 60 * 1000);
  const creatorCountry = c.req.header('cf-ipcountry') || null;

  await c.env.DB.prepare(`
    INSERT INTO messages (
      token, encrypted_data, iv, salt, expires_at, created_at, 
      custom_slug, user_id, team_id, created_via, creator_token,
      max_views, view_count, max_password_attempts, 
      require_geo_match, creator_country, auto_burn_suspicious, accessed
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'api', ?, ?, 0, ?, ?, ?, ?, 0)
  `).bind(
    token,
    encryptedData,
    iv,
    salt,
    expiresAt,
    createdAt,
    customSlug || null,
    userId,
    teamId || null,
    creatorToken,
    maxViews,
    maxPasswordAttempts,
    requireGeoMatch ? 1 : 0,
    creatorCountry,
    autoBurnOnSuspicious ? 1 : 0
  ).run();

  // Log creation in audit log
  await c.env.DB.prepare(`
    INSERT INTO audit_logs (message_id, event_type, country, success, metadata)
    VALUES (?, 'created', ?, 1, ?)
  `).bind(token, creatorCountry, JSON.stringify({ via: 'api', user_id: userId })).run();

  const frontendUrl = c.env.FRONTEND_URL || 'https://noteburner.app';
  const messageUrl = customSlug 
    ? `${frontendUrl}/m/${customSlug}`
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

/**
 * POST /api/v1/api-keys
 * Create a new API key
 */
router.post('/api-keys', async (c) => {
  const userId = c.get('userId');
  const body = await c.req.json();

  const { name, rate_limit = 1000 } = body;

  if (!name) {
    return c.json({ error: 'Name is required', code: 'NAME_REQUIRED' }, 400);
  }

  const id = nanoid(16);
  const key = `nb_${nanoid(32)}`;

  await c.env.DB.prepare(`
    INSERT INTO api_keys (id, user_id, key, name, rate_limit, active)
    VALUES (?, ?, ?, ?, ?, 1)
  `).bind(id, userId, key, name, rate_limit).run();

  return c.json({
    success: true,
    api_key: {
      id,
      key, // Only shown once
      name,
      rate_limit,
      created_at: new Date().toISOString()
    }
  }, 201);
});

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
