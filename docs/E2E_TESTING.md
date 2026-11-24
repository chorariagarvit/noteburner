# Testing

NoteBurner is tested in layers. Each layer has one command, and CI runs them all.

| Layer | Command | What it covers |
|-------|---------|----------------|
| Backend unit | `npm test --prefix backend` | Routes, middleware and helpers (Vitest) |
| Frontend unit | `npm test --prefix frontend` | Components, utilities and the in-app changelog parser (Vitest) |
| Extension unit | `npm run test:extension` | Extension crypto, background and popup logic (`node --test`) |
| End to end | `npm run test:e2e` | The real app in a browser against a local Worker and database (Playwright) |
| CSP | `npm run test:csp` | The built site with the production Content-Security-Policy, so inline script or style regressions fail |
| Modern web | `npm run test:modern-web` | Scripts' own tests plus the Modern Web Guidance scan |
| Release | `npm run test:release` | Versions, changelog, README and roadmap agree with each other |
| Live site | `npm run check:live-csp` | The deployed site serves the expected headers and CSP |

## End-to-end tests

Playwright runs five projects: `chromium`, `firefox`, `webkit`, `Mobile Chrome` and `Mobile Safari`. Start with Chromium, then run the others:

```bash
npm run test:e2e:setup                       # apply local D1 migrations (done by test:e2e)
npx playwright test --project=chromium       # fastest feedback
npx playwright test                          # all five browsers
npx playwright test e2e/theme.spec.js        # one file
npx playwright test -g "one-time access"     # by title
npm run test:e2e:ui                          # interactive runner
npm run test:report                          # open the last HTML report
```

Playwright starts the backend and frontend itself (see `playwright.config.js`). Use real ports; running inside a private network namespace makes `navigator.onLine` false and breaks the offline-notice tests.

### Specs by area

| Area | Files |
|------|-------|
| Creating and viewing messages | `create-message.spec.js`, `view-message.spec.js`, `viral-mechanics.spec.js` |
| One-time access and concurrency | `security-api.spec.js`, `security-ui.spec.js`, `concurrency.spec.js` |
| Group messages | `group-messages.spec.js` |
| Custom URLs, QR codes, countdown, link previews | `custom-urls-qr-countdown.spec.js` |
| Gamification | `gamification.spec.js` |
| Referrals and invites | `network-effects.spec.js` |
| UI polish (onboarding, templates, shortcuts) | `ui-polish.spec.js` |
| Mobile and PWA | `mobile-pwa.spec.js` |
| Integrations and API keys | `integrations.spec.js` |
| Password strength, self-destruct, audit logs | `security-enhancements.spec.js` |
| API v1, tenant isolation | `api-v1.spec.js` |
| Teams, branding, compliance | `enterprise.spec.js`, `branding-compliance.spec.js`, `team-data.spec.js` |
| Accounts and authentication | `authentication.spec.js`, `account-lifecycle.spec.js` |
| Health, caching, performance headers | `scaling-performance.spec.js` |
| Internationalisation | `i18n.spec.js` |
| Premium plans and billing | `premium.spec.js` |
| Country restriction | `protections.spec.js` |
| Scheduled cleanup | `cleanup-job.spec.js` |
| Theme (light, dark, system) | `theme.spec.js` |
| Accessibility (axe-core, both colour schemes) | `accessibility.spec.js` |

### Helpers

- `e2e/fixtures.js` replaces Playwright's `test`. It gives every test its own client IP through `CF-Connecting-IP`, so the per-IP rate limits do not make unrelated tests fail with 429. Import `test` and `expect` from it, not from `@playwright/test`.
- `e2e/api-helpers.js` holds shared API helpers, including the app token request every API call needs and the `d1()` helper that queries the local database directly.
- `runCleanupUntil` runs the scheduled cleanup job against the local Worker until a condition holds, which is how the cleanup specs avoid fixed sleeps.

### Writing tests

- Prefer the API for setup and the browser for what the user sees.
- Query by role or label, not by CSS class.
- Do not hard-code credentials: generate a random password per test.
- Never assert on counts of other tests' data; each test owns its IP and its messages.

## CSP tests

`npm run test:csp` builds the frontend, serves it with the production headers and fails on any CSP violation. It uses `playwright.csp.config.js`. Anything that needs inline script (such as theme initialisation) must be an external file.

## CI

`.github/workflows/e2e-tests.yml` runs the unit tests and the CSP check, then one end-to-end job per browser. Reports are uploaded as artifacts when a job fails.
