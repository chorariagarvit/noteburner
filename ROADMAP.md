# NoteBurner Roadmap 🔥

**Mission**: Make NoteBurner the go-to platform for secure, self-destructing messages.

**Current version**: v1.16.0 (Nov 26, 2026) · **Next**: v1.17.0, picked from section 2

> This file covers **status and what's next**. Details live elsewhere:
> - [CHANGELOG.md](CHANGELOG.md): what shipped in each version
> - [docs/E2E_TESTING.md](docs/E2E_TESTING.md): the test suites and how to run them
> - [docs/API.md](docs/API.md): the public API
> - [SETUP.md](SETUP.md): deploying and configuring (secrets, migrations, Cloudflare settings)

---

## 1. Where we are

### v1.16.0: reliability and accessibility (Nov 26, 2026)

Makes the site fail gracefully, recoverable and zoomable.

- **Fails gracefully:** an error screen instead of a blank page, and safe reads (link checks) are retried; opening, creating and uploading are never retried.
- **Recoverable:** a recovery guide (Cloudflare Time Travel is on) and rollback files and a script for migrations 0013 and 0014 (a test requires one for every new migration).
- **Accessible on phones:** pinch-zoom works, the header fits at 390 px, the camera overlay is a real dialog.
- The extension is unchanged (still 1.15.1, in store review); the release test now lets it trail the website.

### v1.15.1: screen reader support, faster loading and safer links (Nov 26, 2026)

A follow-up that makes the site work with screen readers, loads much faster, and stops invalid links looking alive.

- **Screen readers:** skip link, landmarks, announced page changes, one heading per page, announced errors, labelled fields, focus-trapping dialogs.
- **Links are checked first:** unknown, expired and already-read links show "Message not found"; the lookup is rate limited.
- **Faster:** the main script shrank from 862 KB to about 340 KB (pages and languages load on demand).
- **Extension 1.15.1:** the popup follows the system light or dark setting; the Firefox manifest declares the data it sends.

### v1.15.0: security hardening, quality and a three-state theme (Nov 24, 2026)

The release that turns the app from "stores the settings" into "enforces them", and cleans up everything the audits and scanners found.

- **The server enforces the promises the UI makes.** One-time access, attempt and view limits, country restriction, auto-burn, data retention and "require password" are checked on the server, not just shown in the interface. Every API call needs a session, an API key or a signed app token; rate limits are exact (Durable Object); signup does not reveal which emails exist; creator tokens are hashed and 2FA secrets encrypted.
- **Teams have real data.** Message lists, stats, exports, the compliance report and GDPR delete work, using daily counters that survive burned messages.
- **A three-state theme (System, Light, Dark)** driven by the browser's colour scheme: it follows the OS live, applies before first paint, works without JavaScript and keeps native controls in step.
- **Accessible everywhere.** Every page passes an axe scan (WCAG 2.1 A and AA, contrast included) in both themes.
- **Cleaner and safer code.** SonarCloud and Snyk findings fixed (vulnerabilities, bugs, high-complexity functions), the dead `share.js` and an accidentally committed copy of the extension removed, CI installs without lifecycle scripts and with pinned tools, dependency scans at 0.
- **Safer tooling.** The extension no longer runs on every site; the deployed site's headers and CSP can be checked with `npm run check:live-csp`; Google's Modern Web Guidance scan runs in CI; a release test keeps the version numbers and the changelog in step; the in-app changelog is generated from `CHANGELOG.md`.
- **Tested on five browsers** (Chromium, Firefox, WebKit, Mobile Chrome, Mobile Safari), with unit tests, production-build CSP checks and the accessibility scan.

### Release history

