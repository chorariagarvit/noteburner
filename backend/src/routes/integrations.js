import { Hono } from 'hono';
import { nanoid } from 'nanoid';
import crypto from 'crypto';

const router = new Hono();

/**
 * Slack Integration
 * POST /api/integrations/slack/command
 * Handle /noteburner slash command
 */
router.post('/slack/command', async (c) => {
  try {
    const body = await c.req.parseBody();
    
    // Verify Slack token (should be in environment variables)
    const slackToken = c.env.SLACK_VERIFICATION_TOKEN;
    if (body.token !== slackToken) {
      return c.json({ error: 'Invalid token' }, 401);
    }

    const messageText = body.text || '';
    const userId = body.user_id;
    const channelId = body.channel_id;

    // If no message provided, show help
    if (!messageText.trim()) {
      return c.json({
        response_type: 'ephemeral',
        text: '🔥 *NoteBurner - Secure Self-Destructing Messages*',
        attachments: [{
          color: '#f59e0b',
          text: '*Usage:*\n`/noteburner [your secret message]`\n\n*Example:*\n`/noteburner Meeting password is abc123`\n\nThis will create a secure, one-time link that self-destructs after viewing.',
          footer: 'NoteBurner',
          footer_icon: 'https://noteburner.app/icon.png'
        }]
      });
    }

    // Create a message via API (simplified - in production, call internal message creation)
    const messageId = nanoid(12);
    const password = nanoid(16); // Auto-generate secure password
    
    // Store in database (using D1)
    await c.env.DB.prepare(`
      INSERT INTO messages (id, content, password, expires_at, created_via)
      VALUES (?, ?, ?, datetime('now', '+24 hours'), 'slack')
    `).bind(
      messageId,
      messageText,
      await hashPassword(password)
    ).run();

    // Create shareable link
    const messageUrl = `https://noteburner.app/m/${messageId}?p=${password}`;

    return c.json({
      response_type: 'ephemeral',
      text: '✅ *Secure message created!*',
      attachments: [{
        color: '#10b981',
        text: `🔐 *Your one-time link:*\n${messageUrl}\n\n⚠️ This link will self-destruct after the first view or in 24 hours.\n\n_Click "Share in Channel" to post it, or copy the link privately._`,
        footer: 'NoteBurner - Share Securely',
        actions: [{
          type: 'button',
          text: 'Share in Channel',
          name: 'share',
          value: messageUrl,
          style: 'primary'
        }, {
          type: 'button',
          text: 'Copy Link',
          name: 'copy',
          value: messageUrl
        }]
      }]
    });

  } catch (error) {
    console.error('Slack command error:', error);
    return c.json({
      response_type: 'ephemeral',
      text: '❌ Error creating secure message. Please try again.'
    }, 500);
  }
});

/**
 * Slack Interactive Actions
 * POST /api/integrations/slack/actions
 * Handle button clicks (Share in Channel)
 */
router.post('/slack/actions', async (c) => {
  try {
    const body = await c.req.parseBody();
    const payload = JSON.parse(body.payload);

    // Verify token
    if (payload.token !== c.env.SLACK_VERIFICATION_TOKEN) {
      return c.json({ error: 'Invalid token' }, 401);
    }

    const action = payload.actions[0];
    const messageUrl = action.value;

    if (action.name === 'share') {
      // Post to channel
      return c.json({
        response_type: 'in_channel',
        text: `🔥 *Secure Message Link*\n${messageUrl}\n\n⚠️ _One-time access only - will self-destruct after viewing_`,
        replace_original: false
      });
    }

    return c.json({ text: 'Link copied!' });

  } catch (error) {
    console.error('Slack action error:', error);
    return c.json({ error: 'Failed to process action' }, 500);
  }
});

/**
 * Zapier Webhook Integration
 * POST /api/integrations/zapier/create
 * Create message via Zapier
 */
