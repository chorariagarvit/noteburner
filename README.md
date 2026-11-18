# NoteBurner 🔥

**Version**: v1.14.0 - Internationalization & Premium Features  
**Released**: March 13, 2026

A secure one-time message encryption and decryption application. Messages can only be decrypted once with the correct password, then they're permanently deleted with no backups.

## Features

### Core Security
- 🔐 **Client-side AES-256-GCM encryption** - Messages encrypted in browser before transmission
- 🔥 **One-time access** - Automatic deletion after first successful decryption
- 🔑 **Password protection** - PBKDF2 key derivation for strong password-based encryption
- 📎 **Media support** - Encrypt and share files along with text messages (up to 100MB with rewards)
- ⏰ **Optional expiration** - Set time-based deletion for added security
- 🚫 **No backups** - Permanent deletion guarantee

### Platform Integrations (NEW in v1.7)
- 💬 **Slack / ⚡ Zapier / 🤖 Discord** - *Planned.* The message creators are switched off (HTTP 501) until they are rebuilt around client-side encryption; see [ROADMAP.md](./ROADMAP.md)
- 🔌 **Webhooks** - Real-time event notifications (created, viewed, burned)
- 🔑 **API Access** - Programmatic message creation with API keys
- 📚 **API Documentation** - Comprehensive guides and examples

### Internationalization (NEW in v1.13)
- 🌐 **6 Languages** - English, Spanish, French, German, Chinese (Simplified), Hindi
- 🔍 **Auto-detect** - Picks up browser language preference automatically
- 💾 **Persistent** - Language choice saved to localStorage across sessions
- 🗓️ **Locale-aware formatting** - Dates and numbers formatted per locale (`Intl` API)
- 🔄 **RTL-ready** - Text direction helper for future Arabic/Hebrew expansion

### Premium Features (NEW in v1.14)
- 💎 **Premium Plan ($5/month)** - 1GB uploads, unlimited custom URLs, 10k API calls/day
- 👑 **Lifetime Plan ($49)** - One-time payment, all premium features forever
- 📊 **Usage Dashboard** - Real-time usage bars vs plan limits
- 💳 **Stripe-ready** - Schema + endpoints wired for live Stripe integration
- 🏅 **PremiumBadge** - Amber/purple badge component for premium users

### User Authentication (v1.10)
- 👤 **Email/Password Signup** - User registration with email verification
- 🔐 **Secure Login** - Session-based authentication with remember me (7/30 day expiration)
- 🔑 **Password Reset** - Token-based reset flow with 1-hour expiration
- 🛡️ **Brute Force Protection** - Account lockout after 5 failed login attempts (15 min)
- 📧 **Email Verification** - Verification tokens ready for email integration
- 👥 **Multi-device Sessions** - Track and manage sessions across devices
- 🔄 **Session Management** - View active sessions, logout from all devices

### Enterprise Features (v1.9)
- 🏢 **Team Workspaces** - RBAC with Owner, Admin, Member, Viewer roles
- 🔑 **API Key Management** - Custom rate limits, usage tracking, revocation
- 🎨 **Custom Branding** - Logos, colors, white-label mode
- ⚖️ **GDPR Compliance** - Data retention policies, export, deletion
- 📊 **Team Analytics** - Usage stats, member activity tracking

### Security Enhancements (v1.8)
- 💪 **Password Strength Meter** - Real-time feedback, entropy calculation
- ⚙️ **Self-Destruct Options** - Max views, time limits and password attempts, all enforced by the server
- 🌍 **Country restriction & auto-burn** - Enforced using the country Cloudflare reports: only the sender's country may open the message, and it self-destructs on access from a blocked country, failed guesses from two or more countries within 10 minutes, or Tor
- 📊 **Audit Logs** - Privacy-friendly access tracking (country-level only)
- 🛡️ **Enhanced Security Headers** - CSP, HSTS, X-Frame-Options (A+ rating)
- 🚦 **Exact Rate Limiting** - Durable Object counters (parallel bursts cannot slip past the limit); optional Cloudflare Turnstile on the anonymous app-token endpoint
- 🔒 **Secrets at rest** - Creator tokens are stored hashed and 2FA secrets encrypted
- 🔏 **Authenticated API** - Every `/api/*` call needs a session, an API key or a signed app token
- 🔐 **2FA Support** - Optional TOTP for high-security messages

### Mobile & PWA (v1.6)
- 📱 **Progressive Web App** - Install on mobile, offline support, push notifications
- 🎨 **Mobile-first UX** - Bottom sheets, swipe gestures, touch-friendly buttons
- 📷 **Camera integration** - Capture photos/videos directly, instant encryption
- 🔗 **Share sheet** - Native mobile sharing to WhatsApp, Telegram, Signal, etc.
- 🔄 **Offline support** - Service worker caching, background sync
- 🔔 **Push notifications** - Optional updates for message activity

### UI/UX Polish (v1.6)
- 🎓 **Onboarding Flow** - Interactive 3-step tutorial for first-time users
- 📝 **Message Templates** - 6 pre-written templates (work, personal, security)
- ⌨️ **Keyboard Shortcuts** - 12 shortcuts for power users (Ctrl+Enter, Ctrl+K, etc.)
- ✨ **Custom Animations** - Fade-in, slide, shimmer, loading skeletons
- ♿ **Accessibility** - ARIA labels, keyboard navigation, semantic HTML

### Customization & Sharing
- 🌐 **Custom short URLs** - Choose memorable URLs for your messages
- 📱 **QR code generation** - Instant QR codes for easy mobile sharing
- ⏱️ **Countdown timers** - Visual countdown with urgency indicators
- 🔗 **Social media previews** - Open Graph tags for Twitter, Facebook, LinkedIn