| Version | Released | Focus |
|---|---|---|
| v1.16.0 | Nov 26, 2026 | Error screen, safe-read retry, recovery guide, migration rollback, pinch-zoom and 390 px header |
| v1.15.1 | Nov 26, 2026 | Screen reader support, faster loading, "Message not found" for invalid links, extension follows the system theme |
| v1.15.0 | Nov 24, 2026 | Security hardening, server-enforced protections, team data, three-state theme, accessibility, code quality |
| v1.14.0 | Mar 13, 2026 | Premium (Premium $5/mo, Lifetime $49, pricing page, dashboard) |
| v1.13.0 | Mar 12, 2026 | Internationalization (EN/ES/FR/DE/ZH/HI, locale middleware) |
| v1.12.0 | Mar 4, 2026 | Scaling and performance (KV cache, DB indexes, health checks) |
| v1.10.0 | Feb 24, 2026 | User authentication (signup, sessions, reset, brute-force lockout) |
| v1.9.0 | Feb 20, 2026 | Enterprise (teams/RBAC, API keys, branding, GDPR dashboard) |
| v1.8.0 | Feb 9, 2026 | Security (password meter, self-destruct options, audit log, 2FA, headers) |
| v1.7.0 | Feb 9, 2026 | Platform integrations (Slack, Discord, Zapier, webhooks, REST API) |
| v1.6.0 | Jan 23, 2026 | Mobile and PWA (installable, offline, camera, share sheet) |
| v1.5.0 | Jan 14, 2026 | Network effects (group messages, referrals, browser extension, invite) |
| v1.4.0 | Jan 8, 2026 | Gamification (achievements, leaderboard, streaks, mystery mode) |
| v1.3.0 | Dec 28, 2025 | Custom URLs, QR codes, countdown timer, OG tags |
| v1.2.0 | Dec 23, 2025 | Viral mechanics (post-burn CTA, preview page, confetti) |
| v1.1.0 | Dec 17, 2025 | Analytics and social proof (stats counters, platform stats) |
| v1.0.0 | Dec 7, 2025 | Initial launch: AES-256-GCM client-side encryption, one-time access, file upload |

There is no v1.11; the release after v1.10 is v1.12.0. Version numbers follow the git tags and `package.json`.

---

## 2. What's next

**v1.17.0** is picked from the open items below. In order of urgency:

### To finish the v1.15 rollout
- [ ] Ignore the remaining Snyk false positive in the Snyk app (Turnstile script without an integrity hash, which cannot be pinned)
- [ ] Extension 1.15.1 is submitted to Chrome and Firefox and waiting for review (the Chrome key rotation is complete; keys live outside the repo). When approved, update `extension/README.md`
- [ ] Cloudflare dashboard settings found by `npm run check:live-csp`: Browser Cache TTL "Respect Existing Headers" (so `/sw.js` is not cached for 4 hours), Rocket Loader off, a decision on Web Analytics auto-injection (see [SETUP.md](SETUP.md))
- [ ] Set the production secrets `APP_TOKEN_SECRET` and `TOTP_ENCRYPTION_KEY` and apply migrations `0013` and `0014` (done once; repeat for any new environment)
- [ ] Decide on Cloudflare Turnstile for the anonymous token endpoint: build is ready, off by default; enable it when bot traffic appears (see [SETUP.md](SETUP.md))

### Follow-ups from this release
- [ ] Optional off-account database backup (scheduled export, encrypted; either a GitHub Action or a Cloudflare scheduled Worker writing to R2). Shelved: Time Travel covers 30 days (see [docs/DISASTER_RECOVERY.md](docs/DISASTER_RECOVERY.md))
- [ ] Remaining SonarCloud items: `await` inside loops where order does not matter, optional chains, SVG names, the duplicated crypto code between the web app and the extension
- [ ] A three-state theme choice in a settings surface instead of the header (the guidance recommends this for rarely used controls), and optional `light-dark()` tokens for more of the interface

### Launch checklist (still open)
- [ ] Set up custom domain
- [ ] Add analytics (GA4 / Clarity / Plausible; see [docs/ANALYTICS_SETUP.md](docs/ANALYTICS_SETUP.md))
- [ ] Product Hunt submission
- [ ] Social media accounts (Twitter/X, Reddit)
- [ ] Load testing

