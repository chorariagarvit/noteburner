# NoteBurner - Agent Guide

> Canonical instructions for AI coding agents (Codex, Cursor, Copilot, Claude Code, Gemini CLI, etc.).
> `CLAUDE.md` and `GEMINI.md` import this file — **edit this file, not the copies.**

## Project Overview

NoteBurner is a secure, one-time message encryption and decryption application. Messages are encrypted client-side using AES-256-GCM before being stored, and are destroyed after the first successful read (zero-knowledge, one-time access model).

- **Frontend**: React 19 + Vite 8 + Tailwind, deployed to Cloudflare Pages
- **Backend**: Cloudflare Workers (serverless) with Hono
- **Database**: Cloudflare D1 (SQLite) — migrations in `backend/migrations/` (0001–0013)
- **Storage**: Cloudflare R2 (encrypted file attachments)
- **Cache / counters**: Cloudflare KV
- **Tests**: Playwright e2e (17 spec files, 408 tests per browser × 5 browser projects), backend unit tests (`backend/test`, 37), frontend unit tests (`frontend/test`, 5)

## Development Commands

### Setup
```bash
npm run setup              # Install all dependencies (root + frontend + backend)
```

### Running locally
```bash
# Run these in two separate terminals:
npm run dev:backend        # API at http://localhost:8787 (uses dev APP_TOKEN_SECRET)
npm run dev:frontend       # UI at http://localhost:5173 (proxies API to :8787)
```

