import { Hono } from 'hono';
import { nanoid } from 'nanoid';
import crypto from 'crypto';
import { findActiveApiKey } from '../utils/apiKeys.js';
import { verifySlackSignature } from '../utils/slackSignature.js';

const router = new Hono();

// Slack requests are authenticated by HMAC signature (fails closed if SLACK_SIGNING_SECRET unset)
router.use('/slack/*', async (c, next) => {
  const rawBody = await c.req.raw.clone().text();
  const ok = verifySlackSignature({
    secret: c.env.SLACK_SIGNING_SECRET,
    timestamp: c.req.header('X-Slack-Request-Timestamp'),
    signature: c.req.header('X-Slack-Signature'),
    rawBody
  });
  if (!ok) return c.json({ error: 'Invalid Slack signature' }, 401);
  await next();
});

/**
 * Slack Integration
 * POST /api/integrations/slack/command
 * Handle /noteburner slash command
 */
router.post('/slack/command', async (c) => {
  // These integrations inserted plaintext into non-existent columns (always 500) and put the
  // password in the link, which breaks the zero-knowledge model. Disabled until redesigned
  // around client-side encryption.
  return c.json({
    error: 'This integration is temporarily disabled.',
    code: 'INTEGRATION_DISABLED'
  }, 501);
});

/**
 * Slack Interactive Actions
 * POST /api/integrations/slack/actions
 * Handle button clicks (Share in Channel)
 */
router.post('/slack/actions', async (c) => {
  // These integrations inserted plaintext into non-existent columns (always 500) and put the
  // password in the link, which breaks the zero-knowledge model. Disabled until redesigned
  // around client-side encryption.
  return c.json({
    error: 'This integration is temporarily disabled.',
    code: 'INTEGRATION_DISABLED'
  }, 501);
});

/**
 * Zapier Webhook Integration
 * POST /api/integrations/zapier/create
 * Create message via Zapier
 */
router.post('/zapier/create', async (c) => {
  // These integrations inserted plaintext into non-existent columns (always 500) and put the
  // password in the link, which breaks the zero-knowledge model. Disabled until redesigned
  // around client-side encryption.
  return c.json({
    error: 'This integration is temporarily disabled.',
    code: 'INTEGRATION_DISABLED'
  }, 501);
});

/**
 * Zapier Authentication Test
 * GET /api/integrations/zapier/auth
 */
router.get('/zapier/auth', async (c) => {
  try {
    const apiKey = c.req.header('X-API-Key');

    if (!apiKey) {
      return c.json({ error: 'API key required' }, 401);
    }

    const validKey = await findActiveApiKey(c.env.DB, apiKey);

    if (!validKey) {
      return c.json({ error: 'Invalid API key' }, 401);
    }

    return c.json({ 
      success: true,
      message: 'Authentication successful'
    });

  } catch (error) {
    return c.json({ error: 'Authentication failed' }, 401);
  }
});

/**
 * Webhook Events (for Zapier triggers)
 * POST /api/integrations/webhooks/subscribe
 */
router.post('/webhooks/subscribe', async (c) => {
  try {
    const { api_key, webhook_url, events } = await c.req.json();

    // Verify API key
    const validKey = await findActiveApiKey(c.env.DB, c.req.header('X-API-Key') || api_key);

    if (!validKey) {
      return c.json({ error: 'Invalid API key' }, 401);
    }

    // Validate webhook URL
    let hostname = '';
    try { hostname = new URL(webhook_url).hostname.toLowerCase(); } catch { /* invalid */ }
    const isPrivateHost = !hostname || hostname === 'localhost' || hostname.endsWith('.local') ||
      hostname.endsWith('.internal') || /^(127\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.|0\.)/.test(hostname) ||
      hostname === '[::1]' || hostname.startsWith('[');
    if (!webhook_url || !webhook_url.startsWith('https://') || isPrivateHost) {
      return c.json({ error: 'Valid public HTTPS webhook URL required' }, 400);
    }

    // Supported events: message.created, message.viewed, message.burned
    const allowedEvents = ['message.created', 'message.viewed', 'message.burned'];
    const subscribedEvents = events?.filter(e => allowedEvents.includes(e)) || ['message.burned'];

    const webhookId = nanoid(16);

    // Store webhook subscription
    await c.env.DB.prepare(`
      INSERT INTO webhooks (id, user_id, url, events, active)
      VALUES (?, ?, ?, ?, 1)
    `).bind(
      webhookId,
      validKey.user_id,
      webhook_url,
      JSON.stringify(subscribedEvents)
    ).run();

    return c.json({
      success: true,
      webhook_id: webhookId,
      subscribed_events: subscribedEvents
    });

  } catch (error) {
    console.error('Webhook subscribe error:', error);
    return c.json({ error: 'Failed to subscribe webhook' }, 500);
  }
});

/**
 * Discord Bot Integration
 * POST /api/integrations/discord/create
 */
router.post('/discord/create', async (c) => {
  // These integrations inserted plaintext into non-existent columns (always 500) and put the
  // password in the link, which breaks the zero-knowledge model. Disabled until redesigned
  // around client-side encryption.
  return c.json({
    error: 'This integration is temporarily disabled.',
    code: 'INTEGRATION_DISABLED'
  }, 501);
});


// Helper function to hash password
async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export default router;