### Gamification & Engagement
- 🏆 **Achievement system** - Unlock 8 achievements (First Burn, Speed Demon, File Master, etc.)
- 🔥 **Streak tracking** - Daily message creation streaks with fire emoji
- 📊 **Anonymous leaderboard** - Platform statistics without personal data
- 🎭 **Mystery mode** - Send completely anonymous messages

### Network Effects (v1.5)
- 👥 **Group messages** - Create 1-100 unique recipient links from one message
- 🎁 **Referral rewards** - Unlock perks by sharing (100MB files, custom expiration, badges)
- 🧩 **Browser extension** - Right-click encrypt on Chrome/Firefox
- 📧 **Invite friends** - Built-in social sharing with email/SMS templates

## Architecture

- **Backend**: Cloudflare Workers (serverless API)
- **Frontend**: React + Tailwind CSS on Cloudflare Pages
- **Media Storage**: Cloudflare R2 (encrypted files)
- **Database**: Cloudflare D1 (SQLite - metadata only)
- **Encryption**: Web Crypto API (AES-256-GCM + PBKDF2)

## Security Model

1. All encryption/decryption happens client-side in the browser
2. Password never leaves the client
3. Server only stores encrypted ciphertext
4. Unique token-based access control
5. Rate limiting to prevent brute force attacks
6. Automatic deletion after first access or expiration
7. One-time access is enforced by the server: a password-derived proof (the auth tag) is checked, attempts and views are counted atomically, and burning needs the proof or the creator token
8. Only country codes are logged, never IP addresses; audit logs are deleted after 30 days
9. Creator tokens are hashed and 2FA secrets encrypted in the database; a file ID alone cannot delete an attachment

## Project Structure

```
noteburner/
├── backend/          # Cloudflare Workers API (D1 migrations in backend/migrations)
├── frontend/         # React frontend application (PWA)
├── extension/        # Chrome / Firefox extension (context menu + popup, no content script)
├── e2e/ e2e-csp/     # Playwright suites (app, and CSP check on the production build)
├── docs/            # Documentation
└── package.json     # Root package configuration
```

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Cloudflare account
- Wrangler CLI

### Installation

```bash
# Install dependencies
npm run setup

# Apply all database migrations (local development)
cd backend
npx wrangler d1 migrations apply noteburner-db --local

# Start development servers
npm run dev:backend   # Backend on http://localhost:8787
npm run dev:frontend  # Frontend on http://localhost:5173
```

### Deployment

```bash
# Deploy backend to Cloudflare Workers
npm run deploy:backend

# Deploy frontend to Cloudflare Pages
npm run deploy:frontend
```

## Environment Setup

### Backend (Cloudflare Workers)

Create `backend/wrangler.toml`:

```toml
name = "noteburner-api"
main = "src/index.js"
compatibility_date = "2024-01-01"

[[ d1_databases ]]
binding = "DB"
database_name = "noteburner-db"
database_id = "your-database-id"

[[ r2_buckets ]]
binding = "MEDIA_BUCKET"
bucket_name = "noteburner-media"
```

Secrets (set with `wrangler secret put`, see [SETUP.md](./SETUP.md)):
`APP_TOKEN_SECRET` (required: the API refuses anonymous calls without it) and `TOTP_ENCRYPTION_KEY` (required for 2FA messages; set once, never change). Optional: `TURNSTILE_SECRET_KEY` / `TURNSTILE_SITE_KEY`, `STRIPE_WEBHOOK_SECRET`, `SLACK_SIGNING_SECRET`. The `RateLimiter` Durable Object is declared in `wrangler.toml`.

### Frontend

Create `frontend/.env`:

```
VITE_API_URL=https://noteburner-api.your-subdomain.workers.dev
```

## API Endpoints

All calls need a session (`X-Session-Token`), an API key (`X-API-Key`) or a signed app token (`X-App-Token`, from `POST /api/app-token`).

- `POST /api/messages` - Create encrypted message
- `GET /api/messages/:token` - Open a message (counts one view; needs `X-Auth-Tag` when password-protected)
- `DELETE /api/messages/:token` - Burn a message (creator token or auth tag)
- `POST /api/media` - Upload encrypted media file (creator only)
- `GET /api/media/:fileId` - Retrieve encrypted media file
- `DELETE /api/media/:fileId` - Confirm a download (only for files of an already-burned message)
- `/api/v1/*` - Public API for API-key holders (messages, stats, teams)
- `/api/teams`, `/api/compliance` - Team workspaces, stats, exports, GDPR tools

## Development

### Backend Development

```bash
cd backend
npm run dev
```

### Frontend Development

```bash
cd frontend
npm run dev
```

### Testing

NoteBurner includes comprehensive end-to-end tests using Playwright.

```bash
# Unit tests: backend, frontend, extension
npm test --workspace=backend && npm test --workspace=frontend && npm run test:extension

# CSP check against the production build
npm run test:csp

# All E2E tests (5 browser projects) or one project
npm run test:e2e
npx playwright test --project=chromium

# Interactive UI mode / report
npm run test:e2e:ui
npm run test:report
```

**Test coverage:**
- ✅ 22 Playwright spec files covering creation and viewing, security (API, UI, protections, concurrency, tenant isolation), accounts, teams, i18n, PWA, premium and integrations. Run on Chromium, Firefox, WebKit, Mobile Chrome and Mobile Safari; API-only tests run on Chromium.
- ✅ Backend unit tests (72), frontend (17), extension (24), CSP checks (24)
- Chromium: 471 passed, 8 skipped on the latest full run

CI (`.github/workflows/e2e-tests.yml`) runs the unit tests, build and dependency audit, the five-browser matrix, and the CSP job.

See [TEST_SUMMARY.md](./TEST_SUMMARY.md) for detailed testing documentation.

## License

MIT
