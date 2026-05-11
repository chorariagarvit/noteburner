# NoteBurner - Claude Code Guide

## Project Overview

NoteBurner is a secure, one-time message encryption and decryption application. Messages are encrypted client-side using AES-256-GCM before being stored, and are permanently deleted after the first decryption (zero-knowledge, one-time access model).

- **Frontend**: React 18 + Vite, deployed to Cloudflare Pages
- **Backend**: Cloudflare Workers (serverless) with Hono framework
- **Database**: Cloudflare D1 (SQLite)
- **Storage**: Cloudflare R2 (encrypted file attachments)
- **Cache**: Cloudflare KV
- **E2E Tests**: Playwright (341 tests, 15 suites, 5 browsers)

## Development Commands

### Setup
```bash
npm run setup              # Install all dependencies (root + frontend + backend)
```

### Running locally
```bash
# Run these in two separate terminals:
npm run dev:backend        # API at http://localhost:8787
npm run dev:frontend       # UI at http://localhost:5173 (proxies API to :8787)
```

### Testing
```bash
npm run test:e2e           # Run all 341 Playwright tests (auto-starts servers)
npm run test:e2e:ui        # Interactive Playwright UI
npm run test:e2e:headed    # Run with visible browser
npm run test:e2e:debug     # Step-through debugger
npm run test:report        # Open HTML test report
```

### Deployment
```bash
npm run deploy:backend     # Deploy to Cloudflare Workers
npm run deploy:frontend    # Deploy to Cloudflare Pages
```

### Database (run from `backend/`)
```bash
npm run d1:migrations:apply    # Apply pending migrations
npm run d1:migrations:create   # Create a new migration file
npm run d1:create              # Create D1 database (first-time setup)
npm run tail                   # Stream live Worker logs
```

## Project Structure

```
noteburner/
├── backend/src/
│   ├── index.js              # Main Hono app and route registration
│   ├── routes/               # 14 route modules (messages, auth, media, etc.)
│   ├── middleware/           # Security, auth, rate limiting, locale
│   ├── config/cors.js
│   └── scheduled/cleanup.js  # Hourly cleanup job
├── frontend/src/
│   ├── App.jsx               # Root component with React Router
│   ├── pages/                # Page-level components
│   ├── components/           # 37 reusable components (create/, home/, enterprise/, etc.)
│   ├── contexts/             # React Context for global state
│   ├── hooks/                # Custom React hooks
│   ├── locales/              # i18n JSON files (en, es, fr, de, zh, hi)
│   └── utils/
│       ├── crypto.js         # Client-side AES-256-GCM encryption (Web Crypto API)
│       ├── analytics.js      # GTM / GA4 / Clarity setup
│       └── pwa.js            # Service worker and PWA install detection
├── e2e/                      # Playwright test suites
├── extension/                # Browser extension (Chrome + Firefox)
├── migrations/               # SQL migration files (0001–0011)
├── .github/workflows/
│   ├── e2e-tests.yml         # CI: runs tests on push/PR to main
│   └── semgrep.yml           # Security scanning (daily + PRs)
└── playwright.config.js      # Browser targets: Chrome, Firefox, Safari, Pixel 6, iPhone 12
```

## Architecture Notes

### Encryption Model
- All encryption/decryption is done **client-side** in `frontend/src/utils/crypto.js`
- Uses Web Crypto API: AES-256-GCM + PBKDF2 key derivation
- The server **never** sees plaintext or passwords
- One-time tokens are nanoid-based; messages are deleted on first read

### API Proxy (local dev)
The Vite dev server (`vite.config.js`) proxies `^/api/*` → `http://localhost:8787`. No CORS configuration is needed locally.

### Cloudflare Workers Environment
- Workers use `wrangler dev --port 8787 --local` for local dev (D1 runs in local SQLite mode)
- Scheduled cleanup runs every hour (`0 * * * *`) via `scheduled/cleanup.js`
- Environment variables are set in `wrangler.toml` and via Cloudflare dashboard secrets

### Rate Limiting
- Per-endpoint rate limiting is in `middleware/rateLimit.js`
- DDoS protection and brute-force lockout (5 failed attempts → 15-min lockout) in `middleware/security.js`
- Development limits: 100 req/60s; Production: 200 req/60s

## CI/CD

- **Push to `main` or PR**: Runs all 341 E2E tests (Chromium only in CI) + Semgrep security scan
- **Test artifacts**: HTML report and results uploaded for 30 days
- **Deployment is manual**: after CI passes, deploy with `npm run deploy:*`
- Semgrep requires `SEMGREP_APP_TOKEN` secret in GitHub repo settings

## Key Configuration Files

| File | Purpose |
|------|---------|
| `backend/wrangler.toml` | Cloudflare bindings (D1, R2, KV, Email), env vars |
| `frontend/vite.config.js` | Dev server, API proxy |
| `frontend/tailwind.config.js` | Tailwind v3 theme |
| `playwright.config.js` | Test browsers, parallelism (2 workers), retries |
| `.github/workflows/e2e-tests.yml` | CI pipeline |

## Coding Conventions

### Backend
- File names: `kebab-case.js`
- All DB queries use prepared statements with `.bind()` — never string interpolation
- Middleware order in `index.js`: Security → CORS → Rate Limiting → Feature middleware
- Auth: `X-Session-Token` header for session routes; Bearer API key for `/api/v1`
- KV cache-aside pattern: check KV first, fall back to D1 on miss (see `utils/cache.js`)
- Email unavailable in local dev — logs `[DEV] Would send email to ...` instead

### Frontend
- Component files: `PascalCase.jsx`; hooks: `useCamelCase.js`; utils: `camelCase.js`
- All backend calls go through `frontend/src/utils/api.js` — don't fetch directly
- All encryption/decryption stays in `frontend/src/utils/crypto.js` (Web Crypto API)
- Global state via React Context; feature-scoped state via custom hooks
- Tailwind utility classes for all styling; dark mode via CSS class toggle + localStorage

### Security — do not weaken
- PBKDF2 with 300k iterations for key derivation; AES-256-GCM for message encryption
- One-time access enforced server-side: message marked accessed, excluded from future queries
- bcryptjs for server-side password hashing
- Security headers (CSP, HSTS, X-Frame-Options) set in `middleware/security.js`
- Never skip rate limiting or brute-force lockout logic (5 fails → 15-min lockout)

## Important Context

- **v1.14.0** (released March 2026) is current. Recent additions: premium tiers ($5/month, $49 lifetime), Stripe-ready schema, usage dashboard.
- **6 locales**: en, es, fr, de, zh, hi — translations live in `frontend/src/locales/`
- **Enterprise features**: Team workspaces with RBAC, custom branding, GDPR compliance, audit logs, API keys — all in dedicated route modules
- **Public API**: Available at `/api/v1/*` with API key auth (`api-v1.js`)
- **Browser extension**: Right-click context menu encryption for Chrome and Firefox (`extension/`)
- **PWA**: Service worker, offline support, push notifications, camera integration
- **File uploads**: Chunked upload for files >100MB via `frontend/src/utils/chunkedUpload.js`; max 100MB free / 1GB premium
