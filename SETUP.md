# NoteBurner Setup Guide

## Prerequisites

- Node.js 22 or newer
- npm
- Cloudflare account
- Wrangler CLI installed (`npm install -g wrangler`)

## Initial Setup

### 1. Install Dependencies

```bash
cd noteburner
npm run setup
```

This will install dependencies for both backend and frontend.

### 2. Backend Setup (Cloudflare Workers)

#### Create D1 Database

```bash
cd backend
wrangler d1 create noteburner-db
```

Copy the database ID from the output and update `backend/wrangler.toml`:

```toml
[[ d1_databases ]]
binding = "DB"
database_name = "noteburner-db"
database_id = "YOUR_DATABASE_ID_HERE"
```

#### Apply Database Migrations

```bash
wrangler d1 migrations apply noteburner-db --remote
```

#### Create R2 Bucket

```bash
wrangler r2 bucket create noteburner-media
```

#### Create KV Namespace (Caching)

```bash
wrangler kv namespace create CACHE
wrangler kv namespace create CACHE --preview
```

Copy the `id` and `preview_id` values from the output and update `backend/wrangler.toml`:

```toml
[[ kv_namespaces ]]
binding = "CACHE"
id = "YOUR_KV_ID_HERE"
preview_id = "YOUR_KV_PREVIEW_ID_HERE"
```

The KV namespace is used for caching hot messages and stats (cache-aside pattern with configurable TTL). Without it the backend will log a binding error and fall back to direct DB queries on every request.

#### Configure Email (Cloudflare Email Routing)

Email is used for account verification, password resets, and team invitations.

1. **Enable Cloudflare Email Routing** for your domain in the Cloudflare dashboard → *Email* → *Email Routing* → Enable.

2. **Add a destination address** (the inbox where you want to receive forwarded mail) and verify it.

3. **Add `send_email` binding** in `backend/wrangler.toml` (already present — just ensure your domain is active):

```toml
[[ send_email ]]
name = "EMAIL_SENDER"
```

4. **Set the sender address** in `backend/wrangler.toml` `[vars]` section:

```toml
EMAIL_FROM = "hello@yourdomain.com"
```

Emails sent:
- **Verification** — on signup, token valid 24 hours
- **Password reset** — token valid 1 hour
- **Welcome** — after email verification
- **Team invitation** — when a team member is added

> **Local dev**: `EMAIL_SENDER` is not available in the local Wrangler dev server. The `sendEmail()` utility detects this and logs `[DEV] Would send email to ...` instead of throwing — auth flows still work, the email step is simply skipped.

#### Login to Cloudflare

```bash
wrangler login
```

### 3. Frontend Setup

Create `frontend/.env`:

```bash
cp frontend/.env.example frontend/.env
```

For local development, it should contain:

```
VITE_API_URL=http://localhost:8787
```

For production, update it to your Workers URL:

```
VITE_API_URL=https://noteburner-api.YOUR_SUBDOMAIN.workers.dev
```

## Development

### Start Backend (Terminal 1)

```bash
npm run dev:backend
```

Backend will run at `http://localhost:8787`

### Start Frontend (Terminal 2)

```bash
npm run dev:frontend
```

Frontend will run at `http://localhost:5173`

## API authentication (required secrets)

Every `/api/*` request must carry a user session, an API key, or a signed app token
(`X-App-Token`, obtained from `POST /api/app-token`). Only login/signup/password-reset,
`/api/app-token` and `/api/health` + `/api/health/ping` are open.

```bash
cd backend
openssl rand -hex 32 | wrangler secret put APP_TOKEN_SECRET
openssl rand -hex 32 | wrangler secret put TOTP_ENCRYPTION_KEY   # encrypts 2FA secrets at rest
wrangler secret put SLACK_SIGNING_SECRET   # only if using Slack
```