### Features not built yet (switched off or stubbed)
- [ ] Payments: there is no checkout flow, only the signature-verified Stripe webhook; plans change only through it. Set `STRIPE_WEBHOOK_SECRET` when billing goes live
- [ ] Webhook delivery: `POST /api/integrations/webhooks/subscribe` stores subscriptions, but nothing sends `message.created` / `message.viewed` / `message.burned` events to them; build delivery with request signing and retries
- [ ] Slack message creator (`/slack/command`, `/slack/actions`): returns 501. The old version put plaintext and the password in the link, so it needs a redesign around client-side encryption
- [ ] Zapier message creator (`/zapier/create`): returns 501, same redesign needed
- [ ] Discord message creator (`/discord/create`): returns 501, same redesign needed

### Technical debt
- [ ] Rollback files for migrations 0001-0012 (0013 onward have them)
- [ ] Snyk: replace the hard-coded test passwords in the end-to-end tests with random ones, and ignore the Turnstile false positive in the Snyk app

### Ideas (unscheduled)
- Native mobile apps (React Native?)
- Desktop app (Electron?)
- Self-hosted version for enterprises
- Open-source the entire stack
- IPFS-based storage option
- E2E encryption for group chats
- Voice/video messages

---

## 3. Marketing plan (runs in parallel with features)

| When | Goal | Actions |
|---|---|---|
| Month 1 — Product Hunt | 300+ upvotes, #1 Product of the Day | Hunter outreach 2 weeks prior; build 100+ supporter email list; launch Tue–Thu; reply to every comment within 1 hour |
| Month 2 — Reddit / HN | HN front page, 1000+ Reddit upvotes | "Show HN" post; r/privacy, r/opensource, r/selfhosted; technical blog write-up; no spam |
| Month 3 — Press | TechCrunch, The Verge, Ars Technica | Exclusive pitches ("indie dev challenges Signal"); privacy advocates; YouTube reviewers |
| Month 4+ — SEO & content | 10k organic visits/month | Guides and tutorials, guest posts, podcasts |

## 4. Success metrics

*Months are counted from the public launch (not yet done), not from the v1.0 commit date.*

| Milestone | Messages | Daily users | GitHub stars | Other |
|---|---|---|---|---|
| Month 1 | 1,000 | 100 | 50+ | Product Hunt top 5 |
| Months 1–3 | 10,000 | 1,000 | 500+ | Press in 3+ outlets; viral coefficient > 0.5 |
| Months 4–6 | 100,000 | 10,000 | 2,000+ | 100+ premium subscribers ($500 MRR); viral coefficient > 1.0 |

---

## 5. Development guidelines

### Branches
`feature/<name>` · `bugfix/<description>` · `hotfix/<fix>` · `release/v<version>`

### Releases
1. Work on a branch from `main`; every change keeps the unit tests, the production-build CSP checks and the Playwright suites green.
2. Bump the version once with `npm version <x.y.z> --workspaces --include-workspace-root --no-git-tag-version`, and the two extension manifests to match; add the `CHANGELOG.md` entry. `npm run test:release` fails if the versions, the changelog, the README or this file disagree.
3. Apply new migrations, set any new secrets, deploy the backend, then the frontend; run `npm run check:live-csp` against the live site.
4. Publish the browser extension builds (`./extension/build.sh`).

### Testing
Unit tests for new functions · API and browser tests for every critical flow · the axe accessibility scan in light and dark mode for new pages (see [docs/E2E_TESTING.md](docs/E2E_TESTING.md)).

### Review checklist
- [ ] Linting passes (no warnings)
- [ ] Tests pass
- [ ] Performance impact assessed
- [ ] Security review completed
- [ ] Documentation updated
- [ ] CHANGELOG entry added and `npm run test:release` passes

## 6. Contributing

Solo project for now, open to collaboration in Q2:
1. Check the latest feature branch
2. Open an issue to discuss your idea
3. Fork and PR with tests
4. Follow the code style guidelines

---

**Last updated**: Nov 26, 2026 · **Current version**: v1.16.0 · **Next release**: v1.17.0
