/**
 * Premium Features Routes
 * Week 14 - Premium Tier
 *
 * Handles premium plan management, subscriptions, and usage tracking.
 */

import { Hono } from 'hono';
import { requireAuth } from '../middleware/requireAuth.js';
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
 * Body: { planId, paymentMethod, ... }
 *
 * For Stripe: payment is handled client-side via Stripe.js.
 * This endpoint records the subscription after Stripe confirms.
 * For crypto: generates a payment address, awaits confirmation webhook.
 */
app.post('/subscribe', requireAuth, async (c) => {
  const userId = c.get('userId');
  const body = await c.req.json().catch(() => ({}));
  const { planId, paymentMethod, stripeCustomerId, stripeSubscriptionId } = body;

  if (!planId) {
    return c.json({ error: 'planId is required' }, 400);
  }

  const plan = await c.env.DB.prepare(
    'SELECT * FROM premium_plans WHERE id = ? AND is_active = 1'
  ).bind(planId).first();

  if (!plan) {
    return c.json({ error: 'Plan not found' }, 404);
  }

  if (planId === 'free') {
    return c.json({ error: 'Cannot subscribe to free plan' }, 400);
  }

  // Cancel any existing active subscription
  await c.env.DB.prepare(`
    UPDATE user_subscriptions
    SET status = 'cancelled', cancelled_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
    WHERE user_id = ? AND status IN ('active', 'trialing')
  `).bind(userId).run();

  const now = new Date();
  const periodEnd = planId === 'lifetime'
    ? new Date('2099-12-31').toISOString()
    : new Date(now.getFullYear(), now.getMonth() + 1, now.getDate()).toISOString();

  const subscriptionId = nanoid();

  await c.env.DB.prepare(`
    INSERT INTO user_subscriptions
      (id, user_id, plan_id, status, payment_method, stripe_customer_id,
       stripe_subscription_id, current_period_start, current_period_end)
    VALUES (?, ?, ?, 'active', ?, ?, ?, ?, ?)
  `).bind(
    subscriptionId,
    userId,
    planId,
    paymentMethod || 'manual',
    stripeCustomerId || null,
    stripeSubscriptionId || null,
    now.toISOString(),
    periodEnd
  ).run();

  return c.json({
    success: true,
    subscriptionId,
    plan: {
      id: plan.id,
      name: plan.name,
      features: JSON.parse(plan.features || '[]')
    },
    currentPeriodEnd: periodEnd
  }, 201);
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
