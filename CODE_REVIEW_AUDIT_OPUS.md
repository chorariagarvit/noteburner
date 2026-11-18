# NoteBurner: Independent Code Review and Security Audit

**Date**: 2026-11-17 · **Branch**: `bugfix/totp-create-html-json-error` (base `02bc8ab`) plus uncommitted working-tree changes
**Reviewer scope**: backend (`backend/src`), frontend (`frontend/src`, `frontend/public/sw.js`), extension (`extension/`), migrations, dependency audit.
**Method**: I read every backend route, middleware and util file in full, plus the security-relevant frontend files (API layer, crypto, auth context, view/create flows, premium, enterprise pages, service worker, PWA, analytics) and the extension. I reproduced the claims where I could without starting servers: a Node repro of the frontend `readJson` bug, a read-only inspection of the local Miniflare KV store, `node --test` for the backend unit tests, and `npm audit --omit=dev`.

> **Moving target.** The working tree changed while this review was running. Between 16:44 and 16:50 IST, someone else added `apiGate.js`, `app-token.js`, `appToken.js`, `apiKeys.js` and `slackSignature.js`. In the same window they edited `index.js`, `cors.js`, `integrations.js`, `apiBase.js`, `main.jsx`, `extension/crypto.js` and `playwright.config.js`. A local `wrangler dev` was also running. This report describes the tree as of **16:56 IST**, plus the extension files (`content.js`, the manifests and the docs) that changed again at 16:58 and were re-read at 17:00. Findings that concern the new files are marked **(in-flight)**. A finding that was fixed during the review (the unauthenticated `POST /api/integrations/keys/create`, which minted API keys for any `user_id`) is not counted below.

---

## Summary

| Severity | Count | IDs |
|---|---|---|
| Critical | 2 | NB-C1, NB-C2 |
| High | 5 | NB-H1 … NB-H5 |
| Medium | 11 | NB-M1 … NB-M11 |
| Low | 12 | NB-L1 … NB-L12 |

**Top issues**
1. **NB-C1 (regression, Critical):** `frontend/src/utils/api.js` `readJson()` calls itself forever. Every successful API call made through `api.js` rejects with `RangeError: Maximum call stack size exceeded`, so creating, viewing, burning, uploading and checking slugs are all broken in the UI. I confirmed this with a Node repro.
2. **NB-C2 (Critical):** KV rate-limit counters lose their TTL on the second request, which makes them permanent. On some routes the window is also passed in milliseconds where seconds are expected. Each IP is locked out **for good** after a small lifetime number of requests (10 message creations, 200 `/api/messages/*` calls). With the in-flight app-token gate, the lockout spreads to the whole app after 30 page loads. The local KV store shows `rl:`/`erl:` keys with `expiration = None`.
3. **NB-H1 (High):** "One-time access" is enforced only by the client. `GET /api/messages/:id` never burns, and `maxViews`, `maxPasswordAttempts`, `requireGeoMatch` and `autoBurnOnSuspicious` are stored but never enforced.
4. **NB-H2 (High):** `POST /api/premium/subscribe` grants Premium or Lifetime to any logged-in user with no payment check.
5. **NB-H3 (High):** API keys created in the UI are stored raw, but every consumer looks them up by SHA-256 hash. UI keys therefore never work, the public `/api/v1` API is effectively unreachable, and any working key can mint further keys with an arbitrary `rate_limit`.

---

## Critical

### NB-C1: `readJson` infinite recursion breaks every API call in `api.js` (regression)
- **Severity**: Critical (functional; core product unusable)
- **Location**: `frontend/src/utils/api.js:15-21`. Callers are at lines 43, 55, 68, 92, 102, 114, 137 and 168.
- **Description**: The helper the earlier audit added ends with `return readJson(response);` where it should end with `return response.json();`. Every successful (2xx) JSON response recurses until the stack overflows.
- **Failure scenario**: A user creates a message. `createMessage` → `readJson` → `RangeError: Maximum call stack size exceeded`, so the UI shows an error even though the server stored the message. Viewing behaves the same way: `getMessage` (metadata and ciphertext), `deleteMessage` (burn), `checkSlugAvailability`, `uploadMedia`, `getMedia` (small files) and `confirmMediaDownload` all throw. Repro: `node rj.mjs` printed `ERR RangeError Maximum call stack size exceeded`.
- **Fix**: Replace line 20 with `return response.json();`. Add a unit test for the helper and run the E2E suite before merging.

