# NoteBurner Roadmap 🔥

**Mission**: Make NoteBurner the go-to platform for secure, self-destructing messages.

**Launch Strategy**: Weekly feature releases, each in a separate branch, merged after testing.

---

## 🚀 Version 1.0 - CURRENT (Launch Ready)
**Status**: ✅ Complete - Ready for initial launch
**Target**: Week of Dec 8, 2025

### Features
- ✅ Client-side AES-256-GCM encryption
- ✅ One-time message access with atomic deletion
- ✅ Password-protected messages (PBKDF2 300k iterations)
- ✅ Media file support (up to 100MB)
- ✅ Auto-expiration (1h to 7 days)
- ✅ Dark mode with system preference detection
- ✅ Responsive design (mobile + desktop)
- ✅ On-demand file decryption (memory optimization)
- ✅ 24-hour grace period for file downloads

### Launch Checklist
- ✅ Deploy to Cloudflare Workers
- ✅ Deploy frontend to Cloudflare Pages
- [ ] Set up custom domain
- [ ] Add Google Analytics / Plausible
- [ ] Product Hunt submission
- [ ] Social media accounts (Twitter/X, Reddit)

---

## 📊 Week 1 - Analytics & Social Proof
**Branch**: `feature/analytics-social-proof`
**Target**: Dec 15, 2025
**Status**: ✅ Complete

### Features
- ✅ **Message counter**: "X messages burned today/this week"
  - Display on homepage hero section
  - Update in real-time (fetch from API)
  - Animated number counting up (AnimatedCounter component)

- ✅ **Anonymous usage stats**
  - Total messages created
  - Total messages burned
  - Total files encrypted
  - Display in "Platform Statistics" section

- ✅ **Analytics integration**
  - Track: message creation, views, burns
  - Privacy-respecting (no PII)
  - Real-time stats updates (useStats hook with 30s refresh)

- ✅ **Social proof elements**
  - Live counter showing daily/weekly message burns
  - Platform statistics prominently displayed
  - Builds trust through transparent usage metrics

### Backend Changes
- ✅ Add `/api/stats` endpoint to API
- ✅ Track daily/weekly/all-time aggregates in D1
- ✅ Stats include: messages_created, messages_burned, files_encrypted

---

## 🎯 Week 2 - Viral Mechanics
**Branch**: `feature/viral-mechanics`
**Target**: Dec 22, 2025
**Status**: ✅ Complete

### Features
- ✅ **Post-burn CTA**
  - Show after message destruction
  - "Want to send your own secret? → Create Message"
  - Confetti animation on successful burn 🎉

- ✅ **Message preview page**
  - Landing page before password entry
  - Animated lock icon
  - Mystery/anticipation building
  - "Someone sent you a secret message..."

- ✅ **Easy message recreation**
  - Big "Send Another Message" button on success page
  - Pre-fill expiration settings from last message
  - Quick-share functionality ("Create Similar Message")

- ✅ **Viral copy improvements**
  - Better CTAs throughout
  - Social proof on every page
  - Urgency messaging ("X hours until expiration")

### UX Changes
- ✅ Add loading states with personality (rotating messages)
- ✅ Improve success page design
- ✅ Add countdown timer animation

---

## 🧪 Week 2.5 - E2E Testing Setup
**Branch**: `feature/e2e-testing`
**Target**: Dec 25, 2025
**Status**: ✅ Complete

### Features
- ✅ **Playwright setup & configuration**
  - Install Playwright with TypeScript support
  - Configure test environments (local + staging)
  - Set up CI/CD integration (GitHub Actions)
  - Parallel test execution

- ✅ **Core security flow tests**
  - Create encrypted message → View once → Verify deletion
  - Upload file → Download once → Verify file deleted
  - Wrong password attempts → Correct password → Success
  - Message expiration validation
  - Race condition prevention (simultaneous access)

- ✅ **User experience tests**
  - Dark mode toggle persistence
  - Copy URL button functionality
  - Mobile responsive layouts (viewport testing)
  - Form validation (empty message, weak password)
  - Navigation flows

- ✅ **Edge case tests**
  - Large file upload (100MB) performance
  - Browser back button after message burn
  - Expired message error handling
  - Network failure recovery
  - Concurrent user scenarios

