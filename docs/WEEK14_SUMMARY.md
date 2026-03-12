# Week 14 — Premium Features

**Branch**: `feature/week-14-premium` → `main`  
**Target**: Mar 16, 2026  
**Status**: ✅ Complete  
**Released**: Mar 16, 2026

## Overview

Week 14 introduces NoteBurner's monetization layer: a tiered premium subscription system with Free, Premium ($5/month), and Lifetime ($49 one-time) plans. The system includes a full-stack implementation — database-backed subscription records, a backend REST API, a polished pricing page, an authenticated premium management dashboard, and a reusable `PremiumBadge` component.

The architecture is Stripe-ready: the database schema stores `stripe_customer_id` and `stripe_subscription_id` columns, and the subscribe endpoint accepts `stripePaymentIntentId` for when live payments are wired up. Crypto payments (Bitcoin/Ethereum) are designed as a future extension.

---

## Features Implemented

### 1. ✅ Database Migration

**File Created:** `backend/migrations/0012_premium_features.sql`

**New Tables:**

#### `premium_plans`
| Column | Type | Description |
|---|---|---|
| `id` | TEXT PK | `'free'`, `'premium'`, `'lifetime'` |
| `name` | TEXT | Display name |
| `price_monthly` | REAL | Monthly price in USD |
| `price_lifetime` | REAL | One-time lifetime price |
| `file_size_limit` | INTEGER | Max file upload in bytes |
| `custom_urls_limit` | INTEGER | Custom URL slots (-1 = unlimited) |
| `api_calls_limit` | INTEGER | Daily API calls (-1 = unlimited) |
| `features` | TEXT | JSON array of feature strings |
| `is_active` | INTEGER | Soft disable flag |

**Seed data:**
| Plan | Monthly | Lifetime | File Limit | Custom URLs | API Calls |
|---|---|---|---|---|---|
| Free | $0 | — | 100MB | 5 | 1,000/day |
| Premium | $5 | — | 1GB | Unlimited | 10,000/day |
| Lifetime | — | $49 | 1GB | Unlimited | Unlimited |

#### `user_subscriptions`
| Column | Type | Description |
|---|---|---|
| `id` | TEXT PK | UUID |
| `user_id` | TEXT FK | References `users.id` |
| `plan_id` | TEXT FK | References `premium_plans.id` |
| `status` | TEXT | `active`, `cancelled`, `expired`, `pending` |
| `payment_method` | TEXT | `stripe`, `crypto`, `free` |
| `stripe_customer_id` | TEXT | Stripe customer ID (nullable) |
| `stripe_subscription_id` | TEXT | Stripe subscription ID (nullable) |
| `btc_address` | TEXT | Bitcoin payment address (nullable) |
| `current_period_start` | TEXT | ISO date string |
| `current_period_end` | TEXT | ISO date string |
| `created_at` | TEXT | Row creation timestamp |
| `updated_at` | TEXT | Last update timestamp |

#### `premium_usage`
| Column | Type | Description |
|---|---|---|
| `user_id` | TEXT FK | References `users.id` |
| `month_year` | TEXT | `YYYY-MM` format |
| `messages_created` | INTEGER | Messages created this month |
| `files_uploaded` | INTEGER | Files uploaded this month |
| `storage_used` | INTEGER | Bytes stored this month |
| `api_calls` | INTEGER | API calls made today |
| PK | composite | `(user_id, month_year)` |

---

### 2. ✅ Backend Premium API

**File Created:** `backend/src/routes/premium.js`

