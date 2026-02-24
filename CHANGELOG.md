# Changelog

All notable changes to NoteBurner will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.10.1] - 2026-02-24

### Added - Enhanced Test Coverage
- **Expanded E2E Tests (35 new tests added)**:
  - Week 1 Message Creation: 8 → 19 tests (+11 tests)
    - Multiple file type handling (images, PDFs, etc.)
    - File removal before submission
    - All expiration options (1h, 6h, 24h, 3d, 7d)
    - Empty message validation
    - Unicode and emoji message support
    - Special characters in passwords
    - Long message handling (5000+ characters)
    - Browser back button behavior
    - Unique password generation verification
    - Dark mode toggle persistence
    - File size limit information display
    - Form state management across navigation

  - Week 2 Message Viewing: 10 → 19 tests (+9 tests)
    - Multiple failed password attempts
    - Invalid message token handling
    - Password case sensitivity
    - Browser navigation during decryption
    - Page refresh during password entry
    - Concurrent access attempt handling
    - Preview animation verification
    - Empty password submission validation
    - Decryption performance timing

  - Week 2 Viral Mechanics: 8 → 17 tests (+9 tests)
    - Real-time stats updates
    - Stats number formatting
    - Different loading state variations
    - Homepage animations on load
    - Burn animation effects
    - Urgency messaging display
    - Mystery/intrigue elements on preview
    - Success state animations
    - Personality in error states
    - Social share button icon verification

- **Total Test Count**: 241 → **276 E2E tests** (before expansion: 241, after: 276)
- **Documentation Updates**: Updated TEST_SUMMARY.md, README.md with new test counts

### Technical Improvements
- More comprehensive file upload testing
- Better edge case coverage for message creation
- Enhanced concurrent access testing
- Improved UI/UX state verification
- Stronger validation testing across all flows

---

## [1.10.0] - 2026-02-24

### Added - User Authentication System (Week 11)
- **User Registration & Login**:
  - Email/password signup with validation
  - Email verification system (token-based, ready for email integration)
  - Secure login with bcrypt password hashing (10 rounds)
  - Session-based authentication with 7-day (default) or 30-day (remember me) expiration
  - Multi-device session tracking and management

- **Password Management**:
  - Password reset flow with 1-hour token expiration
  - Password strength requirements (8+ chars, uppercase, lowercase, number)
  - Password confirmation validation
  - Brute force protection (5 failed attempts → 15 minute account lockout)

- **Session Management**:
  - View all active sessions across devices
  - Logout from specific session or all devices
  - Session refresh functionality
  - Automatic cleanup of expired sessions
  - Session format: `session_{userId}_{randomToken}` with 256-bit entropy

- **Security Features**:
  - Login attempt tracking with IP and timestamp
  - Account lockout with automatic unlock after 15 minutes
  - Creator token linking for API keys and messages
  - Form validation and error handling
  - Security best practices (no email disclosure on password reset)

- **Frontend Components**:
  - LoginPage.jsx (160 lines) - Email/password login with remember me
  - SignupPage.jsx (230 lines) - Registration with password strength meter
  - ForgotPasswordPage.jsx (120 lines) - Password reset request
  - ResetPasswordPage.jsx (180 lines) - Password reset completion
  - AuthContext.jsx (160 lines) - Global auth state management
  - Updated Header with login/signup buttons and user menu dropdown

- **Backend Implementation**:
  - backend/src/routes/auth.js (550+ lines) - 13 authentication endpoints
  - backend/src/utils/password.js (130 lines) - Password hashing and validation
  - backend/src/utils/session.js (200 lines) - Session lifecycle management
  - backend/src/middleware/requireAuth.js (70 lines) - Auth middleware
  - Migration 0010_user_authentication.sql - 4 new tables (users, sessions, password_resets, login_attempts)

