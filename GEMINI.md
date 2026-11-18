# NoteBurner - Gemini CLI Guide

@./AGENTS.md

## Gemini CLI specifics

- The shared project guide above (architecture, security rules, deploy order, conventions) is in `AGENTS.md`; keep project-wide guidance there.
- Explore with read-only commands first (`rg`/`grep`, `git log`, `git diff`) and confirm before running anything destructive or long-lived.
- For this repo the verification loop is: `cd backend && npm test` → `cd frontend && npm run build` → `npx playwright test --project=chromium` (the e2e run applies local D1 migrations and starts both dev servers itself).
- Dev servers use a dev-only `APP_TOKEN_SECRET`; never copy that value into production config.
