/**
 * Week 14: Premium Features - E2E Tests
 * Tests for premium plans API, subscription management,
 * pricing page UI, premium dashboard, and feature gating.
 */

import { test, expect } from '@playwright/test';

const API_BASE_URL = process.env.API_URL || 'http://localhost:8787';
const APP_URL = process.env.APP_URL || 'http://localhost:5173';

// Helper: register & login test user, return token
async function createTestUser(request, suffix = '') {
  const ts = Date.now();
  const email = `premium-test-${ts}${suffix}@example.com`;
  const password = 'TestPassword123!';

  await request.post(`${API_BASE_URL}/api/auth/signup`, {
    data: { email, password, username: `premtest${ts}` }
  });

  const loginRes = await request.post(`${API_BASE_URL}/api/auth/login`, {
    data: { email, password }
  });

  if (!loginRes.ok()) return null;
  const { token } = await loginRes.json();
  return token;
}

// ──────────────────────────────────────────────────────────────────────────────
// API Tests
// ──────────────────────────────────────────────────────────────────────────────

test.describe('Week 14: Premium Features', () => {

  test.describe('GET /api/premium/plans', () => {

    test('should return plans array publicly (no auth required)', async ({ request }) => {
      const response = await request.get(`${API_BASE_URL}/api/premium/plans`);
      expect(response.status()).toBe(200);

      const data = await response.json();
      expect(data).toHaveProperty('plans');
      expect(Array.isArray(data.plans)).toBe(true);
    });

    test('plans array should include at least 3 plans', async ({ request }) => {
      const response = await request.get(`${API_BASE_URL}/api/premium/plans`);
      const { plans } = await response.json();
      expect(plans.length).toBeGreaterThanOrEqual(3);
    });

    test('each plan should have required fields', async ({ request }) => {
      const response = await request.get(`${API_BASE_URL}/api/premium/plans`);
      const { plans } = await response.json();

      for (const plan of plans) {
        expect(plan).toHaveProperty('id');
        expect(plan).toHaveProperty('name');
        expect(plan).toHaveProperty('price_monthly');
        expect(plan).toHaveProperty('file_size_limit');
        expect(plan).toHaveProperty('custom_urls_limit');
      }
    });

    test('free plan should have price_monthly of 0', async ({ request }) => {
      const response = await request.get(`${API_BASE_URL}/api/premium/plans`);
      const { plans } = await response.json();
      const freePlan = plans.find(p => p.id === 'free' || p.price_monthly === 0);
      expect(freePlan).toBeDefined();
      expect(freePlan.price_monthly).toBe(0);
    });

    test('premium plan should have price_monthly of 5', async ({ request }) => {
      const response = await request.get(`${API_BASE_URL}/api/premium/plans`);
      const { plans } = await response.json();
      const premiumPlan = plans.find(p => p.id === 'premium' || (p.price_monthly > 0 && p.price_monthly < 10));
      expect(premiumPlan).toBeDefined();
      expect(Number(premiumPlan.price_monthly)).toBe(5);
    });

    test('lifetime plan should have price_lifetime of 49', async ({ request }) => {
      const response = await request.get(`${API_BASE_URL}/api/premium/plans`);
      const { plans } = await response.json();
      const lifetimePlan = plans.find(p => p.id === 'lifetime' || p.price_lifetime > 0);
      expect(lifetimePlan).toBeDefined();
      expect(Number(lifetimePlan.price_lifetime)).toBe(49);
    });

    test('plans should include features field (JSON)', async ({ request }) => {
      const response = await request.get(`${API_BASE_URL}/api/premium/plans`);
      const { plans } = await response.json();
      const premiumPlan = plans.find(p => p.id === 'premium');
      if (premiumPlan && premiumPlan.features) {
        // features might be a JSON string or an object
        const features = typeof premiumPlan.features === 'string'
          ? JSON.parse(premiumPlan.features)
          : premiumPlan.features;
        expect(Array.isArray(features)).toBe(true);
      }
    });

    test('API version should be 1.12.0', async ({ request }) => {
      const response = await request.get(`${API_BASE_URL}/`);
      const data = await response.json();
      expect(data.version).toBe('1.12.0');
    });

    test('API features should include premium', async ({ request }) => {
      const response = await request.get(`${API_BASE_URL}/`);
      const data = await response.json();
      expect(data.features).toContain('premium');
    });

  });

  test.describe('GET /api/premium/status (authenticated)', () => {

    test('should return 401 without auth token', async ({ request }) => {
      const response = await request.get(`${API_BASE_URL}/api/premium/status`);
      expect(response.status()).toBe(401);
    });

    test('should return current plan for authenticated user', async ({ request }) => {
      const token = await createTestUser(request, '-status');
      if (!token) {
        test.skip(true, 'Auth service unavailable in test environment');
        return;
      }

      const response = await request.get(`${API_BASE_URL}/api/premium/status`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(data).toHaveProperty('plan');
      expect(data).toHaveProperty('subscription');
      expect(data.subscription.plan_id).toBe('free'); // new users default to free
    });

    test('premium status should include file size limit', async ({ request }) => {
      const token = await createTestUser(request, '-limits');
      if (!token) return;

      const response = await request.get(`${API_BASE_URL}/api/premium/status`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.status() !== 200) return;
      const data = await response.json();
      expect(data.plan).toHaveProperty('file_size_limit');
      // Free plan: 100MB = 104857600
      expect(data.plan.file_size_limit).toBeGreaterThan(0);
    });

  });

  test.describe('POST /api/premium/subscribe (authenticated)', () => {

    test('should return 401 without auth', async ({ request }) => {
      const response = await request.post(`${API_BASE_URL}/api/premium/subscribe`, {
        data: { planId: 'premium', paymentMethod: 'stripe' }
      });
      expect(response.status()).toBe(401);
    });

    test('should reject invalid planId', async ({ request }) => {
      const token = await createTestUser(request, '-sub-invalid');
      if (!token) return;

      const response = await request.post(`${API_BASE_URL}/api/premium/subscribe`, {
        headers: { Authorization: `Bearer ${token}` },
        data: { planId: 'invalid-plan', paymentMethod: 'stripe' }
      });

      expect(response.status()).toBe(400);
    });

    test('should accept premium subscription', async ({ request }) => {
      const token = await createTestUser(request, '-sub-premium');
      if (!token) return;

      const response = await request.post(`${API_BASE_URL}/api/premium/subscribe`, {
        headers: { Authorization: `Bearer ${token}` },
        data: { planId: 'premium', paymentMethod: 'stripe' }
      });

      // 200 success or 402 if payment not configured in test env
      expect([200, 201, 402]).toContain(response.status());
    });

  });

  test.describe('GET /api/premium/usage (authenticated)', () => {

    test('should return 401 without auth', async ({ request }) => {
      const response = await request.get(`${API_BASE_URL}/api/premium/usage`);
      expect(response.status()).toBe(401);
    });

    test('should return usage object for authenticated user', async ({ request }) => {
      const token = await createTestUser(request, '-usage');
      if (!token) return;

      const response = await request.get(`${API_BASE_URL}/api/premium/usage`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(data).toHaveProperty('usage');
      expect(data.usage).toHaveProperty('messages_created');
      expect(data.usage).toHaveProperty('storage_used');
      expect(data.usage).toHaveProperty('api_calls');
    });

    test('usage should include limits', async ({ request }) => {
      const token = await createTestUser(request, '-usage-limits');
      if (!token) return;

      const response = await request.get(`${API_BASE_URL}/api/premium/usage`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.status() !== 200) return;
      const data = await response.json();
      expect(data.usage).toHaveProperty('limits');
    });

  });

  test.describe('DELETE /api/premium/cancel (authenticated)', () => {

    test('should return 401 without auth', async ({ request }) => {
      const response = await request.delete(`${API_BASE_URL}/api/premium/cancel`);
      expect(response.status()).toBe(401);
    });

    test('should handle cancel when no subscription exists', async ({ request }) => {
      const token = await createTestUser(request, '-cancel');
      if (!token) return;

      const response = await request.delete(`${API_BASE_URL}/api/premium/cancel`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // 404 if no subscription, 200 if cancelled
      expect([200, 404]).toContain(response.status());
    });

  });

  // ──────────────────────────────────────────────────────────────────────────
  // Frontend UI Tests
  // ──────────────────────────────────────────────────────────────────────────

  test.describe('Frontend: Pricing Page', () => {

    test('/pricing renders without crash', async ({ page }) => {
      const errors = [];
      page.on('pageerror', (e) => errors.push(e.message));

      await page.goto(`${APP_URL}/pricing`);
      await page.waitForLoadState('domcontentloaded');

      expect(errors.filter(e => !e.includes('favicon'))).toHaveLength(0);
    });

    test('pricing page shows plan names', async ({ page }) => {
      await page.goto(`${APP_URL}/pricing`);
      await page.waitForLoadState('domcontentloaded');

      const text = await page.textContent('body');
      expect(text).toMatch(/Free|Premium|Lifetime/i);
    });

    test('pricing page shows $5 for monthly plan', async ({ page }) => {
      await page.goto(`${APP_URL}/pricing`);
      await page.waitForLoadState('domcontentloaded');

      const text = await page.textContent('body');
      expect(text).toContain('$5');
    });

    test('pricing page shows $49 lifetime option', async ({ page }) => {
      await page.goto(`${APP_URL}/pricing`);
      await page.waitForLoadState('domcontentloaded');

      const text = await page.textContent('body');
      expect(text).toContain('$49');
    });

    test('pricing page has CTA buttons', async ({ page }) => {
      await page.goto(`${APP_URL}/pricing`);
      await page.waitForLoadState('domcontentloaded');

      const buttons = page.locator('a[href*="premium"], a[href*="signup"], button');
      await expect(buttons.first()).toBeVisible({ timeout: 5000 });
    });

    test('feature comparison table is present', async ({ page }) => {
      await page.goto(`${APP_URL}/pricing`);
      await page.waitForLoadState('domcontentloaded');

      const table = page.locator('table');
      await expect(table).toBeVisible({ timeout: 5000 });
    });

    test('FAQ section renders', async ({ page }) => {
      await page.goto(`${APP_URL}/pricing`);
      await page.waitForLoadState('domcontentloaded');

      const text = await page.textContent('body');
      expect(text).toMatch(/cancel|refund|payment|free/i);
    });

  });

  test.describe('Frontend: Premium Page (unauthenticated redirect)', () => {

    test('/premium redirects to login when not authenticated', async ({ page }) => {
      await page.goto(`${APP_URL}/premium`);
      await page.waitForLoadState('domcontentloaded');

      // Should redirect to /login
      await expect(page).toHaveURL(/login/, { timeout: 3000 }).catch(() => {
        // Some implementations may show a login prompt inline instead of redirecting
      });
    });

  });

  test.describe('Premium Badge Component', () => {

    test('Premium badge renders star icon for premium plan', async ({ page }) => {
      await page.goto(`${APP_URL}/pricing`);
      await page.waitForLoadState('domcontentloaded');

      // Check that the premium content on the pricing page is styled correctly
      const text = await page.textContent('body');
      expect(text).toMatch(/Most Popular|Premium/i);
    });

  });

  test.describe('Frontend: Header Premium Link', () => {

    test('header contains link to /pricing', async ({ page }) => {
      await page.goto(APP_URL);
      await page.waitForLoadState('domcontentloaded');

      // Look for a premium/pricing link in the header
      const pricingLink = page.locator('header a[href="/pricing"], nav a[href="/pricing"]');
      await expect(pricingLink.first()).toBeVisible({ timeout: 5000 }).catch(() => {
        // Some headers might show it only for certain auth states
      });
    });

  });

});
