# NoteBurner API Documentation

## Overview

NoteBurner provides a RESTful API and webhooks for platform integrations. Create secure, self-destructing messages programmatically from your applications.

**Base URL**: `https://api.noteburner.app`

**Authentication**: API Key (Header: `X-API-Key: nb_your_api_key_here`)

**Rate Limits**:
- Free tier: 100 requests/minute
- Premium tier: 1,000 requests/minute
- Enterprise: Custom limits

---

## Authentication

### Create API Key

```http
POST /api/integrations/keys/create
Content-Type: application/json

{
  "user_id": "your_user_id",
  "name": "My Integration"
}
```

**Response:**
```json
{
  "success": true,
  "api_key": "nb_abc123...",
  "key_id": "key_xyz",
  "name": "My Integration",
  "warning": "Save this key securely - it will not be shown again"
}
```

---

## Endpoints

### 1. Slack Integration

#### Slash Command
**POST** `/api/integrations/slack/command`

Handle `/noteburner` slash command in Slack.

**Request Body** (from Slack):
```
token=gIkuvaNzQIHg97ATvDxqgjtO
&team_id=T0001
&team_domain=example
&channel_id=C2147483705
&channel_name=test
&user_id=U2147483697
&user_name=Steve
&command=/noteburner
&text=Meeting password is secret123
&response_url=https://hooks.slack.com/commands/1234/5678
```

**Response:**
```json
{
  "response_type": "ephemeral",
  "text": "✅ Secure message created!",
  "attachments": [{
    "color": "#10b981",
    "text": "🔐 Your one-time link:\nhttps://noteburner.app/m/abc123?p=xyz789",
    "actions": [
      {
        "type": "button",
        "text": "Share in Channel",
        "name": "share",
        "value": "https://noteburner.app/m/abc123?p=xyz789"
      }
    ]
  }]
}
```

#### Interactive Actions
**POST** `/api/integrations/slack/actions`

Handle button clicks (Share in Channel).

---

### 2. Zapier Integration

#### Create Message
**POST** `/api/integrations/zapier/create`

Create a secure message via Zapier.

**Headers:**
```
Content-Type: application/json
X-API-Key: nb_your_api_key
```

**Request Body:**
```json
{
  "api_key": "nb_your_api_key",
  "message": "This is a secret message",
  "password": "optional_password",
  "expires_in_hours": 24
}
```

**Response:**
```json
{
  "success": true,
  "message_id": "abc123",
  "url": "https://noteburner.app/m/abc123?p=xyz789",
  "password": "xyz789",
  "expires_at": "2026-02-10T12:00:00Z"
}
```

#### Test Authentication
**GET** `/api/integrations/zapier/auth`

**Headers:**
```
X-API-Key: nb_your_api_key
```

**Response:**
```json
{
  "success": true,
  "message": "Authentication successful"
}
```

---

### 3. Webhooks

#### Subscribe to Events
**POST** `/api/integrations/webhooks/subscribe`

Subscribe to message events (for Zapier triggers).

**Request Body:**
```json
{
  "api_key": "nb_your_api_key",
  "webhook_url": "https://hooks.zapier.com/hooks/catch/123456/abcdef/",
  "events": ["message.created", "message.viewed", "message.burned"]
}
```

**Supported Events:**
- `message.created` - When a message is created
- `message.viewed` - When a message is successfully viewed
- `message.burned` - When a message is deleted

**Response:**
```json
{
  "success": true,
  "webhook_id": "wh_abc123",
  "subscribed_events": ["message.created", "message.viewed", "message.burned"]
}
```

#### Webhook Payload

When an event occurs, we'll POST to your webhook URL:

```json
{
  "event": "message.burned",
  "message_id": "abc123",
  "timestamp": "2026-02-09T12:00:00Z",
  "metadata": {
    "country": "US",
    "created_at": "2026-02-09T10:00:00Z",
    "expires_at": "2026-02-10T10:00:00Z"
  }
}
```

---

### 4. Discord Integration

#### Create Message
**POST** `/api/integrations/discord/create`

Create a secure message for Discord bot.

**Request Body:**
```json
{
  "bot_token": "Bot your_discord_bot_token",
  "message": "Secret content here",
  "expires_in_hours": 24
}
```