### Testing
```bash
cd backend && npm test     # Unit tests (node --test): totp, app token, kv counter, rate limiters, signatures, cors, email escaping
cd frontend && npm test    # Unit tests: auth tag / crypto, analytics path sanitising
npm run test:e2e           # Playwright, all configured browsers (auto-starts servers + applies local migrations)
npx playwright test --project=chromium   # one browser only
npm run test:e2e:ui        # Interactive Playwright UI
npm run test:report        # Open HTML test report
```
`e2e/security-api.spec.js` (40 API tests, Chromium only) and `e2e/security-ui.spec.js` cover the server-enforced security behaviour; `e2e/fixtures.js` gives every test its own client IP (rate-limit counters persist in local KV, so don't reuse fixed IPs). Tests that need a paid plan flip it in the local D1 (`upgradeTeam` in week10).
Browsers: chromium, firefox, webkit, Mobile Chrome (Pixel 6), Mobile Safari (iPhone 12). Install once with `npx playwright install`.

### Deployment (manual — see "Deploying" below before running)
```bash
npm run deploy:backend     # Deploy Worker
npm run deploy:frontend    # Deploy Pages
```

### Database (run from `backend/`)
```bash
npm run d1:migrations:apply    # Apply pending migrations (remote)
npm run d1:migrations:create   # Create a new migration file
npm run tail                   # Stream live Worker logs
```

## Project Structure

```
noteburner/
├── backend/
│   ├── src/
│   │   ├── index.js              # Hono app: middleware order + route registration
│   │   ├── routes/               # 14 modules (messages, auth, media, premium, teams, api-v1, app-token, ...)
│   │   ├── middleware/           # apiGate, requireAuth, security, rateLimit, locale
│   │   ├── utils/                # totp, appToken, session, kvCounter, signatures, messageHelpers, ...
│   │   ├── config/cors.js
│   │   └── scheduled/cleanup.js  # Hourly cleanup + housekeeping
│   ├── migrations/               # D1 SQL migrations (0001–0013)
│   └── test/                     # Node unit tests
├── frontend/
│   ├── public/                   # sw.js, manifest, _headers (CSP etc. for Pages)
│   └── src/
│       ├── pages/ components/ contexts/ hooks/ locales/ (en es fr de zh hi)
│       └── utils/
│           ├── crypto.js         # AES-256-GCM + PBKDF2 + auth tag (Web Crypto)
│           ├── api.js            # Message/media API calls
│           ├── apiBase.js        # API_BASE + automatic X-App-Token fetch wrapper
│           └── session.js        # getSessionToken / getAuthHeaders
├── e2e/                          # Playwright suites
├── extension/                    # Chrome + Firefox extension (own manifests, no npm deps)
├── .github/workflows/            # e2e-tests.yml (unit job + 5-browser e2e matrix), semgrep.yml
├── ROADMAP.md  CHANGELOG.md      # Status/next steps vs. release history
├── CODE_REVIEW_AUDIT*.md         # Security audit reports + remediation status
└── playwright.config.js
```

## Architecture Notes

### Encryption and one-time access (server-enforced)
- Encryption/decryption is **client-side** (`frontend/src/utils/crypto.js`): AES-256-GCM, key from PBKDF2-SHA256 (300k iterations). The server never sees plaintext or the password.
- The client also derives a separate **auth tag** (`deriveAuthTag`, domain-separated PBKDF2 over `salt || "nb-auth-v1"`). The server stores only `SHA-256(tag)` (`messages.auth_hash`).
- `GET /api/messages/:id/meta` returns salt/expiry/protections **without ciphertext**.
- `GET /api/messages/:id` requires `X-Auth-Tag`: wrong tags count atomically against `max_password_attempts` and burn the message at the limit; a correct tag atomically claims the single view (`view_count < max_views`), so ciphertext is released once.
- `DELETE /api/messages/:id` (burn) needs the creator token **or** the auth tag (and the TOTP proof for 2FA messages). Messages without `auth_hash` (legacy, group messages) skip the tag check but still get the view limit.
- **2FA (TOTP)** is enforced by the server: `POST /:id/verify-totp` returns an HMAC proof (`X-TOTP-Proof`, 10 min) required by GET/DELETE; guesses are capped atomically per message (`totp_attempts`).
- `totp_secret` and `auth_hash` are excluded from default queries; read them only via `getMessageByIdentifier(db, id, { includeSecrets: true })`.
- Frontend changes to `crypto.js` must stay in sync with `extension/crypto.js` (`deriveAuthTag`).

### API authentication (apiGate)
Every `/api/*` request must carry one of: a user session (`Authorization: Bearer` / `X-Session-Token`), an API key (`X-API-Key`), or a signed anonymous **app token** (`X-App-Token`, from `POST /api/app-token`, 1 h, rate-limited). Public allowlist: app-token, login/signup/refresh/verify-email/forgot/reset, `/api/health` and `/ping`; Slack and Stripe webhooks authenticate by signature. It **fails closed** (503) if `APP_TOKEN_SECRET` is unset. The app token is anti-automation only, not an authorization mechanism. The frontend attaches it automatically (`installApiAuth` in `apiBase.js`); the extension fetches one itself; Playwright signs one in `playwright.config.js`.

### Sessions, API keys, tokens
- Session tokens, API keys, verification and reset tokens are stored **hashed** (SHA-256); raw values only exist at the client / once at creation. Sessions are validated against D1 on every request (no KV session cache).
- `/api/auth/sessions` returns opaque ids; revoke by id.
- API keys are created only via session-authenticated `POST /api/api-keys`.

### Rate limiting
- `utils/kvCounter.js` implements a fixed-window counter whose KV expiry is preserved (a plain KV `put` without a TTL removes the expiry — don't do that). Limiters take **seconds** (`rateLimitMiddleware(limit, windowSeconds)`).
- Dev server uses higher limits (`RATE_LIMIT_REQUESTS` var).

### API proxy (local dev)
The Vite dev server proxies `/api/*` → `http://localhost:8787`. `API_BASE` is `VITE_API_URL || ''` (same-origin in production, where Worker routes serve `/api/*`).

### Cloudflare Workers environment
- Local: `wrangler dev --port 8787 --local` (D1 as local SQLite). Hourly cron in `scheduled/cleanup.js` (D1 deletes are chunked to ≤90 bound params).
- **Secrets** (never in the repo): `APP_TOKEN_SECRET` (required), `SLACK_SIGNING_SECRET` (Slack), `STRIPE_WEBHOOK_SECRET` (billing), `TOTP_ENCRYPTION_KEY`.

## Deploying

Deploy is manual. Order matters because the frontend now depends on new endpoints:
1. `openssl rand -hex 32 | wrangler secret put APP_TOKEN_SECRET --env production` (once)
2. `npm run d1:migrations:apply` (from `backend/`)
3. `npm run deploy:backend`, then `npm run deploy:frontend` / push `main`
4. Smoke test: create a message, open the link, decrypt, confirm it's gone.

## CI

`.github/workflows/e2e-tests.yml` has two jobs: **unit** (backend + frontend `npm test`, frontend build, `npm audit` — the backend runtime audit blocks on high+, the whole-tree audit is informational because Vite's glob helpers currently have an unfixable advisory) and **e2e**, a matrix with one job per Playwright project (chromium, firefox, webkit, Mobile Chrome, Mobile Safari) that installs only the browser it needs. A new Playwright project must be added to that matrix. Reproduce CI locally with `CI=true npx playwright test --project=<name>`.

## Key Configuration Files

| File | Purpose |
|------|---------|
| `backend/wrangler.toml` | Bindings (D1, R2, KV, Email), vars, routes, cron |
| `frontend/vite.config.js` | Dev server, API proxy |
| `frontend/public/_headers` | CSP, frame-ancestors, HSTS for the SPA (Pages) |
| `playwright.config.js` | 5 browser projects, 2 workers, test app token |
| `.github/workflows/e2e-tests.yml` | CI: unit tests + build + audit, then one e2e job per browser project (parallel) |
| `SETUP.md` | First-time setup and required secrets |

## Coding Conventions

### Backend
- File names: `kebab-case.js`. All DB queries use prepared statements with `.bind()` — never string interpolation of values.
- Middleware order in `index.js`: security headers → locale → CORS → **apiGate** → rate limiting → routes.
- Use atomic SQL (`UPDATE ... RETURNING`) for counters and one-time state; never read-modify-write.
- Return generic error messages to clients; log details server-side.
- New KV/D1 counters must keep their expiry (see `kvCounter.js`).
- Email is unavailable in local dev; it logs instead of sending. Escape all user data interpolated into email HTML (`esc()` in `emailTemplates.js`).

### Frontend
- Component files `PascalCase.jsx`; hooks `useCamelCase.js`; utils `camelCase.js`.
- Backend calls go through `utils/api.js` (messages/media) or use `API_BASE` and `getAuthHeaders()` — never hard-code hosts or read tokens from storage directly.
- All crypto stays in `utils/crypto.js`. Never put plaintext, passwords or capability URLs in query strings or analytics.
- Tailwind utilities for styling; dark mode via class toggle — always provide both light and `dark:` variants.

### Security — do not weaken
- PBKDF2 300k iterations; AES-256-GCM; bcryptjs for passwords; CSPRNG (`crypto.getRandomValues`) for every secret/token — never `Math.random`.
- Server-side enforcement of one-time access, attempt limits and 2FA (above) — the client must never be the only gate.
- apiGate must stay fail-closed; do not add routes to its public allowlist without a signature/credential check.
- Webhook handlers must verify signatures and fail closed when the secret is missing.
- `extension.pem` / `*.crx` must never be committed (the old key is in history and must be rotated).

## Code navigation: use graphify

A knowledge graph of this repo (code, docs, migrations) lives in `graphify-out/` (git-ignored, regenerated locally).
- For questions about the codebase, run `graphify query "<question>"` **before** grepping or reading files; use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for a single concept. Read raw files only for the lines the graph points to.
- After modifying code, run `graphify update .` (AST-only, no LLM, no API cost).
- Treat the graph as an index, not truth: it also contains docs such as the audit reports, and some of them describe issues that are since fixed. Confirm in the source before relying on a finding.
- Setup (per machine): `python3 -m venv ~/.local/share/graphify-venv && ~/.local/share/graphify-venv/bin/pip install "graphifyy[sql]"`, link `graphify` into `~/.local/bin`, then in the repo `graphify install --project && graphify claude install && graphify update .`. The package name has a double "y" (`graphifyy`); other `graphify*` packages are unaffiliated.
- `.claude/settings.json` hooks embed an absolute path to the executable, so they are machine-specific; don't commit them.

## Working agreements for agents

- Before changing code, read the relevant section above; keep changes small and match existing style.
- After backend changes run `cd backend && npm test`; after frontend changes run `cd frontend && npm run build`; for behaviour changes run the relevant Playwright spec (`npx playwright test e2e/<file> --project=chromium`).
- Never commit or push unless asked. Never push `main` without confirming the deploy order (see "Deploying").
- Never print, log or commit secrets, tokens, `.env*` files, `*.pem` or `*.crx`.
- Don't kill processes you didn't start (other `wrangler dev`/`workerd` servers may be running on other ports).
- Database changes need a new numbered migration in `backend/migrations/`; never edit an applied migration.
- When behaviour changes, update `CHANGELOG.md` (what shipped) and, if status/next steps change, `ROADMAP.md`.

## Important Context

- **Version**: v1.14.0 in `package.json`; the security-hardening work after it is on `main` (unreleased/unversioned). See `CHANGELOG.md` and `ROADMAP.md` (week→version map).
- **Audits**: `CODE_REVIEW_AUDIT.md` and `CODE_REVIEW_AUDIT_OPUS.md` list findings and their remediation status, including known open items (signup email enumeration, plaintext creator tokens/TOTP secrets, team exports not populated, PWA icons missing).
- **Disabled**: Slack/Zapier/Discord message creators (return 501), `/subscribe` (payments are webhook-only, no checkout flow yet).
- **Group messages and legacy messages** have no auth tag.
- **Locales**: en, es, fr, de, zh, hi in `frontend/src/locales/`.
- **Uploads**: creator token required; chunked upload for large files (`chunkedUpload.js`), 100 MB free / 1 GB premium (UI-level), 2 GB hard cap server-side.
