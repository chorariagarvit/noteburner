import { Hono } from 'hono';
import { createAppToken } from '../utils/appToken.js';
import { rateLimitMiddleware } from '../middleware/rateLimit.js';
import { challengeEnabled, verifyTurnstile } from '../utils/turnstile.js';

const app = new Hono();

/**
 * POST /api/app-token — start an anonymous app session.
 * Returns a short-lived signed token to send as X-App-Token. Rate limited per IP.
 *
 * When TURNSTILE_SECRET_KEY is set, the caller must also present a solved Turnstile challenge
 * (`{ "turnstileToken": "..." }`). Without one it gets 403 CHALLENGE_REQUIRED plus the public site key,
 * so the web app can show the widget and retry. This keeps scripts from minting unlimited tokens.
 */
app.post('/', rateLimitMiddleware(30, 60), async (c) => {
  if (!c.env.APP_TOKEN_SECRET) {
    console.error('[app-token] APP_TOKEN_SECRET is not set');
    return c.json({ error: 'Server auth is not configured', code: 'AUTH_NOT_CONFIGURED' }, 503);
  }

  if (challengeEnabled(c.env)) {
    const body = await c.req.json().catch(() => ({}));
    let verdict;
    try {
      verdict = await verifyTurnstile(c.env, body?.turnstileToken, c.req.header('CF-Connecting-IP'));
    } catch (err) {
      console.error('[app-token] Turnstile verification unavailable:', err.message);
      return c.json({ error: 'Verification is temporarily unavailable. Please try again.', code: 'CHALLENGE_UNAVAILABLE' }, 503);
    }
    if (!verdict.ok) {
      return c.json({
        error: 'A quick verification is required.',
        code: 'CHALLENGE_REQUIRED',
        siteKey: c.env.TURNSTILE_SITE_KEY || null,
      }, 403);
    }
  }

  const { token, expiresAt } = createAppToken(c.env.APP_TOKEN_SECRET);
  return c.json({ token, expiresAt });
});

export default app;