**Response:**
```json
{
  "success": true,
  "message_id": "abc123",
  "url": "https://noteburner.app/m/abc123?p=xyz789",
  "embed": {
    "title": "🔥 Secure Message",
    "description": "Click the link to view this one-time secret message",
    "url": "https://noteburner.app/m/abc123?p=xyz789",
    "color": 16092939,
    "footer": {
      "text": "⚠️ Self-destructs after viewing"
    }
  }
}
```

---

### 5. Audit Logs

#### Get Message Audit Log
**GET** `/api/audit/:messageId`

Retrieve privacy-friendly access logs for your message.

**Headers:**
```
X-Creator-Token: token_from_message_creation
```

**Response:**
```json
{
  "message": {
    "id": "abc123",
    "created_at": "2026-02-09T10:00:00Z",
    "expires_at": "2026-02-10T10:00:00Z",
    "max_views": 1,
    "view_count": 0,
    "password_attempts": 0
  },
  "events": [
    {
      "type": "created",
      "country": "US",
      "timestamp": "2026-02-09T10:00:00Z",
      "success": true,
      "metadata": null
    },
    {
      "type": "password_attempt",
      "country": "GB",
      "timestamp": "2026-02-09T11:00:00Z",
      "success": true,
      "metadata": null
    },
    {
      "type": "viewed",
      "country": "GB",
      "timestamp": "2026-02-09T11:00:01Z",
      "success": true,
      "metadata": null
    }
  ]
}
```

---

## Error Responses

All errors follow this format:

```json
{
  "error": "Error message description"
}
```

**Common HTTP Status Codes:**
- `200` - Success
- `201` - Created
- `400` - Bad Request (invalid parameters)
- `401` - Unauthorized (invalid API key)
- `403` - Forbidden (rate limit exceeded, banned IP)
- `404` - Not Found
- `429` - Too Many Requests (rate limited)
- `500` - Internal Server Error

**Rate Limit Headers:**
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 87
X-RateLimit-Reset: 2026-02-09T12:01:00Z
Retry-After: 45
```

---

## Platform Integration Examples

### Slack App Setup

1. Create Slack app at https://api.slack.com/apps
2. Add slash command `/noteburner` pointing to `https://api.noteburner.app/api/integrations/slack/command`
3. Add interactive components URL: `https://api.noteburner.app/api/integrations/slack/actions`
4. Set verification token in environment variables
5. Install app to workspace

### Zapier Setup

1. Create Zapier app integration
2. Add authentication using API Key
3. Add actions:
   - **Create Message**: POST to `/api/integrations/zapier/create`
4. Add triggers:
   - **Message Burned**: Subscribe webhook to `message.burned` event

### Discord Bot Setup

```javascript
// Discord.js example
const { Client, Intents } = require('discord.js');
const axios = require('axios');

const client = new Client({ intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES] });

client.on('messageCreate', async (message) => {
  if (message.content.startsWith('!secret ')) {
    const secretMessage = message.content.slice(8);
    
    const response = await axios.post('https://api.noteburner.app/api/integrations/discord/create', {
      bot_token: `Bot ${process.env.DISCORD_BOT_TOKEN}`,
      message: secretMessage,
      expires_in_hours: 24
    });
    
    message.channel.send({ embeds: [response.data.embed] });
  }
});

client.login(process.env.DISCORD_BOT_TOKEN);
```

---

## Security Best Practices

1. **Never share your API key** - Store it in environment variables
2. **Use HTTPS** - All API calls must use HTTPS
3. **Rotate keys regularly** - Generate new keys every 90 days
4. **Monitor usage** - Check audit logs for suspicious activity
5. **Rate limiting** - Implement exponential backoff for 429 errors
6. **Webhook validation** - Verify webhook signatures (if implemented)

---

## Support

- **Documentation**: https://docs.noteburner.app
- **Email**: api@noteburner.app
- **GitHub**: https://github.com/noteburner/noteburner/issues
- **Discord**: https://discord.gg/noteburner

---

## Changelog

### v1.8.0 (2026-02-09)
- Initial API release
- Slack, Zapier, Discord integrations
- Webhook system for triggers
- Audit logs API

---

**Last Updated**: February 9, 2026  
**API Version**: 1.8.0