router.post('/zapier/create', async (c) => {
  try {
    const { api_key, message, password, expires_in_hours } = await c.req.json();

    // Verify API key
    const validKey = await c.env.DB.prepare(`
      SELECT id, user_id FROM api_keys WHERE key = ? AND active = 1
    `).bind(api_key).first();

    if (!validKey) {
      return c.json({ error: 'Invalid API key' }, 401);
    }

    // Validate input
    if (!message || message.length > 10000) {
      return c.json({ error: 'Message required (max 10,000 characters)' }, 400);
    }

    const messageId = nanoid(12);
    const expiresInHours = Math.min(parseInt(expires_in_hours) || 24, 168); // Max 7 days
    
    // Auto-generate password if not provided
    const messagePassword = password || nanoid(16);
    const hashedPassword = await hashPassword(messagePassword);

    // Create message
    await c.env.DB.prepare(`
      INSERT INTO messages (id, content, password, expires_at, created_via, user_id)
      VALUES (?, ?, ?, datetime('now', '+${expiresInHours} hours'), 'zapier', ?)
    `).bind(
      messageId,
      message,
      hashedPassword,
      validKey.user_id
    ).run();

    const messageUrl = password 
      ? `https://noteburner.app/m/${messageId}?p=${messagePassword}`
      : `https://noteburner.app/m/${messageId}`;

    return c.json({
      success: true,
      message_id: messageId,
      url: messageUrl,
      password: password ? null : messagePassword, // Only return password if auto-generated
      expires_at: new Date(Date.now() + expiresInHours * 3600000).toISOString()
    });

  } catch (error) {
    console.error('Zapier create error:', error);
    return c.json({ error: 'Failed to create message' }, 500);
  }
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

    const validKey = await c.env.DB.prepare(`
      SELECT id, user_id FROM api_keys WHERE key = ? AND active = 1
    `).bind(apiKey).first();

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
    const validKey = await c.env.DB.prepare(`
      SELECT id, user_id FROM api_keys WHERE key = ? AND active = 1
    `).bind(api_key).first();

    if (!validKey) {
      return c.json({ error: 'Invalid API key' }, 401);
    }

    // Validate webhook URL
    if (!webhook_url || !webhook_url.startsWith('https://')) {
      return c.json({ error: 'Valid HTTPS webhook URL required' }, 400);
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
  try {
    const { bot_token, message, expires_in_hours } = await c.req.json();

    // Verify Discord bot token (simplified - in production, verify with Discord API)
    if (!bot_token || !bot_token.startsWith('Bot ')) {
      return c.json({ error: 'Invalid Discord bot token' }, 401);
    }

    const messageId = nanoid(12);
    const password = nanoid(16);
    const expiresInHours = Math.min(parseInt(expires_in_hours) || 24, 168);

    await c.env.DB.prepare(`
      INSERT INTO messages (id, content, password, expires_at, created_via)
      VALUES (?, ?, ?, datetime('now', '+${expiresInHours} hours'), 'discord')
    `).bind(
      messageId,
      message,
      await hashPassword(password)
    ).run();

    const messageUrl = `https://noteburner.app/m/${messageId}?p=${password}`;

    return c.json({
      success: true,
      message_id: messageId,
      url: messageUrl,
      embed: {
        title: '🔥 Secure Message',
        description: 'Click the link to view this one-time secret message',
        url: messageUrl,
        color: 0xf59e0b,
        footer: {
          text: '⚠️ Self-destructs after viewing'
        }
      }
    });

  } catch (error) {
    console.error('Discord create error:', error);
    return c.json({ error: 'Failed to create message' }, 500);
  }
});

/**
 * API Key Management
 * POST /api/integrations/keys/create
 */
router.post('/keys/create', async (c) => {
  try {
    const { user_id, name } = await c.req.json();

    if (!user_id || !name) {
      return c.json({ error: 'user_id and name required' }, 400);
    }

    const apiKey = `nb_${nanoid(32)}`;
    const keyId = nanoid(16);

    await c.env.DB.prepare(`
      INSERT INTO api_keys (id, user_id, key, name, active)
      VALUES (?, ?, ?, ?, 1)
    `).bind(keyId, user_id, apiKey, name).run();

    return c.json({
      success: true,
      api_key: apiKey,
      key_id: keyId,
      name: name,
      warning: 'Save this key securely - it will not be shown again'
    });

  } catch (error) {
    console.error('API key creation error:', error);
    return c.json({ error: 'Failed to create API key' }, 500);
  }
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
