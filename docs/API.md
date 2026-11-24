# NoteBurner API

Base URL: `https://noteburner.work/api` (the Worker is served under `/api/*` on the site's domain). Request and response bodies are JSON.

NoteBurner is zero-knowledge: **clients encrypt before sending**. The server stores ciphertext and never sees a plaintext message or a password. The reference implementations of the crypto are `frontend/src/utils/crypto.js` (web app) and `extension/crypto.js` (identical, with a parity test): AES-256-GCM with a key from PBKDF2-SHA256 (300,000 iterations), plus a separate password-derived **auth tag** (`deriveAuthTag`) that proves knowledge of the password to the server without revealing it. `iv` and `salt` are 16 random bytes, base64.

## Authentication

Every `/api/*` call needs one of:

| Method | Header | For |
|---|---|---|
| Signed app token | `X-App-Token: <token>` | Anonymous clients (the web app, the extension): get one from `POST /api/app-token`; it lasts about an hour |
| User session | `X-Session-Token: <token>` or `Authorization: Bearer <token>` | Signed-in users (from `POST /api/auth/login`) |
| API key | `X-API-Key: nb_...` | Programs, with `/api/v1` (create keys in the app or with `POST /api/api-keys` from a session) |

Open without credentials: login, signup, verify-email, password reset, `/api/app-token` and `/api/health`.

```http
POST /api/app-token
→ 200 { "token": "...", "expiresAt": 1795000000000 }
```

If the operator enabled Cloudflare Turnstile, the call first answers `403 {"code":"CHALLENGE_REQUIRED","siteKey":"..."}`; send the solved widget as `{"turnstileToken":"..."}` and retry. `503 AUTH_NOT_CONFIGURED` means the server has no signing secret. Rate-limited calls answer `429` with `X-RateLimit-*` headers.

API keys and sessions are shown once at creation and stored hashed.

## Messages (browser and extension clients)

### Create: `POST /api/messages` (10 per minute per client)

```json
{
  "encryptedData": "<base64 ciphertext>", "iv": "<base64 16 bytes>", "salt": "<base64 16 bytes>",
  "authTag": "<password proof from deriveAuthTag(password, salt)>",
  "expiresIn": 86400,
  "maxViews": 1, "maxPasswordAttempts": 3,
  "requireGeoMatch": false, "autoBurnOnSuspicious": false, "require2FA": false,
  "customSlug": "my-link"
}
```

`expiresIn` is seconds (1 second to 30 days; omit for no expiry). `maxViews` and `maxPasswordAttempts` are 1 to 10, or `-1` for unlimited. `require2FA` adds a TOTP secret to the response.

```json
201 { "success": true, "token": "...", "creatorToken": "...", "slug": null,
      "url": "https://noteburner.work/m/<token>", "totp": { "secret": "...", "uri": "otpauth://..." } }
```

Keep `creatorToken`: it is shown once, is stored hashed, and is the only credential that can burn the message without the password, read its audit log or attach files.

### Create a group: `POST /api/messages/group` (5 per minute)

Same ciphertext fields plus `recipientCount` (1 to 100), optional `maxViews` (1 to 100, the number of burned links after which the whole group burns), `burnOnFirstView` and `expiresIn`. Returns one link per recipient: `{ groupId, links: [{ recipientIndex, token, url }], expiresAt }`. Group links carry no auth tag.

### Read

- `GET /api/messages/:token/meta`: salt, expiry and the protections that apply, without the ciphertext: `{ salt, expiresAt, createdAt, totpRequired, authRequired, geoRestricted, geoAllowed, autoBurn }`.
- `POST /api/messages/:token/verify-totp` with `{ "code": "123456" }` returns `{ proof }` for 2FA messages; send it as `X-TOTP-Proof` below (valid 10 minutes; guesses are capped per message).
- `GET /api/messages/:token` with `X-Auth-Tag` (and `X-TOTP-Proof` for 2FA messages) returns `{ encryptedData, iv, salt, mediaFiles, viewsRemaining }` and counts one view. A wrong tag counts against `maxPasswordAttempts` and the message is destroyed at the limit.
- `DELETE /api/messages/:token` burns it, with `X-Creator-Token` or `X-Auth-Tag`.

Typical errors: `401 AUTH_TAG_REQUIRED` / `BAD_AUTH_TAG`, `403 TOTP_REQUIRED`, `403 GEO_RESTRICTED` (the visitor's country is not the sender's), `404` (gone), `410 ALREADY_VIEWED`, `410 BURNED_ATTEMPTS`, `410 AUTO_BURNED`, `429`.

## Programmatic API: `/api/v1` (API key)

| Method and path | Purpose |
|---|---|
| `POST /api/v1/messages` | Create a message |
| `GET /api/v1/messages` | List your messages (`limit`, `offset`, optional `team_id`) |
| `GET /api/v1/messages/:id` | One of your messages |
| `DELETE /api/v1/messages/:id` | Delete (burn) it |
| `GET /api/v1/stats` | `{ total_messages, ..., total_views }` for your messages |
| `GET /api/v1/api-keys`, `DELETE /api/v1/api-keys/:id` | Inspect and revoke keys |

`POST /api/v1/messages` takes the same encrypted fields as above, with `expiresInMinutes` (1 to 43200, default 1440) instead of `expiresIn`, and optionally `teamId` (you must be a member or admin; if the team's compliance settings require a password, `authTag` is mandatory: `400 PASSWORD_REQUIRED`):

```json
201 { "success": true, "token": "...", "creator_token": "...", "url": "https://noteburner.work/m/<token>", "expires_at": "2026-12-01T12:00:00.000Z" }
```

The list and read calls never return `creator_token`; a message can only be read through the one-time link. Errors carry a `code`: `INVALID_IV_OR_SALT`, `MESSAGE_TOO_LARGE` (413), `INVALID_EXPIRY`, `INVALID_SLUG`, `SLUG_TAKEN`, `TEAM_ACCESS_DENIED`.

## Webhooks (subscriptions only)

`POST /api/integrations/webhooks/subscribe` with `{ "api_key": "...", "webhook_url": "https://...", "events": ["message.created", "message.viewed", "message.burned"] }` stores a public HTTPS endpoint (private and local hosts are refused; the default event is `message.burned`).

**Delivery is not implemented yet:** the subscription is saved, but the backend does not send events to it. Do not rely on webhooks until delivery (with request signing) is built; it is on the [roadmap](../ROADMAP.md).

## Audit log: `GET /api/audit/:token`

With `X-Creator-Token`: the message's access history (events, country code only, timestamps). IP addresses are never stored; entries are deleted after 30 days.

## Accounts, teams and compliance (signed-in users)

- **Auth**: `POST /api/auth/signup | login | logout | refresh | verify-email | forgot-password | reset-password`, `GET /api/auth/me`, `PUT /api/auth/profile`, `DELETE /api/auth/account`, `GET | DELETE /api/auth/sessions`, `DELETE /api/auth/sessions/:id`. Signup answers the same way for new and existing emails.
- **Teams**: `POST | GET /api/teams`, `GET | PUT | DELETE /api/teams/:id`, members under `/api/teams/:id/members`, `GET /api/teams/:id/messages` (members; metadata only) and `GET /api/teams/:id/stats` (admins; `total_messages`, `viewed_messages`, `burned_messages`, `active_messages`, `member_count`, 30 days of daily counters).
- **Branding** (Team or Enterprise plan; admins): `GET | PUT /api/branding/:teamId`. Logo and favicon must be plain https URLs, the footer at most 500 characters, white label needs Enterprise.
- **Compliance** (admins): `GET | PUT /api/compliance/:teamId/settings` (`data_retention_days` 1 to 3650, `audit_log_retention` 1 to 30, `auto_delete_enabled`, `require_password`, ...), `GET .../export/audit-logs` and `.../export/messages` (JSON or `?format=csv`), `GET .../report`, and the team owner's `POST .../gdpr/delete-all` with `{ "confirmation": "DELETE_ALL_DATA" }`.
- **Files**: `POST /api/media` (creator token; small files), `POST /api/media/init | chunk | complete` (large files, in chunks), `GET /api/media/:fileId`; `DELETE /api/media/:fileId` confirms a download and only works for files of an already-burned message. The hard limit is 2 GB.
- **Billing**: `GET /api/premium/plans | status | usage`, `DELETE /api/premium/cancel`, and the signature-verified `POST /api/premium/webhook` (plans change only through it).
- **Other**: `GET /api/stats` (public counters), `GET /api/health`, `/api/health/deep`, `/api/health/ping`.

## Errors

Errors look like `{ "error": "message", "code": "MACHINE_READABLE" }`. `400` invalid input, `401` missing or wrong credentials, `403` not allowed (role, plan, country, 2FA), `404` not found or already gone, `409` conflict (for example a taken slug), `410` destroyed, `413` too large, `429` rate limited, `503` the server is not configured (for example no signing secret) or a dependency is down.

## Not available

The Slack, Zapier and Discord message creators (`/api/integrations/slack/*`, `/zapier/create`, `/discord/create`) answer `501`: the earlier versions put plaintext and the password in the link, so they are switched off until they are rebuilt around client-side encryption. There is no checkout endpoint yet: payments arrive through the Stripe webhook only.