### Testing Strategy
- **Priority 1**: Critical security paths (message deletion, one-time access) ✅
- **Priority 2**: User flows (create, share, view) ✅
- **Priority 3**: Edge cases and error states ✅

### CI Integration
- ✅ Run tests on every PR
- ✅ Require passing tests before merge
- ✅ Generate test reports and coverage
- ✅ Screenshot failures for debugging

### Test Results
- **26/26 tests passing** ✅
- Coverage includes:
  - Message creation (8 tests)
  - Message viewing and decryption (10 tests)
  - Viral mechanics features (8 tests)

### Implementation Notes
```typescript
// Example test structure
test('message self-destructs after first view', async ({ page }) => {
  // Create message
  await page.goto('/');
  await page.fill('#message', 'Secret test message');
  await page.fill('#password', 'TestPass123!');
  await page.click('button[type="submit"]');
  
  // Get shareable URL
  const url = await page.locator('#share-url').inputValue();
  
  // View message (first access)
  await page.goto(url);
  await page.fill('#password', 'TestPass123!');
  await page.click('button[type="submit"]');
  await expect(page.locator('text=Secret test message')).toBeVisible();
  
  // Try to access again (should fail)
  await page.goto(url);
  await page.fill('#password', 'TestPass123!');
  await page.click('button[type="submit"]');
  await expect(page.locator('text=Message not found')).toBeVisible();
});
```

---

## 🔗 Week 3 - Custom URLs & Branding
**Branch**: `feature/custom-urls`
**Target**: Dec 29, 2025

### Features
- [ ] **Custom short URLs** (optional)
  - User chooses: `noteburner.com/SecretSanta` vs random token
  - Validate uniqueness, profanity filter
  - Character limit: 3-20 chars, alphanumeric only

- [ ] **QR Code generation**
  - Auto-generate QR for each message
  - Download QR as PNG
  - Perfect for in-person sharing

- [ ] **Message preview images**
  - Social media Open Graph tags
  - Preview shows lock icon + "Secret Message" (no content)
  - Custom image per message type

- [ ] **Countdown timer on view page**
  - Live countdown: "This message expires in 23:45:12"
  - Visual progress bar
  - Urgency indicator when <1 hour left

### Backend Changes
- Add `custom_slug` column to messages table
- Slug validation and collision detection
- API endpoint: `GET /m/:slug` (supports both token and slug)

---

## 🎮 Week 4 - Gamification
**Branch**: `feature/gamification`
**Target**: Jan 5, 2026

### Features
- [ ] **Achievement system** (localStorage-based, privacy-first)
  - "First Burn" 🔥
  - "Speed Demon" - Send 10 messages in a day
  - "Security Expert" - Use max expiration settings
  - "File Master" - Upload 50+ MB file
  - Display badges on success page

- [ ] **Anonymous leaderboard**
  - "Most secure users this week"
  - Based on: messages sent, encryption strength
  - No personal info, just anonymous stats
  - Display top 10 on homepage

- [ ] **Streak tracking**
  - "You're on a 5-day streak! 🔥"
  - Encourages repeat usage
  - Optional email reminders

- [ ] **Mystery message mode**
  - Sender stays completely anonymous
  - No metadata, no hints
  - "You have a secret admirer..." angle

### Implementation
- Client-side achievement tracking
- Optional backend stats (opt-in)
- Celebration animations for milestones

---

## 👥 Week 5 - Network Effects
**Branch**: `feature/network-effects`
**Target**: Jan 12, 2026

### Features
- [ ] **Group messages** (1-to-many)
  - Create one message, generate multiple unique links
  - Each recipient gets own password
  - All copies burn after first access (or after X views)

- [ ] **Referral system**
  - "Send 5 messages, unlock 100MB file limit"
  - Share referral link
  - Track referrals (privacy-preserving)

- [ ] **Browser extension**
  - Right-click any text → "Send via NoteBurner"
  - Quick-share from any webpage
  - Chrome, Firefox, Edge support

- [ ] **Invite friends feature**
  - Email/SMS invitation (using their client)
  - Pre-filled message template
  - Track viral coefficient

### Backend Changes
- Multi-link generation API
- Referral tracking table (optional, opt-in)
- View counter per message group