All endpoints are prefixed `/api/premium`.

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/plans` | — | List all active plans with features |
| `GET` | `/status` | ✅ | Current user's plan + subscription details |
| `POST` | `/subscribe` | ✅ | Subscribe to a plan |
| `DELETE` | `/cancel` | ✅ | Cancel active subscription |
| `GET` | `/usage` | ✅ | This month's usage vs limits |

#### `GET /api/premium/plans`

Response:
```json
{
  "plans": [
    {
      "id": "free",
      "name": "Free",
      "price_monthly": 0,
      "price_lifetime": null,
      "file_size_limit": 104857600,
      "custom_urls_limit": 5,
      "api_calls_limit": 1000,
      "features": ["AES-256-GCM encryption", "..."],
      "is_active": 1
    },
    { "id": "premium", ... },
    { "id": "lifetime", ... }
  ]
}
```

#### `GET /api/premium/status` (requires JWT)

Response:
```json
{
  "plan": { ...planObject },
  "subscription": {
    "id": "uuid",
    "plan_id": "free",
    "status": "active",
    "current_period_end": null
  }
}
```

#### `POST /api/premium/subscribe` (requires JWT)

Request body:
```json
{
  "planId": "premium",
  "paymentMethod": "stripe",
  "stripeCustomerId": "cus_xxx",
  "stripeSubscriptionId": "sub_xxx"
}
```

Validation:
- `planId` must match an active plan in `premium_plans`.
- Creating a `free` subscription de-activates any existing paid subscription.

#### `DELETE /api/premium/cancel` (requires JWT)

Sets `status = 'cancelled'` on the active subscription. Returns 404 if none found.

#### `GET /api/premium/usage` (requires JWT)

Response:
```json
{
  "usage": {
    "month_year": "2026-03",
    "messages_created": 14,
    "files_uploaded": 2,
    "storage_used": 5242880,
    "api_calls": 43,
    "limits": {
      "messages_per_month": 1000,
      "storage_limit": 104857600,
      "api_calls_per_day": 1000
    }
  }
}
```

**File Modified:** `backend/src/index.js`
```js
import premiumRouter from './routes/premium.js';
app.route('/api/premium', premiumRouter);
```
API version bumped: `1.11.0` → `1.12.0`.  
`features` array: `[..., 'i18n', 'premium']`.

---

### 3. ✅ Pricing Page (Frontend)

**File Created:** `frontend/src/pages/PricingPage.jsx`

**Sections:**
1. **Hero header** — "Simple, Transparent Pricing" with Week 14 badge.
2. **Three plan cards** — Free / Premium / Lifetime with highlighted "Most Popular" band on Premium.
   - Feature list with check marks per plan.
   - Color-coded: gray / amber / purple.
   - Direct CTA buttons linking to `/premium?plan=<id>` or `/signup`.
3. **Feature comparison table** — Side-by-side matrix of 9 features across all three plans.
4. **FAQ section** — 6 cards answering common questions (cancellation, refunds, payment, data safety).
5. **CTA band** — Gradient amber call-to-action linking to Premium subscription.

**Integration:**
- Uses `useI18n` hook (ready for full translation pass).
- Uses `useAuth` to adjust CTA links for authenticated vs unauthenticated users.
- Registered route in `App.jsx`: `<Route path="/pricing" element={<PricingPage />} />`.

---

### 4. ✅ Premium Management Page (Frontend)

**File Created:** `frontend/src/pages/PremiumPage.jsx`

**Features:**
- **Auth guard** — Unauthenticated users are immediately redirected to `/login?redirect=/premium`.
- **Current plan card** — Shows plan icon, name, status badge, and renewal date.
- **Plan limits grid** — File limit / Custom URLs / API calls at a glance.
- **Usage bars** — Animated progress bars for messages, storage, and API calls with color transitions (green → amber → red near limit).
- **Upgrade panel** (shown only to free users) — Payment method toggle (Stripe / Crypto), subscribe buttons for monthly and lifetime.
- **Cancel subscription** — Soft-cancel with confirmation dialog.
- **Success / Error banners** — Inline feedback after subscribe/cancel actions.

**State management:**
- Fetches `GET /api/premium/status` and `GET /api/premium/usage` on mount.
- `sessionStorage` caching via `frontend/src/utils/premium.js`.

---

### 5. ✅ PremiumBadge Component

**File Created:** `frontend/src/components/PremiumBadge.jsx`

**Props:**
| Prop | Type | Default | Description |
|---|---|---|---|
| `plan` | string | `'premium'` | `'premium'` or `'lifetime'` |
| `size` | string | `'sm'` | `'xs'`, `'sm'`, `'md'` |
| `showLabel` | bool | `false` | Show text label alongside icon |

**Visual:**
- Premium: amber gradient with `Star` icon
- Lifetime: purple gradient with `Crown` icon
- Returns `null` for `plan === 'free'`

**Usage:**
```jsx
<PremiumBadge plan="premium" size="sm" />
<PremiumBadge plan="lifetime" showLabel />
```

---

### 6. ✅ Premium Utility — `frontend/src/utils/premium.js`

| Function | Description |
|---|---|
| `getPremiumStatus(token, opts)` | Fetch & cache premium status (5-min `sessionStorage` TTL). `force: true` bypasses cache. |
| `clearPremiumCache()` | Evict cached status on subscribe/cancel. |
| `isPremium(status)` | `true` if active premium or lifetime plan. |
| `getFileSizeLimit(status)` | Returns bytes limit from plan (default 100MB). |
| `getCustomUrlsLimit(status)` | Custom URL limit from plan (default 5). |
| `getPlanName(status)` | Human-readable plan name. |

---

## Routes Summary

### New Frontend Routes
| Path | Component | Auth |
|---|---|---|
| `/pricing` | `PricingPage` | Public |
| `/premium` | `PremiumPage` | Requires auth (redirects) |

### New Backend Routes
| Path | Method | Auth |
|---|---|---|
| `/api/premium/plans` | GET | Public |
| `/api/premium/status` | GET | JWT |
| `/api/premium/subscribe` | POST | JWT |
| `/api/premium/cancel` | DELETE | JWT |
| `/api/premium/usage` | GET | JWT |

---

## Testing

**File Created:** `e2e/week14.spec.js`

Test suites:
1. **GET /api/premium/plans** — Public access, 3+ plans, required fields, free=$0, premium=$5, lifetime=$49, features JSON.
2. **GET /api/premium/status** — 401 without auth, returns free plan for new users, includes file_size_limit.
3. **POST /api/premium/subscribe** — 401 without auth, rejects invalid planId, accepts premium plan.
4. **GET /api/premium/usage** — 401 without auth, returns usage object with limits.
5. **DELETE /api/premium/cancel** — 401 without auth, handles no-subscription case.
6. **Frontend: Pricing Page** — No crashes, plan names, $5/$49 visible, CTA buttons, comparison table, FAQ.
7. **Frontend: Premium Page** — Redirects to login when unauthenticated.
8. **Premium Badge** — "Most Popular" / Premium styling present.
9. **Header Premium Link** — `/pricing` link in header.

---

## Payment Integration Notes

### Stripe (Active — sandbox)
The subscribe endpoint accepts `stripeCustomerId` and `stripeSubscriptionId`. To wire up live payments:
1. Add `STRIPE_SECRET_KEY` to Cloudflare Worker secrets.
2. Create a Stripe Checkout session server-side and return the `sessionUrl`.
3. Use Stripe webhooks (`/api/webhooks/stripe`) to update `user_subscriptions.status` on payment events.

### Crypto (Planned)
- Store wallet address in `user_subscriptions.btc_address`.
- Use a service like BTCPay Server or Coinbase Commerce for payment verification.
- Webhook updates subscription status on confirmed payment.

---

## Architecture Diagram

```
Browser                         Cloudflare Worker               D1 Database
──────                         ─────────────────               ───────────
/pricing  ──────────────────►  (static, no API call)
                               (plan data from GET /plans)