### NB-C2: Rate-limit counters become permanent, and some windows are given in milliseconds instead of seconds
- **Severity**: Critical (availability, self-inflicted DoS that also hits shared NAT/CGNAT users)
- **Location**: `backend/src/middleware/security.js:83-88` (`enhancedRateLimit`); `backend/src/middleware/rateLimit.js:23-27` (`rateLimitMiddleware`); call sites `messages.js:43` `(10, 60000)`, `messages.js:173` `(5, 60000)`, `media.js:9,63,136` `(5|50, 60000)`, `auth.js:313,349,412`, `app-token.js:11` `(30, 60)`.
- **Description**: The first request writes the counter with `expirationTtl`. Every later write is `kv.put(key, String(count + 1))` with no options. A KV `put` replaces the value **and the expiration**, and with no expiration given the key never expires. Cloudflare's own API text, embedded in `backend/node_modules/miniflare/.../kv/namespace.worker.js`, says: "If neither `expiration` nor `expiration_ttl` is specified, the key-value pair will not expire." Miniflare's `put` stores `expiration: undefined`. On top of that, `rateLimitMiddleware(limit, windowSeconds)` receives `60000` (milliseconds) as seconds, which is a 16.7-hour window.
- **Evidence**: The local dev KV store (`backend/.wrangler/state/v3/kv/...`, read-only query) contains `rl:ip:127.0.0.1:10:60000 value=5 expiration=None` and `erl:ip:127.0.0.1:200:60 value=31 expiration=None`.
- **Failure scenario**: An office behind one NAT IP creates 10 messages in total, ever. After that, every `POST /api/messages` from that IP returns 429 permanently. After 200 lifetime `/api/messages/*` calls (each view is 2–3 calls), viewing and burning are blocked permanently. With the in-flight gate (NB-H5), each page load calls `POST /api/app-token` (limit 30), so after 30 page loads the IP can make no API calls at all. An attacker can also lock out a CGNAT range on purpose.
- **Fix**: Pass `expirationTtl` on every write. For a fixed window, use a window-bucketed key such as `rl:${ip}:${Math.floor(now / windowMs)}` and always pass the TTL. Fix the `60000` call sites to seconds. Better still, use the Workers Rate Limiting binding or a Durable Object, which are atomic. Purge the existing `rl:*`/`erl:*` keys in production KV.

---

## High

