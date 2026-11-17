/**
 * Global API gate: EVERY /api/* request must present one of
 *   - a valid user session  (Authorization: Bearer / X-Session-Token)
 *   - a valid API key       (X-API-Key)
 *   - a valid signed app token (X-App-Token) obtained from POST /api/app-token
 * Only the explicit allowlist below is reachable without credentials. Fails closed:
 * if APP_TOKEN_SECRET is missing, anonymous access is refused rather than opened.
 */
import { verifyAppToken } from '../utils/appToken.js';
import { validateSession } from '../utils/session.js';
import { sha256hex } from '../utils/password.js';

// Reachable with no credentials (needed to obtain credentials, or uptime probes)
const PUBLIC = [
  ['POST', '/api/app-token'],
  ['GET', '/api/health'],
  ['GET', '/api/health/ping'],
  ['POST', '/api/auth/signup'],
  ['POST', '/api/auth/login'],
  ['POST', '/api/auth/refresh'],
  ['POST', '/api/auth/verify-email'],
  ['POST', '/api/auth/forgot-password'],
  ['POST', '/api/auth/reset-password'],
];

// Server-to-server webhooks that authenticate themselves (provider signature checked in the route)
const SELF_AUTHENTICATED_PREFIXES = ['/api/integrations/slack/', '/api/premium/webhook'];

export async function apiGate(c, next) {
  const path = c.req.path.replace(/\/+$/, '') || '/';
  const method = c.req.method;

  if (method === 'OPTIONS') return next();
  if (PUBLIC.some(([m, p]) => m === method && p === path)) return next();
  if (SELF_AUTHENTICATED_PREFIXES.some((p) => path.startsWith(p))) return next();

  // 1. Signed app token (anonymous app traffic)
  const appToken = c.req.header('X-App-Token');
  if (appToken) {
    if (!c.env.APP_TOKEN_SECRET) {
      console.error('[apiGate] APP_TOKEN_SECRET is not set - refusing request (fail closed)');
      return c.json({ error: 'Server auth is not configured', code: 'AUTH_NOT_CONFIGURED' }, 503);
    }
    if (verifyAppToken(appToken, c.env.APP_TOKEN_SECRET)) return next();
    return c.json({ error: 'Invalid or expired app token', code: 'APP_TOKEN_INVALID' }, 401);
  }

  // 2. User session
  const auth = c.req.header('Authorization');
  const sessionToken = auth?.startsWith('Bearer ') ? auth.slice(7) : c.req.header('X-Session-Token');
  if (sessionToken && (await validateSession(c.env.DB, sessionToken))) return next();

  // 3. API key (stored hashed)
  const apiKey = c.req.header('X-API-Key');
  if (apiKey) {
    const row = await c.env.DB.prepare('SELECT id FROM api_keys WHERE key = ? AND active = 1')
      .bind(await sha256hex(apiKey)).first();
    if (row) return next();
  }

  return c.json({ error: 'Authentication required', code: 'AUTH_REQUIRED' }, 401);
}
