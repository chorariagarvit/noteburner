# NoteBurner 🔥

**Version**: v1.15.0 · see [CHANGELOG.md](./CHANGELOG.md) for what changed and [ROADMAP.md](./ROADMAP.md) for what is next

Send a secret that destroys itself after it is read. Messages are encrypted in your browser before they leave it, can be opened once, and are then permanently deleted. NoteBurner's servers only ever hold ciphertext.

## Features

### Core security
- 🔐 **Client-side AES-256-GCM encryption**: encryption and decryption happen in the browser (PBKDF2 key derivation from your password)
- 🔥 **One-time access, enforced by the server**: a password-derived proof is checked, attempt and view limits are atomic, and burning needs the proof or the creator token
- ⚙️ **Self-destruct options**: max views, time limits, password attempts, optional 2FA (TOTP), and optional country restriction and auto-burn on suspicious activity (failed guesses from several countries, Tor), using the country Cloudflare reports
- 📎 **Encrypted files** up to 2 GB (large files upload in chunks with retries), deleted with the message
- 🚫 **No backups**: burned means gone; audit logs keep country codes only (never IP addresses) for 30 days

### Sharing
- 🌐 Custom short URLs, 📱 QR codes, ⏱️ countdown timers, 🔗 social previews
- 👥 **Group messages**: 1 to 100 unique recipient links from one message
- 🧩 **Browser extension**: right-click to send selected text; it only runs when you use it. Install from the [Chrome Web Store](https://chromewebstore.google.com/detail/noteburner/jibijfhlnoealebkcibpfpomfdllhhdc) or [Firefox Add-ons](https://addons.mozilla.org/en-US/firefox/addon/noteburner/)
- 🎁 Referral rewards and an invite page; message templates and keyboard shortcuts

### Accounts, teams and the API
- 👤 Accounts with email verification, sessions you can review and revoke, password reset and brute-force lockout; signup does not reveal which emails are registered
- 🏢 **Teams** with roles (owner, admin, member, viewer), team message lists and usage stats, custom branding, and compliance tools (data retention, "require password", audit-log and message exports, GDPR delete)
- 🔑 **API**: every `/api/*` call needs a session, an API key or a signed app token; API keys and a public `/api/v1` for programmatic message creation ([docs/API.md](./docs/API.md)); webhook subscriptions are stored but events are not delivered yet
- 💎 Premium and Lifetime plans, with the Stripe webhook in place (the checkout flow is not built yet)

### Interface
- 🌗 **System, Light and Dark themes**: follows the OS, remembers your choice, applies before first paint and works without JavaScript
- ♿ **Accessible**: every page passes an axe scan (WCAG 2.1 A and AA, contrast included) in both themes
- 🌐 **Six languages** (English, Spanish, French, German, Chinese, Hindi), detected automatically
- 📱 **Installable PWA** with offline support, camera capture and the native share sheet
- 🏆 Achievements, streaks and an anonymous leaderboard

## Security model

1. All encryption and decryption happen in the browser; the password never leaves it.
2. The server stores only ciphertext, and a hash of a password-derived proof (never the password).
3. One-time access, attempt limits, view limits and burning are decided by the server, atomically.
4. Creator tokens are stored hashed, 2FA secrets encrypted, sessions and API keys hashed.
5. Every API call is authenticated; rate limits are exact (a Cloudflare Durable Object), with an optional Turnstile challenge on the anonymous token endpoint.
6. A strict Content-Security-Policy is verified against the production build in CI.
7. Dependency scans and static analysis (Snyk, SonarCloud) run on every change.

## Architecture

- **Backend**: Cloudflare Workers (Hono), D1 (SQLite, metadata only), R2 (encrypted files), KV, a Durable Object for rate limiting, an hourly cleanup job
- **Frontend**: React and Tailwind CSS on Cloudflare Pages (PWA)
- **Extension**: Manifest V3 for Chrome and Firefox
- **Tests**: Playwright on five browsers, plus unit, CSP and accessibility checks

```
noteburner/
├── backend/        Cloudflare Workers API (migrations in backend/migrations, bindings in backend/wrangler.toml)
├── frontend/       React web app (PWA)
├── extension/      Chrome and Firefox extension
├── e2e/ e2e-csp/   Playwright suites (the app, and the production build with the real security headers)
├── scripts/        Release and tooling checks
└── docs/           Reference documentation
```

## Getting started

**Prerequisites**: Node.js 22 or newer, npm, a Cloudflare account and the Wrangler CLI.

```bash
npm run setup                                              # install dependencies
cd backend && npx wrangler d1 migrations apply noteburner-db --local && cd ..
npm run dev:backend    # http://localhost:8787
npm run dev:frontend   # http://localhost:5173
```

The D1, R2, KV and Durable Object bindings and the cron trigger are declared in [`backend/wrangler.toml`](./backend/wrangler.toml). Secrets (`APP_TOKEN_SECRET`, `TOTP_ENCRYPTION_KEY`, optional Turnstile, Stripe and Slack keys), migrations, deployment and the Cloudflare dashboard settings are in [SETUP.md](./SETUP.md).

```bash
npm run deploy:backend    # Cloudflare Workers
npm run deploy:frontend   # Cloudflare Pages
```

## Testing

```bash
npm test --workspace=backend && npm test --workspace=frontend && npm run test:extension   # unit tests
npm run test:csp            # production build with the real security headers (CSP, theme, no-JS)
npx playwright test --project=chromium     # end-to-end on one browser; omit --project for all five
npm run test:modern-web     # Google's Modern Web Guidance scan for legacy web patterns
npm run test:release        # version numbers and changelog agree
npm run check:live-csp --workspace=frontend   # after a deploy: the live site's headers and CSP
```

The suites, what each covers and how they run in CI are described in [docs/E2E_TESTING.md](./docs/E2E_TESTING.md).

## License

MIT