- **Testing**:
  - e2e/week11.spec.js (25 tests) - Comprehensive authentication flow testing
  - User signup (6 tests)
  - User login (5 tests)
  - User logout (1 test)
  - Password reset (3 tests)
  - Session persistence (2 tests)
  - Navigation & links (3 tests)
  - Form validation (3 tests)
  - Security features (2 tests)

### Security
- Implemented bcryptjs for password hashing with 10 rounds
- Session tokens with 32-character random component (256-bit entropy)
- Rate limiting on authentication endpoints
- HTTPS-only session cookies (when deployed)
- No plaintext password storage or transmission

---

## [1.9.0] - 2026-02-20

### Added - Enterprise Features (Week 10)
- **Team Workspaces**:
  - Role-based access control (Owner, Admin, Member, Viewer)
  - Team creation and management API
  - Team member invitation system
  - Member role updates and removal
  - Team dashboard UI with stats
  - Team message tracking and analytics
  - TeamDashboard component (210 lines)
  - TeamCreationPage component (185 lines)

- **API Key Management System**:
  - API key generation with custom rate limits
  - Usage tracking and statistics
  - Key revocation functionality
  - One-time key display (security best practice)
  - API key scoping by team
  - ApiKeyManager component (320 lines)
  - GET/POST/DELETE /api/keys endpoints

- **Custom Branding**:
  - Logo upload and display
  - Color customization (primary, background)
  - White-label mode toggle
  - Branding preview functionality
  - Team-specific branding settings
  - BrandingSettings component (195 lines)
  - POST /api/branding endpoint

- **GDPR Compliance Dashboard**:
  - Data retention policy configuration
  - GDPR compliance toggle
  - Audit log export functionality
  - Message export for data portability
  - Account deletion confirmation
  - Privacy-first data handling
  - ComplianceDashboard component (240 lines)
  - GET/POST /api/compliance endpoints

- **Backend Infrastructure**:
  - Migration 0009_enterprise_features.sql - 4 new tables (teams, team_members, branding_settings, compliance_settings)
  - Enhanced API versioning (/api/v1)
  - Team-aware message creation
  - Usage analytics tracking
  - Data export utilities

- **Testing**:
  - e2e/week10.spec.js (35 tests) - Comprehensive enterprise feature testing
  - API v1 endpoints (4 tests)
  - Team workspaces (7 tests)
  - Custom branding (5 tests)
  - Compliance dashboard (6 tests)
  - Data management (1 test)
  - API key manager (7 tests)
  - Integration tests (5 tests)

### Changed
- Version bumped from 1.8.0 to 1.9.0
- API structure enhanced with versioning
- Database schema extended for enterprise features

---

## [1.8.0] - 2026-02-09

### Added - Security Enhancements (Week 9)
- **Password Strength Meter**:
  - Real-time password analysis with 5-level strength score
  - Visual progress bar (color-coded: red → green)
  - Entropy calculation (randomness in bits)
  - Pattern detection (common passwords, sequences)
  - Character variety checks (uppercase, lowercase, numbers, special)
  - Inline suggestions for improvement
  - PasswordStrengthMeter component (175 lines)

- **Self-Destruct Options**:
  - Max views setting (1, 2, 3, 5, 10, unlimited)
  - Granular time limits (5 min to 7 days)
  - Max password attempts (1, 3, 5, 10, unlimited)
  - Geographic restrictions (same country only)
  - Auto-burn on suspicious activity
  - 2FA requirement (TOTP)
  - SelfDestructOptions component (188 lines)

- **Audit Log System**:
  - Privacy-first logging (country-level geo only, no IPs)
  - Event tracking (created, viewed, burned, password attempts)
  - Creator-only access via token
  - Suspicious activity detection
  - AuditLogViewer component (265 lines)
  - GET /api/audit/:messageId endpoint

- **Security Headers**:
  - Content Security Policy (CSP) with 12 directives
  - X-Frame-Options: DENY
  - Strict-Transport-Security (HSTS)
  - X-Content-Type-Options: nosniff
  - Referrer-Policy, Permissions-Policy
  - Cache-Control for sensitive endpoints