---

## 🎨 Week 6 - UI/UX Polish
**Branch**: `feature/ux-polish`
**Target**: Jan 19, 2026

### Features
- [ ] **Onboarding flow**
  - First-time user tutorial (3 steps)
  - Interactive demo message
  - "Try it now" sample

- [ ] **Improved animations**
  - Smooth transitions between states
  - Loading skeletons
  - Micro-interactions (button hover, etc.)

- [ ] **Message templates**
  - Pre-written templates for common use cases
  - "Meeting notes", "Secret Santa", "Confession"
  - One-click apply

- [ ] **Keyboard shortcuts**
  - Cmd/Ctrl + Enter to send
  - Escape to close modals
  - Tab navigation improvements

### Accessibility
- Screen reader improvements
- High contrast mode
- Keyboard-only navigation testing

---

## 📱 Week 7 - Mobile Optimization
**Branch**: `feature/mobile-optimization`
**Target**: Jan 26, 2026

### Features
- [ ] **Progressive Web App (PWA)**
  - Installable on mobile
  - Offline support (view cached messages)
  - Push notifications (optional)

- [ ] **Mobile-first UX improvements**
  - Bottom sheet modals
  - Swipe gestures
  - Thumb-friendly button placement

- [ ] **Camera integration**
  - Take photo/video directly in app
  - Instant encryption
  - Mobile-optimized file picker

- [ ] **Share sheet integration**
  - Native mobile share
  - Share to WhatsApp, Signal, etc.
  - "Send via NoteBurner" in share menu

---

## 🔐 Week 8 - Security Enhancements
**Branch**: `feature/security-enhancements`
**Target**: Feb 2, 2026

### Features
- [ ] **Two-factor authentication** (optional)
  - TOTP support
  - Backup codes
  - For high-security messages

- [ ] **Password strength meter**
  - Visual indicator
  - Suggestions for improvement
  - Enforce minimum entropy

- [ ] **Self-destruct timer options**
  - Auto-delete after X views (even if <24h)
  - Delete after X incorrect password attempts
  - Custom expiration down to minutes

- [ ] **Audit log** (optional, privacy-first)
  - Show user: "Your message was accessed at X time"
  - Geolocation (country-level only)
  - No IP storage

### Security
- Implement Content Security Policy headers
- Add rate limiting per IP (already exists, enhance)
- DDoS protection improvements

---

## 💼 Week 9 - Enterprise Features
**Branch**: `feature/enterprise`
**Target**: Feb 9, 2026

### Features
- [ ] **API access**
  - RESTful API for programmatic access
  - API keys with rate limits
  - Documentation with examples

- [ ] **Team workspaces** (paid tier)
  - Shared message dashboard
  - Team member management
  - Usage analytics

- [ ] **Custom branding** (paid)
  - White-label option
  - Custom domain
  - Logo replacement

- [ ] **Compliance reports**
  - GDPR compliance tools
  - Data retention policies
  - Export audit logs

---

## 🚀 Week 10 - Scaling & Performance
**Branch**: `feature/scaling`
**Target**: Feb 16, 2026

### Features
- [ ] **Caching layer**
  - Cloudflare KV for hot messages
  - Redis-like caching
  - Reduce D1 load

- [ ] **CDN optimization**
  - Static asset caching
  - Geographic distribution
  - Image optimization

- [ ] **Database optimization**
  - Query performance improvements
  - Index optimization
  - Connection pooling

- [ ] **Monitoring & observability**
  - Error tracking (Sentry)
  - Performance monitoring (Datadog/New Relic)
  - Uptime monitoring

### Infrastructure
- Load testing (simulate 10k req/min)
- Auto-scaling configuration
- Disaster recovery plan

---

## 🌐 Week 11 - Internationalization
**Branch**: `feature/i18n`
**Target**: Feb 23, 2026

### Features
- [ ] **Multi-language support**
  - Spanish, French, German, Chinese, Hindi
  - Auto-detect browser language
  - Language switcher in header

- [ ] **Localized content**
  - Translate all UI strings
  - Locale-specific date/time formats
  - Cultural adaptation (colors, icons)

- [ ] **Regional compliance**
  - GDPR (EU)
  - CCPA (California)
  - Country-specific privacy laws

