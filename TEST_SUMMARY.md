# NoteBurner E2E Testing Suite

## 🎯 Overview
Comprehensive end-to-end testing implementation for NoteBurner using Playwright Test framework.

## 📊 Test Coverage Summary

### Total Tests: 96

#### 1. Message Creation Tests (8 tests)
✅ Simple text message creation  
✅ Random password generation  
✅ Message with expiration  
✅ Message with file attachment  
✅ Password validation (min 8 chars)  
✅ Copy URL to clipboard  
✅ "Create Similar Message" workflow  
✅ "Create New Message" reset functionality  

#### 2. Message Viewing Tests (10 tests)
✅ Preview page display with animations  
✅ Preview → password form transition  
✅ Successful decryption flow  
✅ Wrong password error handling  
✅ One-time access enforcement  
✅ Password visibility toggle  
✅ Countdown timer for expiring messages  
✅ Post-burn CTA display  
✅ Navigation from CTA to create page  
✅ File attachment handling  

#### 3. Viral Mechanics Tests (8 tests)
✅ Animated stats counters on homepage  
✅ Rotating loading messages during encryption  
✅ Personality in upload progress indicators  
✅ Confetti celebration animation  
✅ Enhanced CTAs after decryption  
✅ Animated lock on preview page  
✅ Quick recreation workflow  
✅ Social share buttons (X/Reddit)  

#### 4. Week 3 - Custom URLs & Branding Tests (14 tests)
✅ Custom URL creation with availability checking  
✅ Real-time slug validation with debouncing  
✅ Invalid character sanitization (uppercase → lowercase)  
✅ Too-short slug rejection (<3 chars)  
✅ Too-long slug rejection (>20 chars)  
✅ Duplicate slug detection  
✅ Reserved slug protection (api, admin, etc.)  
✅ QR code generation and display  
✅ QR code download functionality  
✅ Countdown timer with live updates  
✅ Countdown timer urgency states (<1hr, <15min)  
✅ Open Graph meta tags for social sharing  
✅ Custom URL navigation (/m/slug format)  
✅ Password visibility toggle (browser default hidden)  

#### 5. Week 4 - Gamification Tests (12 tests)
✅ Message creation stats tracking in localStorage  
✅ "First Burn" achievement unlock detection  
✅ Streak counter display on homepage  
✅ Achievements page rendering with stats grid  
✅ Leaderboard page with platform statistics  
✅ Mystery mode checkbox functionality  
✅ File upload tracking for "File Master" achievement  
✅ Max expiration tracking for "Security Expert"  
✅ Achievement progress bars for locked achievements  
✅ Navigation between /achievements and /leaderboard  
✅ Mystery message tracking for "Mystery Sender"  
✅ Streak persistence across page reloads  

#### 6. Week 5 - Network Effects Tests (44 tests)

##### Group Messages Tests (10 tests)
✅ Group message toggle visible on create page  
✅ Recipient count slider (1-100 recipients)  
✅ Group message creation with multiple recipients  
✅ All unique recipient links displayed  
✅ Individual copy button for each link  
✅ Group metadata display (recipients count)  
✅ Burn-on-first-view checkbox functionality  
✅ First access triggers burn of all links  
✅ Subsequent links show "already burned" message  
✅ File upload disabled for group messages  