### NB-H1: One-time burn is enforced only by the client; the advertised security options do nothing
- **Severity**: High (breaks the product's core guarantee)
- **Location**: `backend/src/routes/messages.js:229-281` (GET returns ciphertext without marking it accessed); `:351-397` (burn happens only when the client calls DELETE); `:52-56, 118-128` (options stored only); `backend/src/routes/audit.js:109-136` (`detectSuspiciousActivity`, never called); `frontend/src/components/SelfDestructOptions.jsx`.
- **Description**: `GET /api/messages/:identifier` returns `encryptedData/iv/salt` any number of times until somebody calls `DELETE`. Nothing on the server reads `max_views`, `view_count`, `max_password_attempts`, `password_attempts`, `require_geo_match` or `auto_burn_suspicious` (grep confirms they are only inserted or selected). `logAuditEvent` and `detectSuspiciousActivity` are dead code. `ViewMessage.jsx:48` even downloads the full ciphertext on page load, before the user enters a password.
- **Failure scenario**: A link scanner, a chat unfurler or someone watching the channel fetches `/api/messages/<token>` and keeps the ciphertext without burning it. The real recipient later opens and burns the message and sees nothing wrong. The attacker brute-forces the password offline (PBKDF2-SHA256 at 300k iterations, which is feasible for human-chosen passwords), or simply decrypts once the password leaks through another channel. "Max password attempts = 3" gives no protection, because guessing happens offline. `maxViews > 1` is also silently ignored: the first DELETE burns the message.
- **Fix**: Choose a model and enforce it on the server. Either (a) atomically mark the message accessed in GET (`UPDATE … SET accessed=1 … RETURNING encrypted_data…`) and accept that a wrong password burns it, or (b) keep retries but make the client prove knowledge of the key. For (b), derive an auth tag from the password-derived key (for example HKDF(key, "auth")), store its hash at creation, and release the ciphertext only to a correct tag, enforcing `max_password_attempts` with an atomic D1 counter. Then implement `max_views` with `view_count`, or remove the options from the UI and the docs.

### NB-H2: Premium and Lifetime plans can be activated without paying
- **Severity**: High (payment bypass)
- **Location**: `backend/src/routes/premium.js:113-174`
- **Description**: `POST /api/premium/subscribe` takes `{planId, paymentMethod, stripeCustomerId, stripeSubscriptionId}` from the client and inserts an `active` subscription. Nothing verifies a payment, whether by Stripe API, webhook signature or crypto confirmation. The code comment says it "records the subscription after Stripe confirms", but nothing confirms.
- **Failure scenario**: `curl -X POST /api/premium/subscribe -H 'X-Session-Token: <own>' -d '{"planId":"lifetime"}'` gives the caller Lifetime, valid until 2099-12-31. Any feature that later checks `user_subscriptions` will trust it.
- **Fix**: Create subscriptions only from a verified Stripe webhook (`Stripe-Signature` HMAC) or after a server-side `stripe.subscriptions.retrieve`. Make `/subscribe` start a Checkout Session and do nothing more. Remove `manual` from the client-selectable payment methods.

### NB-H3: API key storage and lookup disagree; key minting is unrestricted
- **Severity**: High (feature broken, secrets stored in plaintext, privilege expansion)
- **Location**: `backend/src/routes/api-keys.js:48-54` stores `key` raw. All lookups hash it: `api-v1.js:17-25`, `utils/apiKeys.js:8-11` (in-flight), `middleware/apiGate.js:53-59` (in-flight). `api-v1.js:312-341` mints keys. `middleware/security.js:175-204` is a dead `requireApiKey` that does a raw lookup.
- **Description**: The UI (`ApiKeyManager.jsx` → `/api/api-keys`) stores the raw key, but every consumer compares against `sha256(key)`, so a key created in the UI never authenticates. The new `apiKeys.js` comment even claims "Keys are stored as SHA-256 hashes (see routes/api-keys.js)", which is false. The only path that stores hashed keys is `POST /api/v1/api-keys`, which itself needs a working key, so no one can bootstrap. Separately, `POST /api/v1/api-keys` does not validate `rate_limit` (unlike `/api/api-keys`), and any key can mint more keys. `api_keys` has no FK to `users`, so keys survive account deletion (`auth.js:555`).
- **Failure scenario**: (1) A customer creates a key in the dashboard, calls `/api/v1/messages`, and gets `401 API_KEY_INVALID`. (2) Once someone "fixes" this by making v1 accept raw keys, a leaked key can mint `{rate_limit: 1e12}` child keys that stay valid after the parent is revoked and after the account is deleted.
- **Fix**: Store `sha256hex(key)` in `api-keys.js`. Migrate existing rows by forcing users to regenerate, since raw keys can't be re-derived. Validate `rate_limit` against the plan in every creation path. Restrict key minting to session-authenticated users only. Add `ON DELETE CASCADE` (or delete explicitly) on account deletion. Delete the dead `security.js` `requireApiKey`.

### NB-H4: Revoked sessions stay valid for up to 30 minutes (KV session cache is never invalidated)
- **Severity**: High (session revocation is ineffective)
- **Location**: `backend/src/middleware/requireAuth.js:24-29` (cache-aside, `CACHE_TTL.USER_SESSION = 1800`, `utils/cache.js:17`). Missing invalidation in `auth.js:457` (password reset → `revokeAllUserSessions`), `:596-609` (DELETE `/sessions`, "logout all devices"), `:615-639` (DELETE `/sessions/:token`) and `:534-565` (account deletion). Only `/logout` (`:232`) invalidates the cache.
- **Description**: `requireAuth` trusts the cached `{userId}` for 30 minutes and never re-checks the D1 row or the cached `expiresAt`.
- **Failure scenario**: An attacker steals a session token. The victim notices and runs "reset password" or "log out of all devices". The attacker's token keeps working on every `requireAuth` route (teams, API keys, premium, profile, account deletion) for up to 30 minutes. Sessions past `expires_at` also keep working until the cache entry expires.
- **Fix**: Cache by `sha256(token)`, and delete all cached entries for the user on revocation. For example, keep a per-user `session-epoch` in KV that is checked on each hit, or keep a per-user index of cached keys. Re-check `expiresAt` on cache hits and shorten the TTL to a few minutes.

### NB-H5: (in-flight) The app-token gate causes a full outage if `APP_TOKEN_SECRET` is unset, gives no real authentication, and multiplies NB-C2
- **Severity**: High (deployment-blocking availability risk)
- **Location**: `backend/src/middleware/apiGate.js:29-62`, `backend/src/routes/app-token.js:11-17`, `frontend/src/utils/apiBase.js:13-59`, `frontend/src/main.jsx:11`, `backend/wrangler.toml` (no `APP_TOKEN_SECRET`; only `backend/package.json` `dev` sets `dev-app-token-secret`).
- **Description**:
  - The fetch wrapper attaches `X-App-Token` to every `/api/` call, including calls from logged-in users. If `POST /api/app-token` fails, every API call rejects. The production secret is not declared anywhere in the repo, and the route fails closed with 503.
  - Tokens are anonymous and handed to anyone (30 per IP), and each one is valid for unlimited requests for 1 hour. The gate is a bot speed bump, not an access control. The "every /api/* call needs a session, API key or signed app token" comment overstates what it does.
  - `tokenCache` lives in page memory, so every page load calls `POST /api/app-token`. Combined with NB-C2's permanent counter, an IP is blocked from the whole app after 30 lifetime page loads.
  - Third-party API clients that use only `X-API-Key` hit NB-H3 at the gate itself, before reaching `/api/v1`.
- **Failure scenario**: The worker is deployed without running `wrangler secret put APP_TOKEN_SECRET`, and the site stops working for everyone. Or the secret is set, and returning users behind a shared IP are locked out within a day.
- **Fix**: Fix NB-C2 first. Declare the secret in deployment docs and in a CI check, and fail the deploy rather than the runtime. Treat the token as anti-automation only: say so in the code, and don't depend on it for authorization. Persist the token in `sessionStorage` to avoid a mint per page load. Skip the app token when a session token is present.

---

## Medium

### NB-M1: Anyone holding the message link can attach files; uploads have no binding, size or plan enforcement
- **Location**: `backend/src/routes/media.js:9-60` (`/init`), `:63-92` (`/chunk`), `:95-133` (`/complete`), `:136-198` (legacy `POST /`)
- **Description**: Upload authorization is "knows a message `token`". For non-slug messages the token **is** the share-link path (`/m/<token>`), and accessed or expired rows are not excluded. `/complete` never checks that `fileId` belongs to `token` (`customMetadata.messageToken`). It completes the R2 multipart upload before looking up the message, and throws a `TypeError` if the token doesn't exist, which orphans the object. The server never enforces the plan limits (100 MB free / 1 GB premium) or even the declared `fileSize`. Up to 10,000 parts are possible. `/complete` also trusts the client's `fileSize` for public stats.
- **Failure scenario**: A recipient (or a scanner holding the link) appends junk files to an unread message, so the real recipient sees extra "Attached Files" that fail to decrypt. An attacker creates a message with no expiry and streams hundreds of GB into R2, where it is never cleaned up. Public `total_file_size` stats can be set to any value.
- **Fix**: Require `X-Creator-Token` for every upload step and check `accessed = 0`. Verify `object.customMetadata.messageToken === token` before completing. Enforce the plan size limit server-side by counting bytes per part and capping the number of parts. Abort stale multipart uploads in the cron job. Compute stats from `object.size`.

### NB-M2: TOTP brute-force protection is weak (partial regression of the earlier H2 fix)
- **Location**: `backend/src/routes/messages.js:310-333`; `backend/src/utils/totp.js:99-113`
- **Description**: The attempt key changed from per-message to `totp_attempts:${identifier}:${ip}`. That removed the recipient-lockout DoS, but it also removed the only global cap. The check is still a non-atomic KV read-then-write that runs before verification, so a burst of parallel requests all read `count = 0`. With ±1 window, each guess succeeds with probability 3/10⁶.
- **Failure scenario**: An attacker with the link (needed anyway) spreads guesses over many IPs (IPv6 /64s) and sends them in parallel bursts. About 333k guesses are expected to pass the 2FA gate within the default 24-hour lifetime. The password is still needed afterwards, so this downgrades the message to password-only.
- **Fix**: Keep an atomic per-message counter in D1 (`UPDATE messages SET totp_attempts = totp_attempts + 1 WHERE … RETURNING totp_attempts`). Burn or lock the message after N failures in total, and keep a per-IP limit as well.

### NB-M3: Login and signup have no IP throttling; account lockout can be used as a DoS; account enumeration is possible
- **Location**: `backend/src/routes/auth.js:38-113` (signup, no rate limit), `:119-221` (login, no rate limit), `:149-157` (423 for existing users only), `:168-176` (read-then-write counter); `backend/src/routes/teams.js:266-276`
- **Description**: `/login` and `/signup` have no `rateLimitMiddleware`. The per-account lockout (5 failures → 15 minutes) can be triggered by anyone. Concurrent wrong-password requests all read the same `failed_login_attempts`, so each window allows more than 5 guesses. Account existence leaks through 423 (lockout) vs 401, 409 on signup, and `USER_NOT_REGISTERED` when adding team members, which any user can do in their own team. Only existing users pay the bcrypt cost, so response timing differs too.
- **Failure scenario**: An attacker keeps any known user locked out by sending 5 bad passwords every 15 minutes. Credential stuffing across many accounts is not throttled per IP.
- **Fix**: Add per-IP and per-email limits (atomic, see NB-C2). Prefer progressive delays or a CAPTCHA over hard lockout. Return the same response for unknown and locked accounts. Do a dummy bcrypt compare for unknown emails. Make the "add member" response the same whether or not the user exists (invite flow).

### NB-M4: HTML injection in transactional emails through `displayName`
- **Location**: `backend/src/routes/auth.js:84-92` (signup → `sendVerificationEmail`); `backend/src/utils/email.js:67-81, 92-106`; `backend/src/utils/emailTemplates.js:99,159` (`<p>Hi ${displayName},</p>`). Signup does not check the length either; only `/profile` does.
- **Description**: The user-controlled `displayName` is inserted into HTML email bodies without escaping. Signup takes any `email`, so the attacker chooses the recipient.
- **Failure scenario**: An attacker signs up with `email = victim@corp.com` and `displayName = '<a href="https://evil">Your NoteBurner account was compromised, verify here</a>'`. The victim receives a DKIM-valid email from `hello@noteburner.work` that contains attacker HTML. `forgot-password` for that email sends the same name again. *Unverified*: whether the `send_email` binding delivers to arbitrary recipients in this account's Email Routing setup.
- **Fix**: HTML-escape every interpolated value in the templates, cap `displayName` length at signup, and rate-limit signup per IP (NB-M3).

### NB-M5: Team RBAC and paywall flaws
- **Location**: `backend/src/routes/teams.js:33-40` (client-chosen `plan`), `:243` (`role` not validated on add), `:307-331` (role update has no owner protection); `backend/src/routes/branding.js:76-81, 127-134` (gates on `team.plan`)
- **Description**: (a) Any user can create a team with `plan: "enterprise"`, which gives 100 seats and unlocks custom branding and white-label without paying. (b) Any team admin can demote the owner (`PUT /:teamId/members/<ownerMemberId> {role:"viewer"}`) or other admins, taking over team administration. The owner keeps only the team-delete and GDPR-delete checks, which use `owner_id`. (c) `role` on add accepts any string. (d) Admins can add any registered user without consent.
- **Failure scenario**: A rogue admin demotes the owner, removes the other admins, and controls compliance settings and exports.
- **Fix**: Always set `plan = 'free'` on creation and change it only through verified billing. Forbid changing or removing the owner's membership, and require owner rights to grant or revoke admin. Validate `role` against the allowlist on add. Use an invitation-accept flow.

### NB-M6: Session tokens leak through logs and API responses, and are stored in plaintext
- **Location**: `backend/src/utils/cache.js:48,51,77` (logs `session:<token>` on every hit, miss and set; `observability` is enabled in `wrangler.toml`); `backend/src/routes/auth.js:571-590` (`GET /sessions` returns every raw `session_token`); `backend/migrations/0010_user_authentication.sql` (tokens are the primary key, unhashed)
- **Description**: Every authenticated request writes the bearer token into Workers logs. The session list hands every active token of the account to any one session or XSS.
- **Failure scenario**: Anyone with dashboard or log-tail access, or a log sink, can replay users' sessions. One stolen session can enumerate and take over all the user's other sessions.
- **Fix**: Key the cache and the DB on `sha256(token)`. Never log keys that contain secrets. Return an opaque session id (a hash prefix) from `/sessions`, and revoke by that id.

### NB-M7: The scheduled cleanup exceeds D1's bound-parameter limit and then fails on every run
- **Location**: `backend/src/scheduled/cleanup.js:46-51` and `:69-73` (`IN (${500 placeholders})`)
- **Description**: D1 documents a maximum of **100 bound parameters per query**. When more than 100 expired messages (or media rows) are pending, the batched `DELETE … IN (?, ?, …)` throws. This happens *after* the R2 objects were deleted, the error is caught, and the media step is skipped. The next run selects the same rows and fails the same way, so expired ciphertext stays in D1 indefinitely. *Verified against the documented D1 limit; not reproduced, because local SQLite allows more.* The job also never cleans `sessions`, `password_resets`, `login_attempts`, `message_groups` (`cleanupExpiredGroups` is never called) or abandoned multipart uploads.
- **Fix**: Chunk deletes into batches of 100 or fewer (or use `DB.batch` with per-row statements). Delete D1 rows before or alongside R2, with idempotent retries. Add cleanup for the other tables.

### NB-M8: Compliance and GDPR features are not implemented, but the API claims they are
- **Location**: `backend/src/routes/compliance.js:280-312` (GDPR delete-all), `:137-274` (exports), `:318-387` (report); `backend/src/routes/teams.js:371-465`
- **Description**: Nothing ever inserts into `team_messages` or `team_stats` (grep finds no `INSERT INTO team_messages` or `team_stats`), so team message lists, stats, exports and reports are always empty. Nothing enforces `data_retention_days` or `audit_log_retention`. "Delete all team data" runs `DELETE FROM teams`. The cascade covers only members, branding, settings and stats. **Messages (`messages.team_id`) and `audit_logs` are not deleted**, yet the response says "All team data deleted per GDPR request". The audit export also joins `audit_logs.message_id` (a token) to `team_messages.message_id` (intended as `messages.id`), so it could never match even if populated.
- **Failure scenario**: A customer relies on the GDPR erasure endpoint, and their data remains.
- **Fix**: Implement or remove these endpoints. If kept, delete `messages WHERE team_id = ?` and the related `audit_logs`/R2 objects explicitly, and enforce retention in the cron job.

### NB-M9: Secrets and capability URLs can reach third-party analytics (depends on configuration)
- **Location**: `extension/background.js:18-22` and `extension/content.js:53-60` (both open `/create?text=<selected secret>`; `content.js` was restored at 16:58); `frontend/src/pages/CreateMessage.jsx:134-138` (reads `?text`, never strips it from the URL); `frontend/src/utils/analytics.js:32-50` (GA4 `send_page_view: true`); `frontend/src/utils/clarity.js` (Microsoft Clarity session replay); routes `/m/:identifier` and `/reset-password?token=`
- **Description**: When `VITE_GA_MEASUREMENT_ID`, `VITE_GTM_ID` or `VITE_CLARITY_ID` is set at build time, these go to Google or Microsoft: page URLs including the plaintext secret from the extension's context menu, every message capability URL (which, given NB-H1, is enough to fetch the ciphertext), and password-reset tokens. Clarity's default masking does not hide arbitrary text nodes. The decrypted message is rendered in a `<pre>` (`ViewMessage.jsx:263-265`) with no `data-clarity-mask`. *Unverified*: whether these IDs are set in the production build. They are not in the repo.
- **Fix**: Never put plaintext in URLs. Have the extension pass the text by `postMessage` or encrypt inside the extension. Strip `?text`, the token and the path from analytics (`page_location` override, or don't load analytics on `/m/*`, `/create` and `/reset-password`). Add `data-clarity-mask="true"` (or Strict mode) around message input and output.

### NB-M10: The SPA served to users has no security headers
- **Location**: `backend/src/middleware/security.js:6-47` (applies only to Worker responses on `/api/*`); `frontend/public/` (no `_headers` file); `frontend/index.html`
- **Description**: CSP, `X-Frame-Options`, HSTS and the other headers are set only on JSON API responses, where they do little. HTML pages come from Cloudflare Pages without them. The Worker CSP's `connect-src` also names a different domain (`api.noteburner.app`).
- **Failure scenario**: `/m/<token>` and `/create` can be framed (clickjacking the decrypt or create buttons), and an app that handles secrets loads third-party scripts without any CSP.
- **Fix**: Add `frontend/public/_headers` with CSP (including `frame-ancestors 'none'`), `X-Frame-Options: DENY`, `Referrer-Policy: no-referrer` (because capability URLs are in use) and HSTS. Correct the domain.

### NB-M11: Custom-slug messages can be discovered and burned without authentication (earlier M1, still open)
- **Location**: `backend/src/routes/messages.js:13-40` (`GET /check-slug/:slug`, unauthenticated oracle), `:362-389` (DELETE needs no proof for non-2FA messages); `backend/src/utils/slugValidation.js` (3–20 human-chosen characters)
- **Description**: Slugs are low-entropy and existence can be tested freely. With the slug, anyone can `GET` the ciphertext (NB-H1) or `DELETE` (burn) the message.
- **Failure scenario**: An attacker walks a dictionary (`team-offsite`, `wifi-password`, …), burns every live custom-slug message, and harvests their ciphertext for offline guessing.
- **Fix**: Rate-limit `check-slug` and do not reveal existence. Require proof of decryption (NB-H1 option b) or the creator token to burn. Warn users that custom slugs are guessable.

---

## Low

| ID | Location | Issue → Fix |
|---|---|---|
| NB-L1 | `backend/src/config/cors.js:3-11,19-21` | `localhost`/`127.0.0.1` origins are in the production allowlist, and any `chrome-extension://` or `moz-extension://` origin is accepted (the ID is not pinned). Impact is limited because `credentials: false` and auth is header-based. → Build the list per environment and pin the extension IDs. |
| NB-L2 | `backend/src/index.js:76-79`; `messages.js:225`; `utils/monitoring.js:203-205` | Raw `err.message` is returned to clients (D1 errors expose schema, e.g. constraint names), and `/api/health` returns DB error text. → Return generic errors and log the details server-side. |
| NB-L3 | `backend/src/routes/auth.js:313-343, 412-467`; migration 0010 | The verification token never expires (the email says "24 hours"). Older reset tokens are not invalidated after a successful reset. Reset and verification tokens, creator tokens and TOTP secrets are stored in plaintext. → Hash the tokens, add expiries, invalidate sibling reset tokens, and encrypt `totp_secret` with a Worker secret. |
| NB-L4 | `backend/src/routes/messages.js:46-74,81,89,254`; `api-v1.js:137-190,150-159`; `messages.js:173-199` | Weak input validation. `expiresIn` is unbounded (negative, NaN, or never expiring). There are no type checks on `maxViews`/`require2FA`, and `require_2fa` is tested with `=== 1` in GET but as truthy in verify, so a non-1 value skips the gate while a secret is still issued. Messages of 2–2.9 MB pass the check but exceed D1's 2 MB row limit (500 error). `/group` has no size check (100 rows of up to 2 MB each). `api-v1` `customSlug` skips `validateSlug`. `teamId` is not checked for membership. → Normalize to 0/1, validate types and ranges, and share one validator. |
| NB-L5 | `backend/src/utils/groupMessages.js:91-123` | `accessed_count` is updated by read-modify-write, so concurrent burns lose updates and `maxViews` can be exceeded. → `UPDATE … SET accessed_count = accessed_count + 1 RETURNING accessed_count`. |
| NB-L6 | `frontend/public/sw.js:6-13, 66-91` | Every HTML navigation is cached, including `/m/<token>` (capability URLs persist on the device) and non-200 responses. `STATIC_ASSETS` precaches `/icons/icon-*.png`, which don't exist in `public/`, so the SPA-fallback HTML is pinned under icon URLs (the runtime fix doesn't cover precache). The cache version is still hand-edited. → Skip caching `/m/*`, cache only `ok` responses, fix the precache list, and inject the version at build time. |
| NB-L7 | `frontend/src/components/enterprise/TeamDashboard.jsx:96,110`, `BrandingCustomizer.jsx:30,70`, `ComplianceDashboard.jsx:72-76,114` | Some calls read the token from `sessionStorage` only, so they break for "remember me" users. The compliance export uses a bare `/api/...` path (M4 incomplete) and doesn't check `response.ok`. → Use `getAuthHeaders()` and `API_BASE` throughout. |
| NB-L8 | `frontend/src/pages/PremiumPage.jsx:17,46-48,75-81`; `frontend/src/utils/premium.js:46-51`; `backend/src/routes/premium.js:93-99` | `useAuth()` exposes no `token`, so the Premium page sends `Authorization: Bearer undefined` and every call returns 401. `isPremium()` reads `subscription.plan_id`, which the backend omits for paid users. `?redirect=` (PremiumPage:34, PricingPage:180,255) is never read by Login or Signup. → Pass the session token, add `plan_id`, and honour a same-origin-only `redirect`. |
| NB-L9 | `backend/src/routes/audit.js:24-28`; `frontend/src/pages/CreateMessage.jsx:248` | The audit endpoint matches `messages.id` (an INTEGER) against the token the UI sends, so it always returns 404. Only `created` events are ever logged. → Query by `token`. |
| NB-L10 | `frontend/src/App.jsx:69-103`; `backend/src/utils/email.js:68` | Email links point to `/verify-email?token=`, but there is no such route, so links fall through to `HomePage` and users can never verify. → Add the page. |
| NB-L11 | `backend/src/routes/integrations.js:55,157,280` | The Slack, Zapier and Discord creators `INSERT` into the non-existent columns `content` and `password`, so they always return 500. As written, they would store plaintext server-side and put the password in the link (`?p=`), which breaks the zero-knowledge model. Webhooks are stored but never dispatched, so there is no SSRF today; they validate only `https://` with no private-range or DNS-rebinding checks. → Remove, or redesign to use client-side encryption. |
| NB-L12 | `extension/manifest.json`; `extension/content.js:15-82`; `extension/background.js:55-62`; `extension/crypto.js:66-71,123,~190` | `content.js` (restored 16:58, now uses `textContent`) is injected on `<all_urls>` and adds a floating button to every site whenever text is selected. That means one extension script runs on every page and is exposed to page-side clickjacking and overlay tricks. `chrome.notifications` is used without the permission. A `localhost` host permission ships in the production manifest. `generatePassword` has modulo bias (70 characters). Full response bodies, including `creatorToken`, are logged. The API host is a hard-coded `workers.dev` URL. → Clean up. |

---

## Verification of earlier audit fixes

| Earlier item | Status | Evidence / notes |
|---|---|---|
| **C1** `extension.pem` committed | **Incomplete** | Removed from the index (`D  extension.pem/.crx`), and `*.pem`/`*.crx` added to `.gitignore`. The key is still in history (`8d668c2`) and on the remote. Rotation can't be verified from the repo. |
| **C2** TOTP not enforced | **Confirmed (backend), regressed end-to-end** | GET returns only metadata without a valid `X-TOTP-Proof` (`messages.js:254-263`), and DELETE requires the proof or the creator token (`:382-389`). The proof is an HMAC over `identifier:expiry` and is verified in constant time. The flow is unusable in the UI because of **NB-C1**. Remaining issues: NB-M2. The proof is keyed with the TOTP secret, which recipients also hold, rather than a server secret (acceptable, since the holder can mint codes anyway). A proof that expires after 10 minutes yields a misleading "incorrect password" error and hides the TOTP input (`ViewMessage.jsx:88-89,121-128`). |
| `includeTotpSecret` option | **Confirmed** | The default column list excludes `totp_secret` (`messageHelpers.js:6-11,21-23`). Only GET, verify and DELETE opt in, and the GET response object is built explicitly, so the secret is not leaked. |
| **H1** `Math.random` secrets | **Confirmed** | `totp.js:22-31` uses `getRandomValues` with `& 31` (uniform). Slugs use rejection sampling (`slugValidation.js:153-158`). `node --test`: 6/6 pass (Node, not workerd). |
| **H2** TOTP brute force / constant time | **Partially fixed; partially regressed** | Constant-time compare added. The secret is still in plaintext. KV is still non-atomic. The per-IP key removed the global cap (NB-M2). |
| **H3** vulnerable deps | **Confirmed** | `npm audit --omit=dev` at the root workspace reports `found 0 vulnerabilities`. hono is 4.13.19. The nanoid 5→6 major bump still exports `nanoid` and `customAlphabet`. |
| **H4** `/api/cleanup` | **Confirmed removed** | The route file is deleted and unmounted. The scheduled job now has NB-M7. |
| **M1** burn without reading | **Open** (2FA messages only now protected) | See NB-M11 and NB-H1. |
| **M2** racy / fail-open rate limiting | **Open, and worse than reported** | NB-C2 (permanent counters, ms/s mix-up). |
| **M3** CORS | **Mostly confirmed** | Returns `null` for no or unknown origin. Hono's cors middleware then sets no ACAO (`node_modules/hono/dist/middleware/cors/index.js:59-77`). `X-TOTP-Proof` and `X-App-Token` were added to `allowHeaders`. Localhost is still allowed and the extension ID is not pinned (NB-L1). `Authorization`, which `premium.js` uses, is **not** in `allowHeaders`, so cross-origin deployments of the premium calls would fail preflight. |
| **M4** API base URL | **Incomplete** | `apiBase.js` is used by most callers. Remaining: `ComplianceDashboard.jsx:72` (bare path), the extension's hard-coded `workers.dev` host, the backend fallbacks to `noteburner.app` (`api-v1.js:198`, `integrations.js`), and the CSP domain. |
| **M5** `response.json()` crashes | **Regressed** | `api.js` `readJson` recursion (NB-C1). Many other components still call `.json()` without a guard (PremiumPage, TeamDashboard, AuthContext, Branding, Compliance). |
| **M6** service worker | **Partially fixed** | Accept-header guard ✓. Runtime HTML-fallback caching for paths with an extension ✓. Not done: build-derived cache version, the precache problem, caching of non-200 HTML and capability URLs (NB-L6). |
| **pwa.js** online/offline | **Confirmed** | No toast on first load. 1.5 s debounce. Notifies only on real transitions. No regressions found. |
| **L1** `.env.test` | **Open** | Still tracked (localhost values only). |
| **L2** extension `innerHTML` | **Fixed** | `popup.js` and `content.js` (restored 16:58) use `textContent`. |
| **L3** serial cleanup loop | **Superseded** | The endpoint was removed. The cron job batches but hits NB-M7. |
| **L4** password policy / bcrypt cost | **Open** | Unchanged. |
| **L5** version drift | **Mostly fixed** | Manifests and API are now 1.14.0. |
| **L6** unit tests | **Started** | `backend/test/totp.test.js` and `appToken.test.js`. `verifyTOTP('000000'…)` uses `&&`, so it is a weak assertion. |
| **Bug 1** QR never renders | **Confirmed fixed** | `TOTPSetup.jsx` generates the QR client-side from `totpData.uri`. |
| **Bug 2** non-JSON crashes | **Regressed** | NB-C1. |

---

## What I did NOT cover

- **No dynamic testing.** I did not start servers or send requests; a `wrangler dev` started by someone else was running. Runtime behaviour in **workerd** (for example `node:crypto` `getRandomValues` and `timingSafeEqual` under `nodejs_compat_v2`) is inferred, not executed. The unit tests ran in Node.
- **Production configuration**: whether `APP_TOKEN_SECRET`, `SLACK_SIGNING_SECRET`, `TOTP_ENCRYPTION_KEY` or the analytics IDs are set; the Cloudflare plan's CPU limits (bcryptjs cost 10 on the free plan); whether Email Routing restricts recipients; and Pages/WAF settings.
- **The D1 100-parameter limit** (NB-M7) and **KV TTL semantics** (NB-C2) are verified against Cloudflare's documented behaviour and Miniflare's implementation, not against production.
- Git history beyond `extension.pem`: I did not scan for other secrets in history. CI workflows (`.github/`), Semgrep config and Playwright specs were not reviewed.
- Frontend files I did not read in full: `HomePage`, `HeroSection`, `CreateMessageForm`, `SignupPage`, `ForgotPasswordPage`, referrals and achievements (local-storage gamification), the i18n files, `ChangelogPage` and `parseChangelog.js`, `share.js` (only partly), mobile components, onboarding, and templates. The grep for `dangerouslySetInnerHTML`, `innerHTML`, `eval` and `document.write` across `frontend/src` found no hits.
- Extension: I did not review `popup.html`, `popup.css`, `build.sh` or the publishing docs.
- Dependencies: only the production tree, via `npm audit --omit=dev`. Dev dependencies and transitive licensing were not reviewed.
- The in-flight files (`apiGate.js`, `appToken.js`, `app-token.js`, `apiKeys.js`, `slackSignature.js`, the `integrations.js` changes, `apiBase.js` `installApiAuth`) were reviewed as they stood at 16:50–16:56 IST and may change after this report.

---

## Remediation status (2026-11-17)

Verified with 9 unit tests (`cd backend && npm test`) and a 27-check live run against a local Worker
(one-time access, 2FA, API keys, sessions, premium, teams, media, lockout). The Playwright suite was **not** re-run.

| ID | Status | What changed |
|---|---|---|
| NB-C1 | Fixed | `readJson` recursion removed (`frontend/src/utils/api.js`) |
| NB-C2 | Fixed | Fixed-window KV counter that keeps its expiry (`utils/kvCounter.js`); callers pass seconds; regression tests |
| NB-H1 | Fixed | Password-derived auth tag; server enforces it, `max_password_attempts` (atomic), one view (atomic claim), and requires the tag to burn. New `GET /:id/meta`. Migration `0013`. Groups/legacy messages have no tag. |
| NB-H2 | Fixed | `/subscribe` no longer grants plans (501). Plans only via signature-verified Stripe webhook. **Checkout itself is not built.** |
| NB-H3 | Fixed | UI keys stored hashed; `/api/v1/api-keys` minting removed; keys deleted with the account; dead middleware removed. **Existing raw-stored keys must be regenerated.** |
| NB-H4 / M6 | Fixed | No KV session cache; tokens hashed at rest; `/sessions` returns opaque ids; token no longer logged. **All existing sessions are invalidated (users log in again).** |
| NB-H5 | Mitigated | Token persisted per tab, skipped when a session/API key is present, secret documented. Still anti-automation only, and **`APP_TOKEN_SECRET` must be set before deploy.** |
| NB-M1 | Fixed | Uploads need the creator token, an unaccessed unexpired message, ownership check before completing, part/size caps, measured stats |
| NB-M2 | Fixed | Atomic per-message TOTP counter (burn after 10), per-IP limit kept |
| NB-M3 | Mostly fixed | IP rate limits on login/signup, atomic lockout counter, dummy bcrypt, generic locked response, team-add no longer reveals accounts. **Signup `409` still reveals registered emails.** |
| NB-M4 | Fixed | All email template values HTML-escaped; `displayName` capped/stripped |
| NB-M5 | Fixed | Plan forced to `free`; owner role immutable; only the owner grants/revokes/removes admins; role validated |
| NB-M7 | Fixed | Chunked deletes (≤90 params), plus housekeeping for sessions, resets, login attempts, accessed messages |
| NB-M8 | Partly fixed | GDPR delete now removes messages, audit logs and R2 files. **Team exports/stats/retention are still not implemented** (`team_messages` is never written). |
| NB-M9 | Mostly fixed | Extension passes text in the URL fragment; page strips it; GA gets sanitized paths; Clarity off on sensitive routes; message text masked. Not verified in a browser. |
| NB-M10 | Fixed | `frontend/public/_headers` (CSP, frame-ancestors, HSTS, no-referrer). **CSP is untested against the live site; check the console after deploy.** |
| NB-M11 | Mostly fixed | `check-slug` rate-limited; burning needs proof of the password. Slug existence is still discoverable by design. |
| NB-L1 | Fixed | localhost origins refused in production; `Authorization` header allowed |
| NB-L2 | Fixed | Generic 500s and health errors |
| NB-L3 | Partly fixed | Verification/reset tokens hashed, 24 h verification expiry, sibling reset links invalidated. **Creator tokens and `totp_secret` are still stored in plaintext.** |
| NB-L4 | Partly fixed | Options clamped, `expiresIn` bounded, size cap under D1 row limit. **`api-v1` `customSlug`/`teamId` checks not done.** |
| NB-L5 | Fixed | Atomic group counter |
| NB-L6 | Mostly fixed | Capability URLs/non-OK pages not cached, precache list fixed. **Cache version still hand-edited; PWA manifest icons (`/icons/*`) are missing from `public/`.** |
| NB-L7 / L8 / L9 / L10 | Fixed | Auth headers via `getAuthHeaders()`, Premium page token + `plan_id`, same-origin `?redirect=`, audit by token, `/verify-email` page |
| NB-L11 | Fixed (disabled) | Slack/Zapier/Discord creators return 501; webhook URLs reject private hosts |
| NB-L12 | Mostly fixed | Auth tag, no secret logging, unbiased generator, production API host, no localhost host permission, notifications permission. **`content.js` still runs on `<all_urls>`.** |

Needs your action: deploy secrets (`APP_TOKEN_SECRET`, `SLACK_SIGNING_SECRET` if used, `STRIPE_WEBHOOK_SECRET` if billing), apply migration `0013`, rotate the leaked extension key.

### Follow-up: UI-only protections (NB-H1, remaining part)
`require_geo_match` and `auto_burn_suspicious` were stored but never enforced. They are now enforced server-side (`backend/src/utils/protections.js`, `utils/geo.js`) using Cloudflare's country, with `backend/test/geo.test.js` and `e2e/protections.spec.js` (18 tests, mutation-checked) plus UI tests. See `AGENTS.md` for the exact rules.
