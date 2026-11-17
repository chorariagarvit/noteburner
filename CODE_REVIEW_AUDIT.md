# NoteBurner Code Review Audit

**Date**: 2026-11-17 · **Version reviewed**: v1.14.0 (`main` @ `02bc8ab`) · **Branch**: `bugfix/totp-create-html-json-error`

**Scope**: Cloudflare Worker backend (`backend/src`), React frontend (`frontend/src`), service worker, browser extension, repo hygiene, dependencies.

**Method**: Manual read of the security-critical paths (message create/read/delete, TOTP/2FA, auth/session, rate limiting, CORS, cleanup), targeted greps across the codebase (SQL interpolation, `Math.random`, `innerHTML`, hard-coded URLs, tracked secrets), and `npm audit --omit=dev` on the backend.

**Limits**: This is not a line-by-line review of all ~35k lines. `teams.js`, `branding.js`, `compliance.js`, `api-keys.js`, `api-v1.js`, `integrations.js`, `media.js` and `auth.js` were only grepped, not read in full. No dynamic testing or penetration testing was done. Findings marked *unverified* are not confirmed.

---

## Summary

| Severity | Count |
|---|---|
| Critical | 2 |
| High | 4 |
| Medium | 6 |
| Low / Hygiene | 6 |

The core design is sound. Encryption is client-side, queries use bound parameters (no SQL interpolation found), and the rest of the code is generally tidy. The serious problems are in the newer 2FA feature and in repo hygiene.

**Fix first**
1. Remove the committed private key `extension.pem` and rotate it (C1).
2. Fix the 2FA enforcement gap. The server hands out ciphertext without checking the TOTP code (C2).
3. Generate TOTP secrets with a CSPRNG (H1).
4. Upgrade the vulnerable dependencies (H3).

---

## Critical

### C1. Private signing key committed to the repo
**File**: `extension.pem` (added in `8d668c2`). `extension.crx` is also tracked.

The extension's private key (`-----BEGIN PRIVATE KEY-----`) is in git history and on a public GitHub repo. Anyone can sign an extension that Chrome treats as the same extension ID, so it can be used to push a malicious update or impersonate the extension.

**Fix**
- Treat the key as compromised. Generate a new key and publish under a new ID, or rely on the Chrome Web Store's signing.
- `git rm --cached extension.pem extension.crx`, add `*.pem` and `*.crx` to `.gitignore`, and purge history with `git filter-repo` or BFG. Rotation is still required either way, because the key has already been public.

### C2. TOTP/2FA is not enforced by the server
**Files**: `backend/src/routes/messages.js:229-268` (GET), `:271-335` (verify-totp); `frontend/src/pages/ViewMessage.jsx:117`

`GET /api/messages/:identifier` returns `encryptedData`, `iv` and `salt` to anyone who has the link. It only adds a `totpRequired: true` flag. `POST /:identifier/verify-totp` is stateless: it returns `{success: true}` but issues no token, and nothing else checks that it was called. The only gate is a React condition (`if (totpRequired && !totpVerified)`) in the browser.

So anyone with the link can call the API directly, ignore the flag, and get the ciphertext. They still need the message password to decrypt it, so the content is not exposed outright. But 2FA is cosmetic: it adds no protection beyond the password, and the feature's claim is false. The same call also marks the message accessed, so an attacker can burn it.

**Fix**
- On successful verify, return a short-lived signed proof (an HMAC over `identifier + expiry`, or a KV entry with a nonce).
- Require that proof on GET for messages where `require_2fa = 1`, and return only metadata (`expiresAt`, `totpRequired`) without it.

---

## High

### H1. TOTP secrets are generated with `Math.random()`
**File**: `backend/src/utils/totp.js:16-20`

`Math.random()` is not cryptographically secure. Secrets are 32 base32 characters, but the generator is predictable if its state can be inferred, and this is a security secret.

**Fix**: Use `crypto.getRandomValues(new Uint8Array(20))` (160 bits, the RFC 4226 recommendation) and base32-encode it. The same applies to the slug generation in `slugValidation.js:127,131` if slugs are meant to be unguessable.

### H2. TOTP secret stored in plaintext, and the verify path has weak brute-force protection
**File**: `backend/src/routes/messages.js` (insert at ~121; verify at 271-335)

- `totp_secret` is stored unencrypted in D1.
- The attempt counter is read, then written, in KV. KV is eventually consistent and not atomic, so parallel requests can exceed 5 attempts. The key is also per identifier, not per IP, so one attacker can lock the real recipient out (denial of service on the recipient).
- `verifyTOTP` accepts ±1 window, which is fine, but the code comparison should be constant-time. It needs checking in `totp.js:80+` (*unverified*).