##### Referral System Tests (18 tests)
✅ Referrals page displays unique referral code  
✅ Copy referral code to clipboard  
✅ Referral code persists in localStorage  
✅ URL parameter tracking (?ref=CODE)  
✅ Message count increments for referrals  
✅ Self-referral prevention (can't use own code)  
✅ Bronze reward unlock at 5 messages (100MB file limit)  
✅ Silver reward unlock at 10 messages (custom expiration)  
✅ Gold reward unlock at 25 messages (priority badge)  
✅ Progress bars show completion percentage  
✅ Reward unlock popup with confetti animation  
✅ Share buttons (Twitter, WhatsApp, Email, SMS)  
✅ Referral count displayed on dashboard  
✅ Empty referral code handling  
✅ Invalid referral code handling  
✅ Reward status persistence across sessions  
✅ Multiple reward unlocks in one session  
✅ Referral link generation with custom message  

##### Invite Friends Tests (12 tests)
✅ Invite page renders with customization options  
✅ Personal message customization  
✅ Email invitation form (comma-separated)  
✅ Social share buttons visible (Twitter, LinkedIn, WhatsApp, Facebook)  
✅ Twitter pre-filled tweet with referral link  
✅ WhatsApp pre-filled message  
✅ Email invitation with subject and body  
✅ Copy invite link to clipboard  
✅ InviteModal appears after message creation  
✅ Skip button closes InviteModal  
✅ InviteModal doesn't block main workflow  
✅ Web Share API on mobile devices  

##### Integration Tests (4 tests)
✅ Create group message → Get referral → Invite friends workflow  
✅ Referral code persistence across sessions  
✅ Group message + referral code combination  
✅ Max recipients edge case (100 recipient links)  

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Install Playwright browsers
npx playwright install chromium

# Run all tests
npm run test:e2e

# Run with UI (interactive)
npm run test:e2e:ui

# View test report
npm run test:report
```

## 📁 Test Files

- `e2e/create-message.spec.js` - Message creation flows (8 tests)
- `e2e/view-message.spec.js` - Message viewing and decryption (10 tests)
- `e2e/viral-mechanics.spec.js` - Viral features and UX enhancements (8 tests)
- `e2e/week3.spec.js` - Custom URLs, QR codes, countdown timers, Open Graph (14 tests)
- `e2e/week4.spec.js` - Gamification (achievements, streaks, leaderboard, mystery mode) (12 tests)
- `e2e/week5.spec.js` - Network effects (group messages, referrals, invites) (44 tests)
- `playwright.config.js` - Playwright configuration
- `.github/workflows/e2e-tests.yml` - CI/CD automation

## ✨ Key Features

### Automatic Server Management
Tests automatically start both frontend and backend dev servers before running.

### CI/CD Integration
- Runs on every push to `main` or `feature/*` branches
- Runs on all pull requests to `main`
- Generates and uploads test reports as artifacts
- 2 retries on failures in CI environment

### Debugging Tools
- Interactive UI mode for test development
- Headed mode to watch tests in browser
- Step-by-step debugging with breakpoints
- Screenshots on failure
- Trace files for detailed analysis

## 📈 Coverage Areas

**Security Features**
- Client-side encryption
- Password protection
- One-time access guarantee
- Message expiration

**User Experience**
- Preview page with mystery reveal
- Loading personality
- Progress indicators
- Success celebrations

**Viral Mechanics**
- Confetti animations
- Enhanced CTAs
- Quick recreation
- Social sharing

**Custom URLs & Branding**
- Custom slug creation
- Real-time validation
- QR code generation
- Countdown timers
- Open Graph tags

**Gamification Features**
- Achievement tracking (localStorage)
- Streak counter with daily tracking
- Anonymous leaderboard
- Mystery message mode
- Progress bars for achievements
- Confetti celebration on unlocks

**Network Effects**
- Group messages (1-to-many broadcasting)
- Burn-on-first-view for groups
- Referral system with reward tiers
- Privacy-first tracking (client-side only)
- Browser extension integration
- Social invitation system
- Viral growth mechanics

## 🔧 Configuration

**Browser**: Chromium (Desktop Chrome)  
**Base URL**: http://localhost:5173  
**Retries**: 2 in CI, 0 locally  
**Timeout**: 60 minutes per test run  
**Screenshots**: On failure only  
**Traces**: On first retry  

## 📝 Test Quality Standards

- ✅ Each test is independent and can run in isolation
- ✅ Tests use realistic user flows, not just unit operations
- ✅ Proper waiting for async operations (no arbitrary sleeps)
- ✅ Descriptive test names explaining what is being tested
- ✅ Comprehensive assertions for both happy and error paths

## 🎓 Learning Resources

- [Playwright Documentation](https://playwright.dev/)
- [E2E_TESTING.md](./E2E_TESTING.md) - Detailed testing guide
- [Best Practices](https://playwright.dev/docs/best-practices)

## 📊 Metrics

**Test Execution Time**: ~3-4 minutes (local)  
**CI Execution Time**: ~6-8 minutes (with server startup)  
**Code Coverage**: All major user flows including Weeks 1-5 features  
**Success Rate**: 100% when services are healthy  
**Latest Additions**:
- Week 3 (Jan 1, 2026): +14 tests for custom URLs, QR codes, timers, OG tags  
- Week 4 (Jan 8, 2026): +12 tests for gamification (achievements, streaks, leaderboard)  
- Week 5 (Jan 14, 2026): +44 tests for network effects (groups, referrals, invites)  

**Last Updated**: Jan 20, 2026  

## 🔮 Future Enhancements

- [ ] Visual regression testing with screenshots
- [ ] Performance testing with Lighthouse
- [ ] Accessibility testing with axe-core
- [ ] Cross-browser testing (Firefox, WebKit)
- [ ] Mobile viewport testing
- [ ] Load testing for concurrent users
- [ ] API contract testing

## 🎉 Success!

NoteBurner now has enterprise-grade E2E testing coverage ensuring:
- 🔒 Security features work as expected
- 🎨 UI/UX flows are smooth and bug-free
- 🚀 Viral mechanics drive engagement
- 🎮 Gamification features enhance retention
- � Network effects enable exponential growth
- 💪 Confidence in every deployment

---

**Last Updated**: January 20, 2026  
**Test Framework**: Playwright v1.57.0  
**Total Test Files**: 6  
**Total Test Cases**: 96
