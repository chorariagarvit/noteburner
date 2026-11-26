# Backups and disaster recovery

What is stored where, how it is backed up, and the exact steps to recover. Written to be followed under stress.

## What holds what

| Store | Holds | Lost means | Protection |
|---|---|---|---|
| **D1** `noteburner-db` | Messages (ciphertext only), accounts, teams, audit log, stats | Accounts and unread messages are gone | Cloudflare **Time Travel** (restore to any minute in the last 30 days) + nightly encrypted export (below) |
| **R2** `noteburner-media` | Encrypted attachments, deleted after download or expiry | Unread attachments are gone | None needed beyond expiry: the data is short-lived by design |
| **KV** `CACHE` | Cached counters | Nothing important | Rebuilds itself |
| **Durable Object** `RATE_LIMITER` | Rate-limit counters | Counters reset | Rebuilds itself |
| **Worker secrets** | `APP_TOKEN_SECRET`, `TOTP_ENCRYPTION_KEY`, `STRIPE_WEBHOOK_SECRET`, ... | Losing `TOTP_ENCRYPTION_KEY` locks every user with 2FA out | Keep a copy in your password manager (not in the repo) |

Messages are encrypted in the browser, so a database backup never contains readable message text.

## Nightly export (GitHub Action)

`.github/workflows/d1-backup.yml` runs at 02:17 UTC, exports the production database, **encrypts it with AES-256**, and keeps it as a workflow artifact for 30 days.
The repository is public, so the export is never uploaded unencrypted.

One-time setup, in GitHub → Settings → Secrets and variables → Actions:

1. `CLOUDFLARE_API_TOKEN`: a token with **D1 Edit** permission only (Cloudflare → My Profile → API Tokens)
2. `CLOUDFLARE_ACCOUNT_ID`: shown on the Cloudflare dashboard overview
3. `BACKUP_PASSPHRASE`: a long random passphrase. **Also save it in your password manager**: without it the backups cannot be opened

Until all three exist the workflow skips itself with a warning. Run it once by hand (Actions → Database backup → Run workflow) and confirm the artifact appears.

To open a backup:

```bash
openssl enc -d -aes-256-cbc -pbkdf2 -iter 600000 -pass env:BACKUP_PASSPHRASE \
  -in noteburner-2026-11-26.sql.enc -out noteburner-2026-11-26.sql
```

## Recovering

**A. Bad data or a bad migration, within the last 30 days (fastest): Time Travel**

```bash
cd backend
npx wrangler d1 time-travel info noteburner-db                              # shows the current bookmark
npx wrangler d1 time-travel restore noteburner-db --timestamp=2026-11-26T09:30:00Z
```

Restoring is itself undoable: the command prints the bookmark from just before the restore.

**B. Database deleted or Time Travel unavailable: restore the nightly export**

```bash
cd backend
npx wrangler d1 create noteburner-db           # only if the database no longer exists; put the new id in wrangler.toml
npx wrangler d1 execute noteburner-db --remote --file ../noteburner-2026-11-26.sql
```

**C. A migration went wrong**

1. Roll back the Worker release first (`git revert`, push to `main`), so the code no longer needs the new columns.
2. Back up (Time Travel bookmark or a manual `wrangler d1 export`).
3. `scripts/migrate-down.sh 0014 --remote` (type the number again to confirm). Only the newest migration should be rolled back.
4. Every migration from 0013 on has a rollback file in `backend/migrations-rollback/`, and a test fails if one is missing.

## If the whole site is down

1. Check Cloudflare status (cloudflarestatus.com) and the Worker logs: `cd backend && npx wrangler tail`.
2. Roll back the last deploy: Cloudflare dashboard → Workers → `noteburner-api` → Deployments → pick the previous version → Rollback. The site (Pages) has the same option.
3. If a code release caused it, revert the commit on `main`; both deploy automatically.
4. After recovery, run `npm run check:live-csp --workspace=frontend` and open a test message from `https://noteburner.work`.

## Practise it

Once a quarter: restore the latest export into a scratch D1 database (`wrangler d1 create noteburner-restore-test`), run a few `SELECT COUNT(*)` queries, then delete it. A backup that has never been restored is only a hope.
