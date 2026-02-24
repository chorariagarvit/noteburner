# NoteBurner 🔥

**Version**: v1.10.0 - User Authentication System  
**Released**: February 24, 2026

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
- 💬 **Slack Integration** - `/noteburner` command for instant secure messages
- ⚡ **Zapier Automation** - Create messages from 5,000+ apps
- 🤖 **Discord Bot** - Share secrets in Discord servers
- 🔌 **Webhooks** - Real-time event notifications (created, viewed, burned)
- 🔑 **API Access** - Programmatic message creation with API keys
- 📚 **API Documentation** - Comprehensive guides and examples

### User Authentication (NEW in v1.10)
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
- ⚙️ **Self-Destruct Options** - Max views, time limits, password attempts, geo restrictions
- 📊 **Audit Logs** - Privacy-friendly access tracking (country-level only)
- 🛡️ **Enhanced Security Headers** - CSP, HSTS, X-Frame-Options (A+ rating)
- 🚦 **Advanced Rate Limiting** - DDoS protection, per-endpoint limits
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

## Project Structure

```
noteburner/
├── backend/          # Cloudflare Workers API
├── frontend/         # React frontend application
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

# Run database migrations (local development)
cd backend
wrangler d1 execute noteburner-db --local --file=migrations/0006_add_group_messages.sql

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

### Frontend

Create `frontend/.env`:

```
VITE_API_URL=https://noteburner-api.your-subdomain.workers.dev
```

## API Endpoints

- `POST /api/messages` - Create encrypted message
- `GET /api/messages/:token` - Retrieve and delete message (one-time)
- `POST /api/media` - Upload encrypted media file
- `GET /api/media/:fileId` - Retrieve encrypted media file

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
# Run all E2E tests
npm run test:e2e

# Run tests with UI mode (interactive)
npm run test:e2e:ui

# View test report
npm run test:report
```

**Test Coverage (267 E2E tests):**
- ✅ Message creation & viewing (18 tests)
- ✅ Viral mechanics (8 tests)
- ✅ Custom URLs & branding (14 tests)
- ✅ Gamification (12 tests)
- ✅ Network effects (28 tests)
- ✅ UI/UX polish (29 tests)
- ✅ Mobile & PWA (26 tests)
- ✅ Platform integrations (15 tests)
- ✅ Security enhancements (32 tests)
- ✅ Enterprise features (35 tests)
- ✅ User authentication (25 tests)

See [TEST_SUMMARY.md](./TEST_SUMMARY.md) for detailed testing documentation.

## License

MIT