- **Enhanced Rate Limiting**:
  - Sliding window algorithm
  - Per-endpoint limits (50/min messages, 100/min integrations)
  - Rate limit headers (X-RateLimit-*)
  - Retry-After header on 429 responses

- **DDoS Protection**:
  - Automatic IP banning (1,000 req/min threshold)
  - 1-hour ban duration
  - Suspicious pattern detection

- **Database**:
  - audit_logs table (message_id, event_type, country, timestamp, success, metadata)
  - 10 new columns on messages table (max_views, view_count, password_attempts, etc.)
  - Indexes for performance

### Technical (Week 9)
- New components: 3 React components (628 lines)
- Backend: 2 new routes (audit.js, security.js middleware)
- Migration: 0008_security_enhancements.sql
- E2E tests: 40+ new tests (week9.spec.js)

---

## [1.7.0] - 2026-02-09

### Added - Platform Integrations (Week 8)
- **Slack Integration**:
  - /noteburner slash command
  - Interactive actions (Share in Channel)
  - Ephemeral responses
  - Auto-generated secure links

- **Zapier Integration**:
  - POST /api/integrations/zapier/create
  - API key authentication
  - Custom or auto-generated passwords
  - Configurable expiration (1h to 7 days)
  - GET /api/integrations/zapier/auth

- **Webhook System**:
  - POST /api/integrations/webhooks/subscribe
  - Supported events: message.created, message.viewed, message.burned
  - HTTPS requirement
  - Event filtering

- **Discord Bot Integration**:
  - POST /api/integrations/discord/create
  - Rich embed responses
  - Bot token validation

- **API Key Management**:
  - POST /api/integrations/keys/create
  - Key format: nb_<32-char-nanoid>
  - Named keys for organization
  - Rate limiting per key (1,000/min default)
  - Last-used tracking

- **API Documentation**:
  - Comprehensive API docs (370 lines)
  - Request/response examples
  - Platform setup guides
  - Security best practices

- **Database**:
  - api_keys table (id, user_id, key, name, active, rate_limit)
  - webhooks table (id, user_id, url, events, active, failure_count)
  - created_via column on messages (track source: web, slack, zapier, discord, api)
  - user_id column on messages (link to API key owner)

### Technical (Week 8)
- Backend: integrations.js route (348 lines)
- Migration: 0007_integrations.sql
- E2E tests: 30+ new tests (week8.spec.js)
- Supported platforms: 4 (Slack, Zapier, Discord, Generic API)

---

## [1.6.0] - 2026-01-23

### Added - Mobile Optimization & PWA
- **Progressive Web App (PWA)**:
  - PWA manifest with app icons (8 sizes), shortcuts, and share target
  - Service worker with caching strategies (network-first for HTML, cache-first for assets)
  - Offline fallback page with auto-retry and cached message display
  - Install prompt handling for "Add to Home Screen"
  - Background sync for queued offline actions
  - Push notification infrastructure (optional user opt-in)
  - Update notifications when new service worker available

- **Mobile Components**:
  - `BottomSheet.jsx` - iOS/Android style modal with drag-to-close gesture
  - `SwipeableCard.jsx` - Swipe left/right gestures with visual feedback
  - `CameraCapture.jsx` - Photo/video capture with front/rear camera switching
  - `useSwipe` hook - Reusable swipe gesture detection

- **Share Sheet Integration**:
  - Web Share API integration for native mobile sharing
  - ShareSheet component with 8 popular apps (WhatsApp, Telegram, Signal, etc.)
  - Fallback URLs for all platforms
  - Clipboard API with textarea fallback
  - Share target in manifest for "Share to NoteBurner"

- **Mobile Utilities**:
  - `pwa.js` - PWA registration, install prompts, notifications, background sync
  - `share.js` - Native share, platform-specific URLs, clipboard utilities
  - `mobile.js` - Device detection, orientation, haptics, safe areas, network info