Set `TOTP_ENCRYPTION_KEY` **before** deploying and never change it afterwards (messages sealed with the old key would stop verifying). Without it, new 2FA secrets are stored in plain text (and any already-encrypted ones can't be read), so set it before the first deploy of this version. Apply migrations through `0014` before the new Worker goes live.

The API **fails closed**: without `APP_TOKEN_SECRET` anonymous calls get HTTP 503.
Local dev (`npm run dev`) uses `dev-app-token-secret`; Playwright signs test tokens with the same value.

## Deployment

### Order

1. Set the secrets (see *API authentication* above), once per environment.
2. Apply the database migrations: `cd backend && npm run d1:migrations:apply` (all of `backend/migrations`, through `0014`).
3. Deploy the backend, then the frontend (below).
4. Smoke test (create, open, decrypt, confirm the message is gone), then `npm run check:live-csp --workspace=frontend`.

`backend/wrangler.toml` holds a single production configuration with every binding, route and the cron trigger: deploy with the plain commands, **without** `--env`.

### Deploy Backend

```bash
npm run deploy:backend
```

Note the Workers URL from the output.

### Deploy Frontend

Update `frontend/.env` with your production API URL, then:

```bash
npm run deploy:frontend
```

Or manually deploy to Cloudflare Pages:

1. Build the frontend:
   ```bash
   cd frontend && npm run build
   ```

2. Create a new Pages project in Cloudflare dashboard

3. Upload the `frontend/dist` directory

4. Set environment variable:
   - `VITE_API_URL`: Your Workers API URL

## Cloudflare dashboard settings (check after every deploy)

`frontend/public/_headers` is applied by Cloudflare Pages, but zone-level features can override or add to it.
After a deploy run `npm run check:live-csp --workspace=frontend`: it compares the headers the live site serves with
`_headers` and loads real pages in a browser looking for CSP violations. Settings that have caused failures:

| Setting (dashboard) | Needed value | Why |
|---|---|---|
| Caching → Configuration → **Browser Cache TTL** | **Respect Existing Headers** | A fixed TTL (default 4 hours) overrides `Cache-Control: no-cache` on `/sw.js`, so installed apps keep an old service worker for hours. |
| Speed → Optimization → **Rocket Loader** | **Off** | It rewrites script tags (the app's module script gets a different `type`) and is not compatible with a strict CSP. |
| Analytics → **Web Analytics** (automatic setup) | **Off**, or allow it in the CSP | Pages injects `static.cloudflareinsights.com/beacon.min.js`, which `script-src` blocks. To keep it, add `https://static.cloudflareinsights.com` to `script-src` and `https://cloudflareinsights.com` to `connect-src`. |
| Security → Bots → **JavaScript Detections** / Bot Fight Mode | **Off** for this site (or accept the report) | They inject an inline script that `script-src` blocks; an inline script can only be allowed with a hash or nonce, which Pages cannot provide for an injected snippet. |

## Environment Variables

### Backend (wrangler.toml)

- `MAX_MESSAGE_SIZE`: Maximum message size in bytes (default: 10MB)
- `MAX_FILE_SIZE`: Maximum file size in bytes (default: 2GB, uses chunked uploads for files >100MB)
- `RATE_LIMIT_REQUESTS`: Max requests per window (default: 10)
- `RATE_LIMIT_WINDOW`: Rate limit window in seconds (default: 60)
- `EMAIL_FROM`: Sender address for transactional emails (default: `hello@noteburner.work`)

### Frontend (.env)

- `VITE_API_URL`: Backend API URL

## Scheduled jobs

The hourly cleanup job is already configured: `backend/wrangler.toml` declares the cron trigger (`0 * * * *`) and `backend/src/index.js` routes it to `backend/src/scheduled/cleanup.js`. Each run, in bounded batches:

- deletes expired messages and their files, and burned messages older than 7 days;
- deletes the stored files of burned messages after their 24 hour grace period;
- applies each team's data retention (when auto-delete is on) and removes expired group-message records;
- removes expired sessions, used or expired password resets, old login attempts and audit logs older than 30 days;
- upgrades legacy plaintext creator tokens and 2FA secrets to their hashed and encrypted forms.

To run it locally, start the backend with `npm run dev` (it passes `--test-scheduled`) and open `http://localhost:8787/__scheduled?cron=0+*+*+*+*`.

## Country restriction and auto-burn

These use the visitor country Cloudflare resolves at the edge (IP Geolocation is on by default, no setup). **Do not** set `ALLOW_COUNTRY_HEADER` in production: it lets a caller dictate their own country and is only used by the local dev script and the e2e tests.

## Optional hardening

- **Exact rate limits (Durable Object).** `wrangler deploy` creates the `RateLimiter` Durable Object from the migration in `wrangler.toml` (SQLite-backed, works on the free plan). Without the binding the limiters fall back to KV counters, which parallel bursts can bypass.
- **Human check on the anonymous token endpoint (Cloudflare Turnstile).** Create a Turnstile widget in the Cloudflare dashboard (hostname `noteburner.work`), then:
  ```bash
  cd backend
  wrangler secret put TURNSTILE_SECRET_KEY
  ```
  and add the public site key to `[vars]` in `backend/wrangler.toml` as `TURNSTILE_SITE_KEY`. Nothing else to configure: the API tells the web app when a challenge is needed. Leave both unset to keep it off (local dev and CI do). The browser extension cannot run the widget; when a check is required it opens noteburner.work with the text prefilled.
- **CSP check.** `npm run test:csp` loads the production build with the headers from `frontend/public/_headers` and fails on any violation. Run it after changing the policy, adding a third-party script, or a dependency that uses workers/inline scripts.

## Testing

The automated suites (unit, end-to-end on five browsers, production-build CSP and theme checks, accessibility scan) are described in `docs/E2E_TESTING.md`. A manual smoke test of a deployment:

1. Open `/create`, enter a message and a password, and create it; copy the link.
2. Open the link, enter the password, and check the message is shown.
3. Open the link again: it must report that the message is gone.
4. Run `npm run check:live-csp --workspace=frontend` against the live site.

## Troubleshooting

### Database Connection Errors

Make sure your D1 database ID is correct in `wrangler.toml` and migrations are applied.

### CORS Errors

Check that your frontend URL is allowed in the CORS configuration in `backend/src/index.js`.

### File Upload Fails

Verify R2 bucket is created and bound correctly in `wrangler.toml`.

## Production Checklist

- [ ] D1 database created and every migration applied (through `0014`)
- [ ] R2 bucket, KV namespace (`CACHE`) and the `RateLimiter` Durable Object created (the first `wrangler deploy` creates the Durable Object)
- [ ] Secrets set: `APP_TOKEN_SECRET`, `TOTP_ENCRYPTION_KEY` (never change it), and as needed `STRIPE_WEBHOOK_SECRET`, `SLACK_SIGNING_SECRET`, `TURNSTILE_SECRET_KEY`
- [ ] Cloudflare Email Routing enabled and `EMAIL_FROM` configured
- [ ] Backend and frontend deployed (no `--env`), custom domain configured
- [ ] Cloudflare dashboard settings checked (see above) and `npm run check:live-csp --workspace=frontend` passes
- [ ] `ALLOW_COUNTRY_HEADER` is **not** set in production
- [ ] Error monitoring set up (Sentry, etc.)
- [ ] Backups: the three secrets for the nightly export are set and the first run succeeded (see [docs/DISASTER_RECOVERY.md](docs/DISASTER_RECOVERY.md), which also covers recovery and rolling back a migration)

## Support

For issues or questions, please check the documentation or create an issue.
