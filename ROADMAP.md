# NoteBurner Roadmap 🔥

**Mission**: Make NoteBurner the go-to platform for secure, self-destructing messages.

**Launch Strategy**: Weekly feature releases, each in a separate branch, merged after testing.

---

## 🚀 Version 1.5 - CURRENT (Network Effects)
**Status**: ✅ Complete - Week 5 Released
**Released**: Jan 14, 2026

### Features
- ✅ Client-side AES-256-GCM encryption
- ✅ One-time message access with atomic deletion
- ✅ Password-protected messages (PBKDF2 300k iterations)
- ✅ Media file support (up to 100MB, 100MB with referral reward)
- ✅ Auto-expiration (1h to 7 days)
- ✅ Dark mode with system preference detection
- ✅ Responsive design (mobile + desktop)
- ✅ On-demand file decryption (memory optimization)
- ✅ 24-hour grace period for file downloads
- ✅ Group messages (1-100 recipients)
- ✅ Privacy-first referral system with rewards
- ✅ Browser extension (Chrome/Firefox)
- ✅ Invite friends with social sharing

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
**Released**: Jan 1, 2026
**Status**: ✅ Released to Production

### Features
- ✅ **Custom short URLs** (optional)
  - User chooses: `noteburner.com/SecretSanta` vs random token
  - Real-time validation with debouncing (500ms)
  - Format: 3-20 chars, lowercase alphanumeric + hyphens/underscores
  - Profanity filter with leetspeak detection (21 words)
  - Reserved slug protection (api, admin, login, etc.)
  - Visual feedback: checkmark (available), X (unavailable), spinner (checking)

