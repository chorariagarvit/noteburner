# Backups and disaster recovery

What is stored where, how it is backed up, and the exact steps to recover. Written to be followed under stress.

## What holds what

| Store | Holds | Lost means | Protection |
|---|---|---|---|
| **D1** `noteburner-db` | Messages (ciphertext only), accounts, teams, audit log, stats | Accounts and unread messages are gone | Cloudflare **Time Travel** (restore to any minute in the last 30 days; always on) |
| **R2** `noteburner-media` | Encrypted attachments, deleted after download or expiry | Unread attachments are gone | None needed beyond expiry: the data is short-lived by design |
| **KV** `CACHE` | Cached counters | Nothing important | Rebuilds itself |
| **Durable Object** `RATE_LIMITER` | Rate-limit counters | Counters reset | Rebuilds itself |
| **Worker secrets** | `APP_TOKEN_SECRET`, `TOTP_ENCRYPTION_KEY`, `STRIPE_WEBHOOK_SECRET`, ... | Losing `TOTP_ENCRYPTION_KEY` locks every user with 2FA out | Keep a copy in your password manager (not in the repo) |

Messages are encrypted in the browser, so a database backup never contains readable message text.

## Extra backup (shelved)

Time Travel lives in the same Cloudflare account as the database, so it does not help if the whole account or the database itself is lost.
An off-account copy (a scheduled export, encrypted before it is stored) was designed and then shelved: Time Travel covers the realistic failures.
Revisit it if the data becomes harder to lose. Manual export, any time: `cd backend && npx wrangler d1 export noteburner-db --remote --output backup.sql` (the file holds e-mail addresses and password hashes: keep it private).

## Recovering

**A. Bad data or a bad migration, within the last 30 days (fastest): Time Travel**

```bash
cd backend
npx wrangler d1 time-travel info noteburner-db                              # shows the current bookmark
npx wrangler d1 time-travel restore noteburner-db --timestamp=2026-11-26T09:30:00Z
```

Restoring is itself undoable: the command prints the bookmark from just before the restore.

**B. Database deleted, or older than 30 days:** restore a manual export if you made one:

```bash
cd backend
npx wrangler d1 create noteburner-db           # only if the database no longer exists; put the new id in wrangler.toml
npx wrangler d1 execute noteburner-db --remote --file backup.sql
```

**C. A migration went wrong**

1. Roll back the Worker release first (`git revert`, push to `main`), so the code no longer needs the new columns.
2. Note the Time Travel bookmark (`wrangler d1 time-travel info noteburner-db`) so you can restore to it if needed.
3. `scripts/migrate-down.sh 0014 --remote` (type the number again to confirm). Only the newest migration should be rolled back.
4. Every migration from 0013 on has a rollback file in `backend/migrations-rollback/`, and a test fails if one is missing.

## If the whole site is down

1. Check Cloudflare status (cloudflarestatus.com) and the Worker logs: `cd backend && npx wrangler tail`.
2. Roll back the last deploy: Cloudflare dashboard → Workers → `noteburner-api` → Deployments → pick the previous version → Rollback. The site (Pages) has the same option.
3. If a code release caused it, revert the commit on `main`; both deploy automatically.
4. After recovery, run `npm run check:live-csp --workspace=frontend` and open a test message from `https://noteburner.work`.

## Practise it

Once a quarter, run a Time Travel restore against a scratch copy or read the `info` output, so the commands are familiar before you need them.
