# NoteBurner Roadmap 🔥

**Mission**: Make NoteBurner the go-to platform for secure, self-destructing messages.

**Current version**: v1.14.0 (Mar 13, 2026) · **Next**: Week 15 — TBD

> This file covers **status and what's next**. Per-release details live elsewhere:
> - [CHANGELOG.md](CHANGELOG.md) — what shipped in each version
> - [docs/WEEKn_SUMMARY.md](docs/) — implementation notes, files and metrics for each week
> - [docs/E2E_TESTING.md](docs/E2E_TESTING.md) — test suite

---

## 1. Where we are

Weeks 1–14 are done and deployed to Cloudflare (Workers + Pages). Everything shipped so far:

| Week | Version | Released | Focus | Details |
|---|---|---|---|---|
| — | v1.0.0 | Dec 7, 2025 | Initial launch: AES-256-GCM client-side encryption, one-time access, file upload | — |
| 1 | v1.1.0 | Dec 17, 2025 | Analytics & social proof (stats counters, platform stats) | [Week 1](docs/WEEK1_SUMMARY.md) |
| 2 | v1.2.0 | Dec 23, 2025 | Viral mechanics (post-burn CTA, preview page, confetti) | [Week 2](docs/WEEK2_SUMMARY.md) |
| 2.5 | — | Dec 23, 2025 | Playwright E2E test setup (no version bump) | [E2E](docs/E2E_TESTING.md) |
| 3 | v1.3.0 | Dec 28, 2025 | Custom URLs, QR codes, countdown timer, OG tags | [Week 3](docs/WEEK3_SUMMARY.md) |
| 4 | v1.4.0 | Jan 8, 2026 | Gamification (achievements, leaderboard, streaks, mystery mode) | [Week 4](docs/WEEK4_SUMMARY.md) |
| 5 | v1.5.0 | Jan 14, 2026 | Network effects (group messages, referrals, browser extension, invite) | [Week 5](docs/WEEK5_SUMMARY.md) |
| 6 | — | Jan 20, 2026 | UI/UX polish (onboarding, templates, shortcuts, a11y) — no version bump | [Week 6](docs/WEEK6_SUMMARY.md) |
| 7 | v1.6.0 | Jan 23, 2026 | Mobile & PWA (installable, offline, camera, share sheet) | [Week 7](docs/WEEK7_SUMMARY.md) |
| 8 | v1.7.0 | Feb 9, 2026 | Platform integrations (Slack, Discord, Zapier, webhooks, REST API) | [Week 8](docs/WEEK8_SUMMARY.md) |
| 9 | v1.8.0 | Feb 9, 2026 | Security (password meter, self-destruct options, audit log, 2FA, headers) | [Week 9](docs/WEEK9_SUMMARY.md) |
| 10 | v1.9.0 | Feb 20, 2026 | Enterprise (teams/RBAC, API keys, branding, GDPR dashboard) | [Week 10](docs/WEEK10_SUMMARY.md) |
| 11 | v1.10.0 | Feb 24, 2026 | User authentication (signup, sessions, reset, brute-force lockout) | [Week 11](docs/WEEK11_SUMMARY.md) |
| 12 | v1.12.0 | Mar 4, 2026 | Scaling & performance (KV cache, DB indexes, health checks) | [Week 12](docs/WEEK12_SUMMARY.md) |
| 13 | v1.13.0 | Mar 12, 2026 | Internationalization (EN/ES/FR/DE/ZH/HI, locale middleware) | [Week 13](docs/WEEK13_SUMMARY.md) |
| 14 | v1.14.0 | Mar 13, 2026 | Premium (Premium $5/mo, Lifetime $49, pricing page, dashboard) | [Week 14](docs/WEEK14_SUMMARY.md) |

**Numbering notes**
- Version numbers follow the git tags / `package.json`, not the week number. Weeks 2.5 and 6 shipped without a version bump.
- Weeks 8 and 9 were released together on Feb 9.
- There is no v1.11. The Week 12 API string was set to `1.11.0` in code, but the release is v1.12.0.
- Dates come from git history. Older drafts of this file disagreed with each other and with the CHANGELOG.

---

## 2. What's next

**Week 15: TBD.** Pick from the open items below.

### Launch checklist (still open)
- [ ] Set up custom domain
- [ ] Add analytics (GA4 / Clarity / Plausible — see [docs/ANALYTICS_SETUP.md](docs/ANALYTICS_SETUP.md))
- [ ] Product Hunt submission
- [ ] Social media accounts (Twitter/X, Reddit)
- [ ] Connect Stripe for real payments (Week 14 backend is Stripe-ready but not live)
- [ ] Load testing (planned in Week 12, not done)

### Technical debt
- [ ] Comprehensive error boundaries
- [ ] Request retry logic
- [ ] Database migration rollback system
- [ ] Automated backups
- [ ] Disaster recovery runbook

### Ideas (post-Q2, unscheduled)
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

### Release cadence (target: weekly)
1. **Mon** — branch from `main`
2. **Mon–Thu** — develop and test
3. **Fri** — code review, merge to `staging`
4. **Sat** — staging deploy and QA
5. **Sun** — production deploy and monitoring

In practice weeks were sometimes merged straight to `main` or released together.

### Testing
Unit tests for new functions · integration tests for API endpoints · E2E tests for critical flows · manual QA checklist per feature.

### Review checklist
- [ ] Linting passes (no warnings)
- [ ] Tests pass
- [ ] Performance impact assessed
- [ ] Security review completed
- [ ] Documentation updated
- [ ] CHANGELOG entry added

## 6. Contributing

Solo project for now, open to collaboration in Q2:
1. Check the latest feature branch
2. Open an issue to discuss your idea
3. Fork and PR with tests
4. Follow the code style guidelines

---

**Last updated**: Mar 13, 2026 · **Current version**: v1.14.0 · **Next release**: Week 15 — TBD
