/**
 * Premium Features Routes
 * Week 14 - Premium Tier
 *
 * Handles premium plan management, subscriptions, and usage tracking.
 */

import { Hono } from 'hono';
import { requireAuth } from '../middleware/requireAuth.js';
import { verifyStripeSignature } from '../utils/stripeSignature.js';
import { nanoid } from 'nanoid';

const app = new Hono();

// ─── Plans ──────────────────────────────────────────────────────────────────

/**
 * GET /api/premium/plans
 * Public - returns all active plans
 */
app.get('/plans', async (c) => {
  const plans = await c.env.DB.prepare(
    'SELECT * FROM premium_plans WHERE is_active = 1 ORDER BY price_monthly ASC'
  ).all();

  return c.json({
    plans: plans.results.map((p) => ({
      ...p,
      // Normalize cents → dollars for API consumers
      price_monthly: p.price_monthly / 100,
      price_lifetime: p.price_lifetime / 100,
      features: JSON.parse(p.features || '[]')
    }))
  });
});

// ─── Status (requires auth) ──────────────────────────────────────────────────

/**
 * GET /api/premium/status
 * Returns the authenticated user's current subscription status
 */
app.get('/status', requireAuth, async (c) => {
  const userId = c.get('userId');

  const subscription = await c.env.DB.prepare(`
    SELECT us.*, pp.name AS plan_name, pp.file_size_limit, pp.custom_urls_limit,
           pp.api_calls_limit, pp.features
    FROM user_subscriptions us
    JOIN premium_plans pp ON pp.id = us.plan_id
    WHERE us.user_id = ?
      AND us.status IN ('active', 'trialing')
    ORDER BY us.created_at DESC
    LIMIT 1
  `).bind(userId).first();

  if (!subscription) {
    // Return default free plan
    const freePlan = await c.env.DB.prepare(
      'SELECT * FROM premium_plans WHERE id = ?'
    ).bind('free').first();

    return c.json({
      isPremium: false,
      plan: {
        id: 'free',
        name: 'Free',
        features: JSON.parse(freePlan?.features || '[]'),
        file_size_limit: freePlan?.file_size_limit || 104857600,
        custom_urls_limit: freePlan?.custom_urls_limit || 5,
        api_calls_limit: freePlan?.api_calls_limit || 1000
      },
      subscription: {
        plan_id: 'free',
        status: 'active',
        payment_method: null,
        current_period_start: null,
        current_period_end: null,
        expires_at: null
      }
    });
  }

  return c.json({
    isPremium: subscription.plan_id !== 'free',
    plan: {
      id: subscription.plan_id,
      name: subscription.plan_name,
      features: JSON.parse(subscription.features || '[]'),
      file_size_limit: subscription.file_size_limit,
      custom_urls_limit: subscription.custom_urls_limit,
      api_calls_limit: subscription.api_calls_limit
    },
    subscription: {
      id: subscription.id,
      plan_id: subscription.plan_id,
      status: subscription.status,
      payment_method: subscription.payment_method,
      current_period_start: subscription.current_period_start,
      current_period_end: subscription.current_period_end
    }
  });
});

// ─── Subscribe ───────────────────────────────────────────────────────────────

/**
 * POST /api/premium/subscribe
 *
 * Paid plans are granted ONLY by the verified payment webhook below. This endpoint must never
 * create an active paid subscription from client-supplied data (that was a payment bypass).
 * Until a checkout flow is wired up it reports that payments are not enabled.
 */
app.post('/subscribe', requireAuth, async (c) => {
  return c.json({
    error: 'Online payments are not enabled yet. Your plan was not changed.',
    code: 'PAYMENTS_NOT_ENABLED'
  }, 501);
});

/**
 * POST /api/premium/webhook  (Stripe -> server, authenticated by Stripe-Signature HMAC)
 * Handles checkout.session.completed with metadata { user_id, plan_id } set by our checkout
 * session. Fails closed if STRIPE_WEBHOOK_SECRET is not configured.
 */