**Fix**: Use a Durable Object or D1 counter for attempts. Compare codes with a constant-time function. Consider encrypting the secret at rest with a Worker secret.

### H3. Vulnerable dependencies (`npm audit`, backend, prod)
**3 vulnerabilities (1 low, 2 high)**
- `hono <= 4.13.15`: many advisories. The ones relevant to this app:
  - ReDoS in CORS middleware via `Access-Control-Request-Headers` (GHSA-8j4g-w8fx-2239). This app uses `hono/cors`.
  - CORS middleware reflecting any origin when `origin` defaults to the wildcard (GHSA-88fw-hqm2-52qc). This app sets `origin` explicitly, so it is probably not affected (*unverified*).
  - Several Lambda / JSX / `serve-static` advisories, which don't apply to a Workers deployment.
- `nanoid 4.0.0–5.1.15`: non-secure generators can loop forever with a negative size (GHSA-28wg-ghj8-5hjv). It is used for tokens and sessions, and callers pass fixed sizes, so the practical risk is low.

**Fix**: `cd backend && npm audit fix`, then rerun the E2E suite. Audit the frontend and root `package.json` too; that was not run.

### H4. Unauthenticated, anyone-can-trigger cleanup endpoint
**File**: `backend/src/routes/cleanup.js` (mounted at `/api/cleanup`)

`GET /api/cleanup` has no authentication. Each call runs a table scan plus a D1/R2 delete loop with no batching or limit. A scheduled job already exists (`backend/src/scheduled/cleanup.js`), so the HTTP endpoint is redundant. It is a cheap amplification vector, since one request does unbounded work, and a state-changing GET.

**Fix**: Remove the route, or require a secret header and cap the batch size.

---

## Medium

### M1. Anyone with the link can burn a message without reading it
**File**: `messages.js:338-372`