- ✅ **QR Code generation**
  - Auto-generate QR for all message URLs
  - 512x512px PNG with error correction level M
  - Download as `noteburner-secret-message.png`
  - Branded variant with NoteBurner red color (#dc2626)
  - Responsive display on mobile

- ✅ **Message preview images**
  - Social media Open Graph tags for Twitter, Facebook, LinkedIn
  - Preview shows lock icon + "Secret Message" (no content exposed)
  - Twitter Card: `summary_large_image` format
  - Dynamic meta tag updates via `useOpenGraph` hook
  - Security: Never reveals message content in OG tags

- ✅ **Countdown timer**
  - Live countdown with 1-second updates
  - Progress bar showing time remaining (24hr = 100%)
  - Urgency states:
    - Normal (>1hr): Blue bar, standard text
    - Urgent (<1hr): Orange bar, warning message
    - Critical (<15min): Red bar, pulsing icon
  - Displays before and after decryption
  - Auto-redirect when timer expires
  - Hidden for no-expiration messages

### Backend Changes
- ✅ Add `custom_slug` column to messages table (migration 0004)
- ✅ Slug validation with profanity filter and reserved words
- ✅ API endpoint: `GET /:identifier` (supports both token and slug)
- ✅ `GET /check-slug/:slug` for real-time availability checking
- ✅ Unique index on custom_slug (sparse, only non-NULL values)

### Frontend Changes
- ✅ QRCodeDisplay component with download functionality
- ✅ CountdownTimer component with urgency states
- ✅ Custom URL input with debounced validation
- ✅ Open Graph meta tag management (useOpenGraph hook)
- ✅ Updated CreateMessage page with custom URL field
- ✅ Updated ViewMessage page with countdown timer

### Dependencies
- ✅ `qrcode@1.5.4` - QR code generation
- ✅ `lodash.debounce@4.0.8` - Input validation debouncing

### Testing
- ✅ 16 E2E tests covering all Week 3 features
- ✅ Custom URL creation and validation
- ✅ QR code display and download
- ✅ Countdown timer with urgency indicators
- ✅ Open Graph meta tags (security verified)

### Metrics
- **Code**: 1,338 lines added (backend + frontend + tests)
- **Files**: 11 files changed (7 new, 4 modified)
- **Commits**: 4 (backend, frontend, tests, docs)
- **Test Coverage**: 16/16 passing

---

## 🎮 Week 4 - Gamification
**Branch**: `feature/gamification`
**Target**: Jan 5, 2026
**Status**: ✅ Released to Production (v1.4.0)
**Released**: Jan 8, 2026

### Features
- ✅ **Achievement system** (localStorage-based, privacy-first)
  - "First Burn" 🔥
  - "Speed Demon" - Send 10 messages in a day
  - "Security Expert" - Use max expiration settings
  - "File Master" - Upload 50+ MB file
  - "Centurion" - Create 100 messages total
  - "Night Owl" - Create message between 12am-6am
  - "Streak Master" - 7-day message streak
  - "Mystery Sender" - Send 5 mystery messages
  - Display badges on AchievementsPage with progress tracking

- ✅ **Anonymous leaderboard**
  - "Platform Statistics" showing Today/This Week/All Time
  - Based on: messages sent, files encrypted, burn rate
  - No personal info, 100% anonymous
  - Display on /leaderboard page

- ✅ **Streak tracking**
  - Daily consecutive message creation tracking
  - "You're on a 5-day streak! 🔥" with fire emoji
  - Pulsing animation on StreakCounter component
  - Encourages repeat usage
  - Displayed on homepage hero section

- ✅ **Mystery message mode**
  - Sender stays completely anonymous
  - Checkbox toggle in CreateMessage form
  - Tracked separately for Mystery Sender achievement
  - "Send Anonymously" option

### Implementation
- ✅ Client-side achievement tracking (localStorage)
- ✅ Backend stats API (already existing from Week 1)
- ✅ Celebration animations with confetti for achievement unlocks
- ✅ Progress bars showing partial achievement completion
- ✅ Two new pages: /achievements and /leaderboard
- ✅ Header navigation updates with Trophy icon

### Backend Changes
- No changes required (stats API already existed)
- Uses existing `/api/stats` endpoint

### Frontend Changes
- ✅ AchievementBadge component - Display badges with gradients
- ✅ AchievementUnlocked component - Popup with confetti
- ✅ StreakCounter component - Fire emoji with daily count
- ✅ AchievementsPage - Full overview with stats grid
- ✅ LeaderboardPage - Platform statistics display
- ✅ achievements.js utility - Core tracking logic
- ✅ Updated CreateMessage page with mystery mode checkbox
- ✅ Updated HomePage with achievement tracking integration

### Dependencies
- ✅ `canvas-confetti@1.9.3` - Achievement unlock celebrations

### Testing
- ✅ 12 E2E tests covering all Week 4 features
- ✅ Achievement tracking and unlocking
- ✅ Streak persistence across reloads
- ✅ Leaderboard stats display
- ✅ Mystery mode checkbox functionality
- ✅ File upload tracking
- ✅ Progress bar rendering

### Metrics
- **Code**: 1,040 lines added (frontend + tests)
- **Files**: 13 files changed (6 new, 6 modified, 2 moved)
- **Commits**: 3 (implementation, test fixes, merge)
- **Test Coverage**: 12/12 passing (52 total E2E tests)
- **Branch**: Merged to main with no-ff merge

---

## 👥 Week 5 - Network Effects
**Branch**: `feature/network-effects`
**Released**: Jan 14, 2026
**Status**: ✅ Released to Production

### Features
- ✅ **Group messages** (1-to-many)
  - Create one message, generate 1-100 unique recipient links
  - Each recipient gets unique token, same encrypted content
  - Burn-on-first-view option (all links destroyed after first access)
  - Optional max view limit per group
  - Individual copy buttons for each recipient link
  - Group metadata display (total recipients, access count, expiration)
  - File uploads and custom URLs disabled for groups (security)

- ✅ **Referral system**
  - Client-side privacy-first tracking (localStorage only)
  - 3 reward tiers: 5, 10, 25 messages
  - Rewards: 100MB file limit, custom expiration, priority badge
  - Unique 6-character referral codes (uppercase)
  - URL parameter handling (?ref=CODE)
  - Reward unlock notifications with confetti
  - Progress tracking with visual progress bars
  - Self-referral prevention
  - Web Share API for mobile sharing

- ✅ **Browser extension**
  - Manifest V3 (Chrome/Edge) and Firefox compatible
  - Three access methods:
    1. Right-click context menu on selected text
    2. Floating action button when text selected
    3. Extension popup for quick encryption
  - Built-in password generator
  - AES-256-GCM encryption in browser
  - Direct API integration
  - Expiration time selector
  - One-click copy and open in NoteBurner

- ✅ **Invite friends feature**
  - Dedicated /invite page with customization
  - Personal message customization
  - Email invitations (comma-separated recipients)
  - Social media share buttons (Twitter, LinkedIn, WhatsApp, Facebook)
  - SMS invitation support
  - Pre-filled invitation templates
  - InviteModal component on message success
  - Web Share API integration
  - Copy to clipboard functionality
  - "Why Invite" section explaining benefits

### Backend Changes
- ✅ Migration 0006: Add group_id to messages table
- ✅ New table: message_groups (group_id, total_links, accessed_count, max_views, burn_on_first_view, expires_at)
- ✅ groupMessages.js utility (155 lines)
  - createGroupMessage() - Generate multiple unique tokens
  - getGroupInfo() - Retrieve group metadata
  - incrementGroupAccess() - Track views and auto-burn
  - cleanupExpiredGroups() - Remove expired groups
- ✅ POST /api/messages/group endpoint (rate limited 5/60s)
- ✅ Updated DELETE endpoint with group burn logic
- ✅ No backend for referrals (100% client-side for privacy)

### Frontend Changes
- ✅ GroupMessageLinks component (178 lines) - Display recipient links
- ✅ ReferralsPage component (220 lines) - Rewards dashboard
- ✅ RewardUnlocked component (105 lines) - Celebration popup
- ✅ InviteFriendsPage component (280 lines) - Invitation hub
- ✅ InviteModal component (195 lines) - Post-creation sharing
- ✅ referrals.js utility (195 lines) - Complete referral logic
- ✅ Updated CreateMessage page with group toggle and invite button
- ✅ Updated HomePage with referral URL parameter handling
- ✅ Updated App.jsx with /referrals and /invite routes
- ✅ Updated Header with Rewards and Invite navigation links

### Browser Extension
- ✅ manifest.json - Extension configuration (Manifest V3)
- ✅ background.js (61 lines) - Service worker and context menu
- ✅ content.js (80 lines) - Floating button and page interaction
- ✅ popup.html/css/js (150+ lines) - Extension popup UI
- ✅ crypto.js (100 lines) - Encryption utilities
- ✅ README.md - Installation and usage instructions

### Dependencies
- No new dependencies (uses existing nanoid)

### Testing
- ✅ 44 E2E tests covering all Week 5 features
- ✅ Group message creation with 1-100 recipients
- ✅ Burn-on-first-view functionality
- ✅ Referral tracking and reward unlocks
- ✅ URL parameter handling
- ✅ Invite modal and page interactions
- ✅ Integration tests for combined features
- ✅ Edge cases (max recipients, empty codes, long URLs)

### Metrics
- **Code**: 2,696 lines added (backend + frontend + extension + tests)
- **Files**: 24 files changed (16 new, 8 modified)
- **Commits**: 4 (group messages, referrals, extension, invite)
- **Test Coverage**: 44 new tests (96 total E2E tests)
- **Branch**: Ready to merge to main

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

## � Project Status

**Current Version**: v1.4.0 (Week 4 - Gamification)  
**Last Updated**: Jan 8, 2026  
**Next Release**: Week 5 (Network Effects) - Jan 12, 2026

### Release History
- **v1.4.0** - Jan 8, 2026: Gamification (achievements, streaks, leaderboard, mystery mode)
- **v1.3.0** - Jan 1, 2026: Custom URLs & Branding (QR codes, countdown timer, Open Graph)
- **v1.2.5** - Dec 25, 2025: E2E Testing (52 passing tests)
- **v1.2.0** - Dec 22, 2025: Viral Mechanics (post-burn CTA, message preview)
- **v1.1.0** - Dec 15, 2025: Analytics & Social Proof (stats counter, platform stats)
- **v1.0.0** - Dec 1, 2025: Initial Launch (AES-256-GCM, one-time access, file encryption)

---

## �🛠️ Development Guidelines

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

**Last Updated**: January 8, 2026  
**Current Version**: v1.4.0  
**Next Release**: Week 5 - Network Effects (Jan 12, 2026)
