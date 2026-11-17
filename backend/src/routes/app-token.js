import { Hono } from 'hono';
import { createAppToken } from '../utils/appToken.js';
import { rateLimitMiddleware } from '../middleware/rateLimit.js';

const app = new Hono();

/**
 * POST /api/app-token — start an anonymous app session.
 * Returns a short-lived signed token to send as X-App-Token. Rate limited per IP.
 */
app.post('/', rateLimitMiddleware(30, 60), async (c) => {
  if (!c.env.APP_TOKEN_SECRET) {
    console.error('[app-token] APP_TOKEN_SECRET is not set');
    return c.json({ error: 'Server auth is not configured', code: 'AUTH_NOT_CONFIGURED' }, 503);
  }
  const { token, expiresAt } = createAppToken(c.env.APP_TOKEN_SECRET);
  return c.json({ token, expiresAt });
});

export default app;