- **Integration Updates**:
  - PWA meta tags and Apple touch icons in index.html
  - Service worker registration and online/offline notifications in main.jsx
  - Viewport optimization with safe area support for notches

- **Testing**:
  - 26 new E2E tests for PWA and mobile features (week7.spec.js)
  - 106 total E2E tests with 99.1% pass rate

### Changed
- Service worker versioning (v1.6.0 cache names)
- Improved mobile UX with touch-friendly button sizing (≥36px)
- Enhanced offline experience with graceful degradation

### Technical
- Service worker: 147 lines (caching, offline, sync, push)
- Components: 3 new React components (586 lines total)
- Utilities: 3 new utilities (611 lines total)
- PWA files: manifest.json, sw.js, offline.html, pwa.js
- Browser support: Chrome 90+, Edge 90+, Safari 14+, Firefox 93+

---

## [1.5.0] - 2026-01-14

### Added - Network Effects
- **Group Messages**:
  - Create 1-100 unique recipient links from one message
  - Burn-on-first-view mode for group messages
  - Individual tracking per recipient
  - GroupMessageLinks component for link management

- **Referral System**:
  - Privacy-first client-side tracking (localStorage only)
  - 3 reward tiers: 5, 10, 25 messages
  - Rewards: 100MB file limit, custom expiration, priority badge
  - Unique 6-character referral codes
  - Progress tracking with visual progress bars

- **Browser Extension**:
  - Manifest V3 for Chrome/Edge, Firefox compatible
  - Right-click context menu encryption
  - Floating action button for selected text
  - Extension popup for quick access
  - Built-in password generator

- **Invite Friends**:
  - Dedicated /invite page with customization
  - Social media share buttons (Twitter, LinkedIn, WhatsApp, Facebook)
  - Email and SMS invitation templates
  - Web Share API integration
  - InviteModal component on message success

### Technical
- Backend: Migration 0006 (group_messages table)
- Frontend: 16 new files, 8 modified (2,696 lines)
- Testing: 28 new E2E tests (96 total)

---

## [1.4.0] - 2026-01-20

### Added - UI/UX Polish
- **Onboarding Flow**:
  - 3-step tutorial for first-time users
  - Animated transitions with progress bar
  - Skip button and keyboard navigation
  - Full ARIA support for accessibility

- **Message Templates**:
  - 6 pre-written templates (Work, Personal, Events)
  - Quick-insert functionality
  - Category filtering

- **Keyboard Shortcuts**:
  - 12 shortcuts for power users
  - Help modal (Shift+?)
  - Custom hooks for shortcut handling

- **Loading States**:
  - 8 skeleton components for loading states
  - Rotating personality messages during encryption
  - Smooth animations and transitions

### Technical
- Components: OnboardingModal, MessageTemplates, KeyboardShortcutsModal, Skeletons
- 878 lines added (5 new components, 4 modified)
- Full accessibility with ARIA labels and keyboard navigation

---

## [1.3.0] - 2025-12-29

### Added - Gamification
- **Achievement System**:
  - 8 achievements (First Burn, Speed Demon, File Master, etc.)
  - Progress tracking with visual indicators
  - AchievementUnlocked component with confetti

- **Streak Tracking**:
  - Daily message creation streaks
  - Fire emoji indicator
  - Streak persistence across sessions

- **Leaderboard**:
  - Anonymous platform statistics
  - Total messages/files/users
  - Real-time updates

- **Mystery Mode**:
  - Completely anonymous messages
  - No sender information
  - Separate tracking from regular messages

### Technical
- Components: AchievementsPage, AchievementUnlocked
- Utilities: achievements.js (150 lines)
- LocalStorage-based tracking for privacy

---

## [1.2.0] - 2025-12-22

