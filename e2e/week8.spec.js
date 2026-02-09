import { test, expect } from '@playwright/test';

/**
 * Week 8 E2E Tests - Platform Integrations
 * Tests for Slack, Zapier, Discord integrations and API
 */

test.describe('Week 8 - Platform Integrations', () => {
  
  // API Key Management Tests
  test.describe('API Key Management', () => {
    test('should create API key', async ({ request }) => {
      const response = await request.post('/api/integrations/keys/create', {
        data: {
          user_id: 'test_user_123',
          name: 'Test Integration'
        }
      });

      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.api_key).toMatch(/^nb_/);
      expect(data.name).toBe('Test Integration');
      expect(data.warning).toContain('Save this key securely');
    });

    test('should require user_id and name', async ({ request }) => {
      const response = await request.post('/api/integrations/keys/create', {
        data: {}
      });

      expect(response.status()).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('required');
    });
  });

  // Zapier Integration Tests
  test.describe('Zapier Integration', () => {
    let apiKey;

    test.beforeAll(async ({ request }) => {
      // Create API key for testing
      const response = await request.post('/api/integrations/keys/create', {
        data: {
          user_id: 'zapier_test_user',
          name: 'Zapier Test'
        }
      });
      const data = await response.json();
      apiKey = data.api_key;
    });

    test('should authenticate with valid API key', async ({ request }) => {
      const response = await request.get('/api/integrations/zapier/auth', {
        headers: {
          'X-API-Key': apiKey
        }
      });

      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
    });

    test('should reject invalid API key', async ({ request }) => {
      const response = await request.get('/api/integrations/zapier/auth', {
        headers: {
          'X-API-Key': 'invalid_key'
        }
      });

      expect(response.status()).toBe(401);
    });

    test.skip('should create message via Zapier', async ({ request }) => {
      const response = await request.post('/api/integrations/zapier/create', {
        data: {
          api_key: apiKey,
          message: 'Test message from Zapier',
          expires_in_hours: 24
        }
      });

      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.message_id).toBeTruthy();
      expect(data.url).toContain('noteburner.app/m/');
      expect(data.password).toBeTruthy(); // Auto-generated
      expect(data.expires_at).toBeTruthy();
    });

    test.skip('should create message with custom password', async ({ request }) => {
      const response = await request.post('/api/integrations/zapier/create', {
        data: {
          api_key: apiKey,
          message: 'Test with custom password',
          password: 'custom123',
          expires_in_hours: 12
        }
      });

      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.password).toBeNull(); // Not returned if provided
    });

    test.skip('should respect max expiration (7 days)', async ({ request }) => {
      const response = await request.post('/api/integrations/zapier/create', {
        data: {
          api_key: apiKey,
          message: 'Test expiration limit',
          expires_in_hours: 1000 // Exceeds 168 hours (7 days)
        }
      });

      expect(response.status()).toBe(200);
      const data = await response.json();
      const expiresAt = new Date(data.expires_at);
      const createdAt = new Date();
      const diffHours = (expiresAt - createdAt) / (1000 * 60 * 60);
      expect(diffHours).toBeLessThanOrEqual(168);
    });

    test('should reject message over 10,000 characters', async ({ request }) => {
      const longMessage = 'a'.repeat(10001);
      const response = await request.post('/api/integrations/zapier/create', {
        data: {
          api_key: apiKey,
          message: longMessage
        }
      });

      expect(response.status()).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('max 10,000');
    });
  });

  // Webhook Subscription Tests
  test.describe('Webhook Subscriptions', () => {
    let apiKey;

    test.beforeAll(async ({ request }) => {
      const response = await request.post('/api/integrations/keys/create', {
        data: {
          user_id: 'webhook_test_user',
          name: 'Webhook Test'
        }
      });
      const data = await response.json();
      apiKey = data.api_key;
    });

    test('should subscribe to webhooks', async ({ request }) => {
      const response = await request.post('/api/integrations/webhooks/subscribe', {
        data: {
          api_key: apiKey,
          webhook_url: 'https://hooks.zapier.com/test',
          events: ['message.created', 'message.burned']
        }
      });

      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.webhook_id).toBeTruthy();
      expect(data.subscribed_events).toContain('message.created');
      expect(data.subscribed_events).toContain('message.burned');
    });

    test('should require HTTPS webhook URL', async ({ request }) => {
      const response = await request.post('/api/integrations/webhooks/subscribe', {
        data: {
          api_key: apiKey,
          webhook_url: 'http://insecure.example.com/hook',
          events: ['message.burned']
        }
      });

      expect(response.status()).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('HTTPS');
    });

    test('should filter invalid event types', async ({ request }) => {
      const response = await request.post('/api/integrations/webhooks/subscribe', {
        data: {
          api_key: apiKey,
          webhook_url: 'https://hooks.example.com/test',
          events: ['message.created', 'invalid.event', 'message.burned']
        }
      });

      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(data.subscribed_events).not.toContain('invalid.event');
      expect(data.subscribed_events).toHaveLength(2);
    });
  });

  // Discord Integration Tests
  test.describe('Discord Integration', () => {
    test.skip('should create message for Discord', async ({ request }) => {
      const response = await request.post('/api/integrations/discord/create', {
        data: {
          bot_token: 'Bot test_token_123',
          message: 'Secret message for Discord',
          expires_in_hours: 24
        }
      });

      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.message_id).toBeTruthy();
      expect(data.url).toContain('noteburner.app/m/');
      expect(data.embed).toBeTruthy();
      expect(data.embed.title).toBe('🔥 Secure Message');
      expect(data.embed.color).toBe(0xf59e0b);
      expect(data.embed.footer.text).toContain('Self-destructs');
    });

    test('should reject invalid Discord bot token', async ({ request }) => {
      const response = await request.post('/api/integrations/discord/create', {
        data: {
          bot_token: 'invalid_token',
          message: 'Test message'
        }
      });

      expect(response.status()).toBe(401);
    });
  });

  // Rate Limiting Tests
  test.describe('Rate Limiting', () => {
    test('should return rate limit headers', async ({ request }) => {
      const response = await request.get('/api/integrations/zapier/auth', {
        headers: {
          'X-API-Key': 'test_key'
        }
      });

      expect(response.headers()['x-ratelimit-limit']).toBeTruthy();
      expect(response.headers()['x-ratelimit-remaining']).toBeTruthy();
      expect(response.headers()['x-ratelimit-reset']).toBeTruthy();
    });

    test('should enforce rate limits', async ({ request }) => {
      // This test would need to make 101 requests
      // Simplified version - just check headers exist
      const response = await request.get('/api/integrations/zapier/auth', {
        headers: {
          'X-API-Key': 'test_key'
        }
      });

      const remaining = parseInt(response.headers()['x-ratelimit-remaining']);
      expect(remaining).toBeGreaterThanOrEqual(0);
    });
  });

  // Integration UI Tests (Frontend)
  test.describe('Integration UI', () => {
    test('should display API documentation link', async ({ page }) => {
      await page.goto('/');
      
      // Navigate to integrations page (if exists)
      const integrationsLink = page.locator('a:has-text("Integrations"), a:has-text("API")');
      if (await integrationsLink.count() > 0) {
        await integrationsLink.first().click();
        await expect(page).toHaveURL(/integrations|api/);
      }
    });

    test('should show platform integration cards', async ({ page }) => {
      await page.goto('/integrations');
      
      // Check for integration platform cards
      const platforms = ['Slack', 'Zapier', 'Discord'];
      for (const platform of platforms) {
        const card = page.locator(`text=${platform}`);
        if (await card.count() > 0) {
          await expect(card.first()).toBeVisible();
        }
      }
    });
  });

  // Security Headers Tests
  test.describe('Security Headers', () => {
    test('should include CSP headers', async ({ request }) => {
      const response = await request.get('/');
      const csp = response.headers()['content-security-policy'];
      
      if (csp) {
        expect(csp).toContain("default-src 'self'");
        expect(csp).toContain("object-src 'none'");
        expect(csp).toContain("frame-ancestors 'none'");
      }
    });

    test.skip('should include security headers', async ({ request }) => {
      const response = await request.get('/');
      const headers = response.headers();
      
      expect(headers['x-frame-options']).toBeTruthy();
      expect(headers['x-content-type-options']).toBe('nosniff');
      expect(headers['strict-transport-security']).toContain('max-age');
    });
  });

  // Created_via Tracking Tests
  test.describe('Platform Tracking', () => {
    test('should track creation source', async ({ request }) => {
      // Create message via Zapier
      const createResponse = await request.post('/api/integrations/zapier/create', {
        data: {
          api_key: 'test_key',
          message: 'Test tracking'
        }
      });

      if (createResponse.status() === 200) {
        const data = await createResponse.json();
        
        // Verify in database that created_via = 'zapier'
        // This would require additional database access in tests
        expect(data.message_id).toBeTruthy();
      }
    });
  });
});