app.post('/webhook', async (c) => {
  const rawBody = await c.req.text();
  const valid = verifyStripeSignature({
    secret: c.env.STRIPE_WEBHOOK_SECRET,
    header: c.req.header('Stripe-Signature'),
    rawBody
  });
  if (!valid) {
    return c.json({ error: 'Invalid signature' }, 401);
  }

  let event;
  try { event = JSON.parse(rawBody); } catch { return c.json({ error: 'Invalid payload' }, 400); }

  if (event.type !== 'checkout.session.completed') {
    return c.json({ received: true });
  }

  const session = event.data?.object || {};
  const userId = session.metadata?.user_id;
  const planId = session.metadata?.plan_id;
  if (!userId || !['premium', 'lifetime'].includes(planId) || session.payment_status !== 'paid') {
    return c.json({ received: true, ignored: true });
  }

  const plan = await c.env.DB.prepare('SELECT id FROM premium_plans WHERE id = ? AND is_active = 1').bind(planId).first();
  const user = await c.env.DB.prepare('SELECT id FROM users WHERE id = ?').bind(userId).first();
  if (!plan || !user) {
    return c.json({ received: true, ignored: true });
  }

  await c.env.DB.prepare(`
    UPDATE user_subscriptions
    SET status = 'cancelled', cancelled_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
    WHERE user_id = ? AND status IN ('active', 'trialing')
  `).bind(userId).run();

  const now = new Date();
  const periodEnd = planId === 'lifetime'
    ? new Date('2099-12-31').toISOString()
    : new Date(now.getFullYear(), now.getMonth() + 1, now.getDate()).toISOString();

  await c.env.DB.prepare(`
    INSERT INTO user_subscriptions
      (id, user_id, plan_id, status, payment_method, stripe_customer_id,
       stripe_subscription_id, current_period_start, current_period_end)
    VALUES (?, ?, ?, 'active', 'stripe', ?, ?, ?, ?)
  `).bind(
    nanoid(), userId, planId,
    session.customer || null, session.subscription || null,
    now.toISOString(), periodEnd
  ).run();

  return c.json({ received: true });
});

// ─── Cancel ──────────────────────────────────────────────────────────────────

/**
 * DELETE /api/premium/cancel
 * Cancel the user's active subscription (remains active until period end)
 */
app.delete('/cancel', requireAuth, async (c) => {
  const userId = c.get('userId');

  const result = await c.env.DB.prepare(`
    UPDATE user_subscriptions
    SET status = 'cancelled', cancelled_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
    WHERE user_id = ? AND status = 'active' AND plan_id != 'lifetime'
  `).bind(userId).run();

  if (result.meta.changes === 0) {
    return c.json({ error: 'No active subscription found or lifetime plans cannot be cancelled' }, 404);
  }

  return c.json({ success: true, message: 'Subscription cancelled. Access continues until period end.' });
});

// ─── Usage ───────────────────────────────────────────────────────────────────

/**
 * GET /api/premium/usage
 * Returns the current month's usage for the authenticated user
 */
app.get('/usage', requireAuth, async (c) => {
  const userId = c.get('userId');
  const monthYear = new Date().toISOString().slice(0, 7); // 'YYYY-MM'

  const usage = await c.env.DB.prepare(
    'SELECT * FROM premium_usage WHERE user_id = ? AND month_year = ?'
  ).bind(userId, monthYear).first();

  // Get current plan limits
  const subscription = await c.env.DB.prepare(`
    SELECT pp.file_size_limit, pp.custom_urls_limit, pp.api_calls_limit, pp.name AS plan_name
    FROM user_subscriptions us
    JOIN premium_plans pp ON pp.id = us.plan_id
    WHERE us.user_id = ? AND us.status = 'active'
    ORDER BY us.created_at DESC LIMIT 1
  `).bind(userId).first();

  const limits = subscription || { file_size_limit: 104857600, custom_urls_limit: 5, api_calls_limit: 1000, plan_name: 'Free' };

  return c.json({
    month: monthYear,
    plan: limits.plan_name,
    usage: {
      messages_created: usage?.messages_created || 0,
      files_uploaded: usage?.files_uploaded || 0,
      storage_used: usage?.storage_used || 0,
      api_calls: usage?.api_calls || 0,
      custom_urls_created: usage?.custom_urls_created || 0
    },
    limits: {
      file_size_limit: limits.file_size_limit,
      custom_urls_limit: limits.custom_urls_limit,
      api_calls_limit: limits.api_calls_limit
    }
  });
});

export default app;