---

## 🎁 Week 12 - Premium Features
**Branch**: `feature/premium`
**Target**: Mar 2, 2026

### Features
- [ ] **Premium tier** ($5/month)
  - Unlimited file size (1GB)
  - Custom URLs included
  - Priority support
  - Ad-free experience
  - Advanced analytics

- [ ] **Crypto payment option**
  - Bitcoin/ETH payments
  - Anonymous payment method
  - No personal info required

- [ ] **Lifetime access**
  - One-time payment ($49)
  - All premium features forever
  - Early adopter pricing

---

## 📈 Marketing Campaigns (Parallel to features)

### Month 1: Product Hunt Launch
- **Target**: 300+ upvotes, #1 Product of the Day
- **Actions**: 
  - Hunter outreach 2 weeks prior
  - Build email list (100+ supporters)
  - Time launch for Tuesday-Thursday
  - Respond to all comments within 1 hour

### Month 2: Reddit/HN Validation
- **Target**: Front page of HN, 1000+ upvotes on Reddit
- **Actions**:
  - "Show HN: Self-destructing message app"
  - Post in r/privacy, r/opensource, r/selfhosted
  - Technical write-up on blog
  - Engage authentically, no spam

### Month 3: Press & Influencers
- **Target**: TechCrunch, The Verge, Ars Technica coverage
- **Actions**:
  - Email journalists with exclusive story
  - Pitch angle: "Student/indie dev challenges Signal"
  - DM privacy advocates (Edward Snowden, etc.)
  - YouTube tech reviewers outreach

### Month 4+: SEO & Content Marketing
- **Target**: 10k organic visits/month
- **Actions**:
  - Blog posts: "How to send secure messages", guides
  - YouTube tutorials and demos
  - Guest posts on privacy blogs
  - Podcast appearances

---

## 🎯 Success Metrics

### Version 1.0 Goals (Month 1)
- 1,000 messages sent
- 100 daily active users
- Product Hunt top 5
- 50+ GitHub stars

### Quarter 1 Goals (Months 1-3)
- 10,000 messages sent
- 1,000 daily active users
- 500+ GitHub stars
- Press coverage in 3+ major outlets
- Viral coefficient > 0.5

### Quarter 2 Goals (Months 4-6)
- 100,000 messages sent
- 10,000 daily active users
- 2,000+ GitHub stars
- 100+ premium subscribers ($500 MRR)
- Viral coefficient > 1.0

---

## 🛠️ Development Guidelines

### Branch Naming Convention
```
feature/[feature-name]
bugfix/[bug-description]
hotfix/[critical-fix]
release/v[version]
```

### Weekly Release Process
1. **Monday**: Create feature branch from `main`
2. **Mon-Thu**: Development + testing
3. **Friday**: Code review + merge to `staging`
4. **Saturday**: Staging deployment + QA
5. **Sunday**: Production deployment + monitoring

### Testing Requirements
- Unit tests for new functions
- Integration tests for API endpoints
- E2E tests for critical flows
- Manual QA checklist per feature

### Code Review Checklist
- [ ] Linting passes (no warnings)
- [ ] Tests pass
- [ ] Performance impact assessed
- [ ] Security review completed
- [ ] Documentation updated
- [ ] Changelog entry added

---

## 📝 Notes

### Technical Debt to Address
- [ ] Add comprehensive error boundaries
- [ ] Implement request retry logic
- [ ] Add database migration rollback system
- [ ] Set up automated backups
- [ ] Create disaster recovery runbook

### Future Considerations (Post-Q2)
- Native mobile apps (React Native?)
- Desktop app (Electron?)
- Self-hosted version for enterprises
- Open-source entire stack
- Blockchain-based storage option (IPFS?)
- E2E encryption for group chats
- Voice/video message support

---

## 🤝 Contributing

This is a solo project for now, but open to collaboration in Q2. If you want to contribute:

1. Check the current week's feature branch
2. Open an issue to discuss your idea
3. Fork + PR with tests
4. Follow code style guidelines

---

**Last Updated**: December 8, 2025  
**Current Version**: v1.0.0  
**Next Release**: Week 1 - Analytics & Social Proof (Dec 15, 2025)
