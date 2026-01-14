# NoteBurner 🔥

A secure one-time message encryption and decryption application. Messages can only be decrypted once with the correct password, then they're permanently deleted with no backups.

## Features

### Core Security
- 🔐 **Client-side AES-256-GCM encryption** - Messages encrypted in browser before transmission
- 🔥 **One-time access** - Automatic deletion after first successful decryption
- 🔑 **Password protection** - PBKDF2 key derivation for strong password-based encryption
- 📎 **Media support** - Encrypt and share files along with text messages (up to 100MB with rewards)
- ⏰ **Optional expiration** - Set time-based deletion for added security
- 🚫 **No backups** - Permanent deletion guarantee

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

### Network Effects (NEW in v1.5)
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

**Test Coverage (52 E2E tests):**
- ✅ Message creation (text, files, passwords, expiration)
- ✅ Message viewing and decryption
- ✅ One-time access enforcement
- ✅ Viral mechanics (confetti, CTAs, loading states)
- ✅ Custom URLs (validation, profanity filter, reserved slugs)
- ✅ QR code generation and download
- ✅ Countdown timers with urgency states
- ✅ Open Graph meta tags
- ✅ Gamification (achievements, streaks, leaderboard, mystery mode)

See [docs/E2E_TESTING.md](./docs/E2E_TESTING.md) and [docs/TEST_SUMMARY.md](./docs/TEST_SUMMARY.md) for detailed testing documentation.

## License

MIT
