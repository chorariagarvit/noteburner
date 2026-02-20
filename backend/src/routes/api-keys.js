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
 * GET /api/api-keys
 * List all API keys for the authenticated user
 */
router.get('/', async (c) => {
  const userId = getUserId(c);
  
  if (!userId) {
    return c.json({ error: 'Authentication required', code: 'AUTH_REQUIRED' }, 401);
  }

  const keys = await c.env.DB.prepare(`
    SELECT id, name, rate_limit, active, created_at, last_used_at,
           requests_today, requests_month
    FROM api_keys 
    WHERE user_id = ?
    ORDER BY created_at DESC
  `).bind(userId).all();

  return c.json({ keys: keys.results || [] });
});

/**
 * POST /api/api-keys
 * Create a new API key
 */
router.post('/', async (c) => {
  const userId = getUserId(c);
  
  if (!userId) {
    return c.json({ error: 'Authentication required', code: 'AUTH_REQUIRED' }, 401);
  }
  const body = await c.req.json();

  const { name, rate_limit = 1000 } = body;

  if (!name) {
    return c.json({ error: 'Name is required', code: 'NAME_REQUIRED' }, 400);
  }

  // Validate rate limit
  const validLimits = [100, 1000, 10000, 100000];
  if (!validLimits.includes(rate_limit)) {
    return c.json({ 
      error: 'Invalid rate limit. Must be one of: 100, 1000, 10000, 100000', 
      code: 'INVALID_RATE_LIMIT' 
    }, 400);
  }

  const id = nanoid(16);
  const key = `nb_${nanoid(32)}`;

  await c.env.DB.prepare(`
    INSERT INTO api_keys (id, user_id, key, name, rate_limit, active, requests_today, requests_month)
    VALUES (?, ?, ?, ?, ?, 1, 0, 0)
  `).bind(id, userId, key, name, rate_limit).run();

  return c.json({
    success: true,
    key, // Only shown once at creation
    api_key: {
      id,
      name,
      rate_limit,
      active: true,
      created_at: new Date().toISOString()
    }
  }, 201);
});

/**
 * DELETE /api/api-keys/:id
 * Revoke an API key
 */
router.delete('/:id', async (c) => {
  const userId = getUserId(c);
  
  if (!userId) {
    return c.json({ error: 'Authentication required', code: 'AUTH_REQUIRED' }, 401);
  }
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
