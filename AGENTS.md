# NoteBurner - Agent Guide

> Canonical instructions for AI coding agents (Codex, Cursor, Copilot, Claude Code, Gemini CLI, etc.).
> `CLAUDE.md` and `GEMINI.md` import this file — **edit this file, not the copies.**

## Project Overview

NoteBurner is a secure, one-time message encryption and decryption application. Messages are encrypted client-side using AES-256-GCM before being stored, and are destroyed after the first successful read (zero-knowledge, one-time access model).

- **Frontend**: React 19 + Vite 8 + Tailwind, deployed to Cloudflare Pages
- **Backend**: Cloudflare Workers (serverless) with Hono
- **Database**: Cloudflare D1 (SQLite) — migrations in `backend/migrations/` (0001–0014)
- **Storage**: Cloudflare R2 (encrypted file attachments)
- **Cache / counters**: Cloudflare KV
- **Tests**: Playwright end-to-end on five browsers (Chromium, Firefox, WebKit, Mobile Chrome, Mobile Safari; the API-only specs run on Chromium), backend / frontend / extension unit tests, production-build CSP and theme checks (`e2e-csp`), an axe accessibility scan of every page in light and dark mode, Google's Modern Web Guidance scan and a release/version check (`scripts/`). Details: `docs/E2E_TESTING.md`.

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
cd backend && npm test     # Unit tests (node --test): totp, app token, kv counter, rate limiters, signatures, cors, email escaping, secrets
cd frontend && npm test    # Unit tests: crypto / auth tag, theme logic, i18n key parity, large-file upload retry, service-worker version, PWA assets
npm run test:extension     # Extension: crypto parity with the web app, request contract vs a mock API, manifest/source consistency
npm run test:csp           # Production build with the real security headers: CSP, theme, no-JavaScript (e2e-csp/, own config)
npm run test:modern-web    # Google's Modern Web Guidance scan (pinned, via npx) for legacy web patterns; also runs in CI
npm run test:release       # Version numbers, the changelog, README and ROADMAP agree (scripts/versions.test.mjs)
npm run test:e2e           # Playwright, all five browsers (auto-starts servers + applies local migrations)
npx playwright test --project=chromium   # one browser only
npm run test:e2e:ui        # Interactive Playwright UI
npm run test:report        # Open HTML test report
npm run check:live-csp --workspace=frontend   # after a deploy: the live site's headers and CSP
```
The API-only specs (`security-api`, `concurrency`, `api-v1`, `account-lifecycle`, `protections`, `cleanup-job`, `group-messages`, `branding-compliance`, `team-data`) and the axe scan run on Chromium only; `security-ui`, `theme` and the app specs run on every browser. Local runs need two things the specs assume: the dev servers (`playwright.config.js` starts them) and applied local migrations. The hourly cleanup job is run for real through wrangler's `/__scheduled` (the dev script passes `--test-scheduled`).
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
│   ├── migrations/               # D1 SQL migrations (0001–0014)
│   └── test/                     # Node unit tests
├── frontend/
│   ├── public/                   # sw.js, theme-init.js, manifest, _headers (CSP etc. for Pages)
│   └── src/
│       ├── pages/ components/ contexts/ hooks/ locales/ (en es fr de zh hi)
│       └── utils/
│           ├── crypto.js         # AES-256-GCM + PBKDF2 + auth tag (Web Crypto)
│           ├── api.js            # Message/media API calls
│           ├── apiBase.js        # API_BASE + automatic X-App-Token fetch wrapper
│           └── session.js        # getSessionToken / getAuthHeaders
├── e2e/ e2e-csp/                 # Playwright suites (the app; the production build with the real headers)
├── scripts/                      # Release and tooling checks (versions, Modern Web Guidance)
├── extension/                    # Chrome + Firefox extension (own manifests, no npm deps)
├── .github/workflows/            # e2e-tests.yml (unit job + 5-browser e2e matrix), semgrep.yml
├── ROADMAP.md  CHANGELOG.md      # Status/next steps vs. release history (the in-app changelog page is generated from CHANGELOG.md)
├── docs/                         # API, testing, large files, email, analytics
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
- Frontend changes to `crypto.js` must stay in sync with `extension/crypto.js` (`deriveAuthTag`); `extension/test/crypto-parity.test.js` fails if they drift. When a server change alters request validation or error responses, update `extension/crypto.js` (`describeApiError`) and its contract test too.

### Country restriction and auto-burn (enforced server-side)
`utils/protections.js` enforces the two optional protections using the country Cloudflare resolves at the edge (`request.cf.country`, read by `utils/geo.js`):
- **`require_geo_match`**: only visitors from the sender's country (`creator_country`, set at creation) can read, verify 2FA for, or burn the message. Others get 403 `GEO_RESTRICTED` and nothing is burned. It **fails closed**: an unknown country (`XX`) or Tor (`T1`) is blocked, and creating a restricted message when the sender's own country is unknown is refused (400 `GEO_UNAVAILABLE`). `GET /:id/meta` returns `geoRestricted`/`geoAllowed` so the page can explain before the password step.
- **`auto_burn_suspicious`**: destroys the message at once (410 `AUTO_BURNED`, atomic, exactly once) on (1) an attempt from a blocked country, (2) failed password/2FA guesses from two or more countries within 10 minutes, (3) any access through Tor. Without the flag these only block or count.
- The creator token bypasses both. Only country codes are logged (`audit_logs`, kept 30 days by the hourly cron), never IP addresses.
- The `CF-IPCountry` header is honoured **only** when `ALLOW_COUNTRY_HEADER=1`, which only the dev script sets (so e2e tests can play visitors from `DE`/`FR`/`XX`/`T1`). Never add that variable to `wrangler.toml` or production secrets.

### API authentication (apiGate)
Every `/api/*` request must carry one of: a user session (`Authorization: Bearer` / `X-Session-Token`), an API key (`X-API-Key`), or a signed anonymous **app token** (`X-App-Token`, from `POST /api/app-token`, 1 h, rate-limited). Public allowlist: app-token, login/signup/refresh/verify-email/forgot/reset, `/api/health` and `/ping`; Slack and Stripe webhooks authenticate by signature. It **fails closed** (503) if `APP_TOKEN_SECRET` is unset. The app token is anti-automation only, not an authorization mechanism. The frontend attaches it automatically (`installApiAuth` in `apiBase.js`); the extension fetches one itself; Playwright signs one in `playwright.config.js`.

### Human check (Turnstile)
Optional and off by default. When `TURNSTILE_SECRET_KEY` is set, `POST /api/app-token` answers 403 `CHALLENGE_REQUIRED` (plus the public `TURNSTILE_SITE_KEY`) until it receives a solved `turnstileToken`; the web app (`utils/apiBase.js` + `utils/turnstile.js`) shows an `interaction-only` widget and retries. If Cloudflare's verification is unreachable the answer is a retryable 503 (it never opens the door). The extension can't run the widget, so its popup opens the website with the text in the URL fragment (`CHALLENGE_REQUIRED` in `extension/crypto.js`).

### Content-Security-Policy
The policy lives in `frontend/public/_headers`; `npm run test:csp` (`e2e-csp/`, its own config) verifies it against the production build and fails on any violation. Adding a third-party origin, worker, or inline script means updating the policy AND that test. Don't use libraries' default blob workers (`canvas-confetti` is wrapped in `utils/confetti.js` for this reason).

### Sessions, API keys, tokens
- Session tokens, API keys, verification and reset tokens are stored **hashed** (SHA-256); raw values only exist at the client / once at creation. Sessions are validated against D1 on every request (no KV session cache).
- `/api/auth/sessions` returns opaque ids; revoke by id.
- API keys are created only via session-authenticated `POST /api/api-keys`.

### Rate limiting
- Limits are consumed through `utils/rateLimitStore.js` `consume()`: an **exact, atomic Durable Object** (`durable/RateLimiter.js`, binding `RATE_LIMITER`) when bound, otherwise the KV counters below. The KV path is eventually consistent and can be bypassed by a parallel burst (a measured 45/45 requests got through a limit of 30), so never rely on it alone for something that matters. Both fail open on store errors.
- `utils/kvCounter.js` implements a fixed-window counter whose KV expiry is preserved (a plain KV `put` without a TTL removes the expiry — don't do that). Limiters take **seconds** (`rateLimitMiddleware(limit, windowSeconds)`).
- Dev server uses higher limits (`RATE_LIMIT_REQUESTS` var).

### API proxy (local dev)
The Vite dev server proxies `/api/*` → `http://localhost:8787`. `API_BASE` is `VITE_API_URL || ''` (same-origin in production, where Worker routes serve `/api/*`).

### Cloudflare Workers environment
- Local: `wrangler dev --port 8787 --local` (D1 as local SQLite). Hourly cron in `scheduled/cleanup.js` (D1 deletes are chunked to ≤90 bound params).
- **Secrets** (never in the repo): `APP_TOKEN_SECRET` (required), `SLACK_SIGNING_SECRET` (Slack), `STRIPE_WEBHOOK_SECRET` (billing), `TOTP_ENCRYPTION_KEY`.

## Deploying

Deploy is manual. Order matters because the frontend depends on the backend's endpoints:
1. Secrets, once: `openssl rand -hex 32 | wrangler secret put APP_TOKEN_SECRET` and the same for `TOTP_ENCRYPTION_KEY` (never change the latter).
2. `npm run d1:migrations:apply` (from `backend/`; migrations through `0014`).
3. `npm run deploy:backend`, then `npm run deploy:frontend` / push `main`. Deploy with the top-level wrangler config (no `--env`): `backend/wrangler.toml` has a single production configuration.
4. Smoke test: create a message, open the link, decrypt, confirm it's gone; run `npm run check:live-csp --workspace=frontend`.
5. Publish the extension builds (`./extension/build.sh`) when the extension changed.

## CI

`.github/workflows/e2e-tests.yml` has three kinds of jobs: **unit** (backend, frontend and extension tests, the Modern Web Guidance scan, the frontend build and `npm audit`: the backend runtime audit blocks on high or above, the whole-tree audit is informational), **e2e** (one parallel job per browser project) and **csp** (the production-build checks). Installs run with `npm ci --ignore-scripts` and tools run through `npx --no-install` at the lockfile's version.

## Key Configuration Files

| File | Purpose |
|------|---------|
| `backend/wrangler.toml` | Bindings (D1, R2, KV, Email), vars, routes, cron |
| `frontend/vite.config.js` | Dev server, API proxy |
| `frontend/public/_headers` | CSP, frame-ancestors, HSTS for the SPA (Pages) |
| `playwright.config.js` | 5 browser projects, 2 workers, test app token |
| `playwright.csp.config.js` | Production build + real headers (`npm run test:csp`) |
| `scripts/` | Release (versions, changelog) and Modern Web Guidance checks |
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
- Tailwind utilities for styling. **Theme**: `<meta name="color-scheme">` is the single source of truth ("light dark" = follow the system, or a pinned "light"/"dark"; `public/theme-init.js` and `contexts/ThemeProvider.jsx` keep it in step with `localStorage['color-scheme']`). The `dark:` variant follows it (see `index.css`), so keep writing both light and `dark:` variants; use `light-dark()` for shared tokens; never rely on a `.dark` class. Keep text at WCAG AA contrast in both themes (the axe scan enforces it).

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
- Treat the graph as an index, not truth: confirm in the source before relying on a finding.
- Setup (per machine): `python3 -m venv ~/.local/share/graphify-venv && ~/.local/share/graphify-venv/bin/pip install "graphifyy[sql]"`, link `graphify` into `~/.local/bin`, then in the repo `graphify install --project && graphify claude install && graphify update .`. The package name has a double "y" (`graphifyy`); other `graphify*` packages are unaffiliated.
- The graphify hooks embed an absolute path to the executable, so they live in the git-ignored `.claude/settings.local.json` (`graphify claude install` writes `.claude/settings.json`; move its `hooks` block into the local file and delete it before committing).

## Working agreements for agents

- Before changing code, read the relevant section above; keep changes small and match existing style.
- After backend changes run `cd backend && npm test`; after frontend changes run `cd frontend && npm run build`; for behaviour changes run the relevant Playwright spec (`npx playwright test e2e/<file> --project=chromium`).
- Never commit or push unless asked. Never push `main` without confirming the deploy order (see "Deploying").
- Never print, log or commit secrets, tokens, `.env*` files, `*.pem` or `*.crx`.
- Don't kill processes you didn't start (other `wrangler dev`/`workerd` servers may be running on other ports).
- Database changes need a new numbered migration in `backend/migrations/`; never edit an applied migration.
- When behaviour changes, update `CHANGELOG.md` (what shipped) and, if status/next steps change, `ROADMAP.md`. To release: bump the version once (`npm version <x.y.z> --workspaces --include-workspace-root --no-git-tag-version`) and both extension manifests, add the changelog entry and run `npm run test:release`.
- Do not hard-code counts (tests, files, versions) in docs: they drift; point to the command or file that knows.

## Important Context

- **Version**: `package.json` is the source of truth (the API reports it, the extension manifests and the docs must match: `npm run test:release`). The release history is `CHANGELOG.md`; status and next steps are `ROADMAP.md`.
- **Disabled**: Slack/Zapier/Discord message creators (return 501), `/subscribe` (payments are webhook-only, no checkout flow yet).
- **Group messages and legacy messages** have no auth tag.
- **Locales**: en, es, fr, de, zh, hi in `frontend/src/locales/`; a unit test fails if any language misses, adds or empties a key.
- **Uploads**: creator token required; chunked upload with retries for large files (`chunkedUpload.js`), 100 MB free / 1 GB premium (UI-level), 2 GB hard cap server-side.
- **Cloudflare dashboard settings** that affect the app (Browser Cache TTL, Rocket Loader, Web Analytics injection) are listed in `SETUP.md`; `check:live-csp` shows when they are wrong.