### Added - Viral Mechanics
- **Post-Burn CTA**:
  - "Create Message" button after burn
  - Confetti animation on successful burn
  - Quick recreation workflow

- **Message Preview Page**:
  - Landing page before password entry
  - Animated lock icon
  - Mystery/anticipation building

- **Loading States**:
  - Rotating messages during encryption
  - Personality in upload progress
  - Countdown timer animation

### Changed
- Improved success page design
- Better CTAs throughout
- Enhanced urgency messaging

---

## [1.1.0] - 2025-12-15

### Added - Analytics & Social Proof
- **Message Counter**:
  - Real-time message burn statistics
  - Animated number counting
  - Display on homepage hero

- **Platform Statistics**:
  - Total messages created/burned
  - Total files encrypted
  - Anonymous aggregate stats

- **Analytics Integration**:
  - /api/stats endpoint
  - Daily/weekly/all-time tracking
  - Privacy-respecting (no PII)

### Technical
- Backend: /api/stats endpoint
- Frontend: AnimatedCounter component, useStats hook
- Database: Stats tracking in D1

---

## [1.0.0] - 2025-12-01

### Added - Initial Release
- **Core Security**:
  - Client-side AES-256-GCM encryption
  - One-time message access
  - PBKDF2 password protection (300k iterations)
  - Automatic deletion after first read
  - Optional expiration (1h to 7 days)

- **Media Support**:
  - File upload and encryption (up to 10MB)
  - On-demand file decryption
  - 24-hour grace period for downloads

- **Customization**:
  - Custom short URLs (3-50 characters)
  - QR code generation
  - Countdown timers
  - Open Graph meta tags

- **UI/UX**:
  - Dark mode with system preference
  - Responsive design (mobile + desktop)
  - React + Tailwind CSS
  - Cloudflare Workers backend

### Technical
- Backend: Cloudflare Workers, D1, R2
- Frontend: React, Vite, Tailwind
- Database: 5 migrations
- Encryption: Web Crypto API

---

## Version History Summary

| Version | Release Date | Focus | Lines Added | New Tests |
|---------|-------------|-------|-------------|-----------|
| 1.8.0   | 2026-02-09  | Security Enhancements | 1,350+ | 40+ |
| 1.7.0   | 2026-02-09  | Platform Integrations | 1,200+ | 30+ |
| 1.6.0   | 2026-01-23  | Mobile & PWA | 1,659 | 26 |
| 1.5.0   | 2026-01-14  | Network Effects | 2,696 | 28 |
| 1.4.0   | 2026-01-20  | UI/UX Polish | 878 | 0 |
| 1.3.0   | 2025-12-29  | Gamification | 1,200+ | 19 |
| 1.2.0   | 2025-12-22  | Viral Mechanics | 800+ | 10 |
| 1.1.0   | 2025-12-15  | Analytics | 500+ | 8 |
| 1.0.0   | 2025-12-01  | Initial Release | - | 30 |

**Total E2E Tests**: 176+ (expected 99%+ pass rate)  
**Total Lines**: ~13,000+ across all releases  
**Total Commits**: 24+ feature branches merged

---

[1.8.0]: https://github.com/noteburner/noteburner/releases/tag/v1.8.0
[1.7.0]: https://github.com/noteburner/noteburner/releases/tag/v1.7.0
[1.6.0]: https://github.com/noteburner/noteburner/releases/tag/v1.6.0
[1.5.0]: https://github.com/noteburner/noteburner/releases/tag/v1.5.0
[1.4.0]: https://github.com/noteburner/noteburner/releases/tag/v1.4.0
[1.3.0]: https://github.com/noteburner/noteburner/releases/tag/v1.3.0
[1.2.0]: https://github.com/noteburner/noteburner/releases/tag/v1.2.0
[1.1.0]: https://github.com/noteburner/noteburner/releases/tag/v1.1.0
[1.0.0]: https://github.com/noteburner/noteburner/releases/tag/v1.0.0
