# NoteBurner - Claude Code Guide

@AGENTS.md

## Claude Code specifics

- The shared project guide above (architecture, security rules, deploy order, conventions) is in `AGENTS.md`; keep project-wide guidance there so every agent sees the same rules.
- Prefer the dedicated file tools over shell `cat`/`sed`; run independent checks (unit tests, frontend build) in parallel.
- Dev servers and Playwright runs are long-lived: start them with background execution and wait for completion instead of polling.
- Use the `code-review` skill for diffs and `security-review` for anything touching auth, sessions, one-time access, uploads or billing.