/premium  ──► useEffect  ───►  GET /api/premium/status   ───►  user_subscriptions
                      │       GET /api/premium/usage    ───►  premium_usage
                      │
              subscribe ────►  POST /api/premium/subscribe ──►  user_subscriptions
              cancel   ────►  DELETE /api/premium/cancel  ──►  user_subscriptions

Header ──► useAuth  ──────────► (badge from sessionStorage)
        ► PremiumBadge(plan)
```

---

## Acceptance Criteria Checklist

| Criterion | Status |
|---|---|
| Premium tier ($5/month) | ✅ |
| Lifetime plan ($49 one-time) | ✅ |
| Database schema (plans, subscriptions, usage) | ✅ |
| Backend API: plans, status, subscribe, cancel, usage | ✅ |
| Pricing page with 3 tiers | ✅ |
| Feature comparison table | ✅ |
| PremiumPage (authenticated dashboard) | ✅ |
| Usage bars with limits | ✅ |
| PremiumBadge component | ✅ |
| Premium utility (frontend) | ✅ |
| Auth guard on /premium | ✅ |
| Stripe-ready schema & endpoint | ✅ |
| Crypto payment placeholder | ✅ |
| Header Premium link | ✅ |
| FAQ section | ✅ |
| E2E tests | ✅ (`e2e/week14.spec.js`) |
| Documentation | ✅ (this file) |