`DELETE /:identifier` only checks the creator token if the header is present. With no header, it deletes the message. This is intentional ("recipient burns after decryption"), but it means anyone who learns the link can destroy the message without ever decrypting it, including link scanners, unfurlers and chat previews that follow URLs. (`GET` is not destructive, which helps, but the `DELETE` isn't either guarded or proof-of-decryption.)

**Fix**: Accept a recipient burn only with proof that decryption succeeded (for example a MAC the client derives from the key), or accept the risk and document it.

### M2. Rate limiting is racy and fails open
**File**: `backend/src/middleware/rateLimit.js`

Read-then-write on KV is not atomic, so a burst of concurrent requests all pass. Counts are only approximate. When KV is not configured it fails open. Keys fall back to the shared bucket `unknown` when `CF-Connecting-IP` is missing. KV writes also consume daily quota, as seen in the earlier DDoS-middleware commit.

**Fix**: Use Cloudflare's Rate Limiting binding or a Durable Object for authentication, verify-totp and creation endpoints.

### M3. CORS function returns `true` and falls back to an allowed origin
**File**: `backend/src/config/cors.js`

For a request with no origin the function returns `true`. Hono's `cors` expects a string (or nothing) from this function, so the header value may be wrong (*unverified*). For an unlisted origin it returns `ALLOWED_ORIGINS[0]` (`http://localhost:4173`) instead of rejecting. Browsers will block it, so it isn't exploitable, but it is confusing and a dev origin is in the production list. Any `chrome-extension://` origin is also allowed, so the extension ID is not pinned.

**Fix**: Return `null`/`''` for disallowed origins, drop localhost entries in production, and pin the extension ID.

### M4. Inconsistent API base URL, with hard-coded hosts
**Files**: `frontend/src/hooks/useStats.js:3` (`https://api.noteburner.work`), `frontend/src/utils/chunkedUpload.js:1` (`https://noteburner-api.gravitysolutions.in`), many components using bare `/api/...` (`AuthContext.jsx`, `ApiKeyManager.jsx`, `BrandingCustomizer.jsx`), and `api.js` / `premium.js` using `VITE_API_URL || ''`.

The code uses at least four patterns. The chunked upload default points at a different domain (`gravitysolutions.in`), which looks like a leftover from another project. Mixing absolute and relative URLs is the kind of thing that produces "HTML instead of JSON" errors whenever deployment routing changes (see Bug 1).

**Fix**: One `API_BASE` export in a single module, used everywhere.

### M5. Frontend `response.json()` calls assume a JSON body
**Files**: `frontend/src/utils/api.js` (17 call sites), `ViewMessage.jsx`, and others

Any non-JSON response (HTML from the SPA fallback or a gateway error, a worker crash, a blocked request) throws `Unexpected token '<'`, which the user sees verbatim. *Partly fixed on this branch for `api.js` and the verify-totp call; other files still do this.*

### M6. Service worker issues
**File**: `frontend/public/sw.js`

- `request.headers.get('accept').includes(...)` throws when `Accept` is missing.
- Cache name is a hand-edited constant (`v1.14.0`), so a missed bump serves stale JS (the repo already has a commit for this).
- Cache-first for all other GETs means a failed or odd response can be pinned, and navigation fallbacks return `index.html` for missing static files with a 200 (visible in the report as `desktop-1.png` returning `text/html`). That hides missing assets and makes JSON/asset errors look like HTML.

**Fix**: Guard the `Accept` header, version caches from the build, and don't SPA-fallback requests for files with extensions.

---

## Low / hygiene

- **L1. `.env.test` is committed** (`frontend/.env.test`, localhost values only). Harmless today, but the pattern invites secrets later. Prefer `.env.test.example`.
- **L2. `innerHTML` in extension** (`popup.js:76-162`, `content.js:23`): only static strings with emoji, so no injection today. Prefer `textContent`.
- **L3. Cleanup loop is serial** (`cleanup.js`): per-message `await` for R2 delete and D1 delete. Batch with `DB.batch` and `Promise.all`.
- **L4. Weak password policy**: minimum 8 characters with character-class rules (`utils/password.js`). Prefer a longer minimum and a breach/zxcvbn check over composition rules. Bcrypt at 10 rounds is acceptable but low; pick the highest that stays within the Workers CPU limit.
- **L5. Documentation drift**: `package.json` and `index.js` versions, the API version string (`1.12.0` in code vs `1.14.0` release) and the docs disagree. Single-source the version.
- **L6. Test coverage is E2E only** (15 files in `e2e/`, none for backend units such as `totp.js`, `password.js`, `slugValidation.js`). The TOTP bugs above would have been caught by a unit test for the enforcement path.

---

## Bugs found while investigating the reported error

**Reported**: after creating a message with TOTP, the UI shows `Unexpected token '<', "<!doctype "... is not valid JSON`.

**Bug 1 (confirmed): the TOTP QR code never renders.** `TOTPSetup.jsx` read `totpData.qrCodeUrl`, but the backend only returns `{secret, uri}` (its comment says the QR is "generated client-side from the URI", which was never implemented). The image had no source, so users could not scan a code at all.

**Bug 2 (confirmed): non-JSON responses crash the UI.** `api.js` and `ViewMessage.jsx` call `response.json()` unconditionally, so any HTML response surfaces as the raw parse error. The HAR output you pasted shows the service worker answering a missing static file (`desktop-1.png`) with `text/html` and status 200, so HTML coming back where JSON is expected is real in production.

**Not confirmed**: I could not tell from the pasted network log which exact request returned HTML. The log shows `POST /messages` succeeding (201), then a request named `create` that failed with `ERR_CACHE_MISS` through the service worker, and a fetch of `2H7Pg…` returning 200 at the size of `index.html`. If the error persists after deploying these fixes, I need the full request URL and response of that fetch (DevTools → Network → the failing request → Headers).

**Changes on this branch** (uncommitted):
- `TOTPSetup.jsx`: generate the QR client-side from `totpData.uri` using the existing `qrcode` util.
- `api.js`: new `readError` / `readJson` helpers that never throw a parse error and report the HTTP status.
- `ViewMessage.jsx`: verify-totp call now uses `VITE_API_URL` and tolerates a non-JSON body.

---

## Recommended order of work

1. **Now**: C1 (rotate key, purge history), H3 (`npm audit fix`), merge the bug fixes above.
2. **This week**: C2 (server-side 2FA enforcement), H1 (CSPRNG secrets), H4 (remove or secure cleanup).
3. **Next**: H2, M1–M6, a unit-test suite for `totp.js`, `password.js` and message access control.
4. **Backlog**: L1–L6.

*Not reviewed in depth, worth a follow-up pass*: `auth.js` (641 lines), `teams.js` (RBAC checks), `api-keys.js` / `api-v1.js` (key hashing and scoping), `media.js` (upload size limits, content types), `compliance.js` (data export and deletion authorization).
