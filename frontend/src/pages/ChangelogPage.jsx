import { useEffect } from 'react';
import { Calendar, Package, CheckCircle, Code, Database, TestTube } from 'lucide-react';

function VersionCard({ version, date, title, features, technical, status = 'released' }) {
  const statusColors = {
    released: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
    beta: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
    planned: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
  };

  return (
    <div className="card hover:shadow-lg transition-shadow duration-200 border-l-4 border-primary-500">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <Package className="w-6 h-6 text-primary-600 dark:text-primary-400" />
          <div>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{version}</h3>
            <div className="flex items-center gap-2 mt-1">
              <Calendar className="w-4 h-4 text-gray-500 dark:text-gray-400" />
              <span className="text-sm text-gray-600 dark:text-gray-300">{date}</span>
            </div>
          </div>
        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusColors[status]}`}>
          {status.charAt(0).toUpperCase() + status.slice(1)}
        </span>
      </div>

      <h4 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-3">{title}</h4>

      {features && features.length > 0 && (
        <div className="mb-4">
          <h5 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
            <CheckCircle className="w-4 h-4" />
            Features
          </h5>
          <ul className="space-y-1">
            {features.map((feature, index) => (
              <li key={index} className="text-sm text-gray-600 dark:text-gray-400 flex items-start gap-2">
                <span className="text-primary-500 mt-1">•</span>
                <span>{feature}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {technical && technical.length > 0 && (
        <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
          <h5 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
            <Code className="w-4 h-4" />
            Technical Details
          </h5>
          <ul className="space-y-1">
            {technical.map((item, index) => (
              <li key={index} className="text-xs text-gray-500 dark:text-gray-400 flex items-start gap-2">
                <span className="text-gray-400 mt-1">›</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function ChangelogPage() {
  useEffect(() => {
    document.title = 'Changelog - NoteBurner';
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Changelog
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300">
            Track every feature, improvement, and update to NoteBurner
          </p>
        </div>

        {/* Changelog Entries */}
        <div className="space-y-8">
          {/* v1.9.0 - Week 10 */}
          <VersionCard
            version="v1.9.0"
            date="February 20, 2026"
            title="Week 10: Enterprise Features"
            status="released"
            features={[
              'API Key Management - Create and manage API keys with custom rate limits and usage tracking',
              'Team Workspaces - Collaborate with role-based access control (owner/admin/member/viewer)',
              'Custom Branding - White-label mode with custom logos, colors, and footer text',
              'Compliance & GDPR Dashboard - Data retention policies, audit log exports, and right to deletion',
              'Session-based Authentication - Secure token-based auth for all enterprise features',
              'Team Statistics - Real-time metrics for active members, messages, and storage'
            ]}
            technical={[
              '22 new API endpoints for enterprise features',
              '6 new database tables (api_keys, teams, team_members, team_messages, branding_config, compliance_settings)',
              '5 new React components (ApiKeyManager, TeamDashboard, BrandingCustomizer, ComplianceDashboard, TeamCreationPage)',
              '34 new E2E tests (186 total tests, 100% passing)',
              '2,850+ lines of code added',
              'Fixed backend SQL queries (removed burned_at column references)',
              'Fixed Vite proxy configuration for /api routes'
            ]}
          />

          {/* v1.8.0 - Week 9 */}
          <VersionCard
            version="v1.8.0"
            date="February 9, 2026"
            title="Week 8-9: Security Enhancements & Platform Integrations"
            status="released"
            features={[
              'Password Strength Meter - Real-time password analysis with 5-level scoring',
              'Self-Destruct Options - Max views, password attempts, time limits, and geographic restrictions',
              'Audit Log System - Privacy-first event tracking with creator-only access',
              'Enhanced Security Headers - CSP, HSTS, X-Frame-Options (A+ security grade)',
              'Slack Integration - /noteburner slash command for team collaboration',
              'Discord Bot - Send encrypted messages directly from Discord',
              'Zapier Integration - Automate workflows with 1000+ apps',
              'API Access - RESTful API with key management and webhooks'
            ]}
            technical={[
              '9 new API endpoints for integrations',
              'Database migrations: 0007_integrations.sql, 0008_security_enhancements.sql',
              '3 new React components (PasswordStrengthMeter, SelfDestructOptions, AuditLogViewer)',
              '70+ E2E tests covering security and integrations',
              '2,550+ lines of code added',
              'Sliding window rate limiting algorithm',
              'DDoS protection with automatic IP banning'
            ]}
          />

          {/* v1.7.0 - Week 7 */}
          <VersionCard
            version="v1.7.0"
            date="January 26, 2026"
            title="Week 7: Mobile Optimization & PWA"
            status="released"
            features={[
              'Progressive Web App (PWA) - Installable on mobile with offline support',
              'Service Worker - Smart caching with background sync',
              'Push Notifications - Optional real-time updates (user opt-in)',
              'Camera Integration - Capture photo/video directly in app with instant encryption',
              'Mobile-First UX - BottomSheet, SwipeableCard, touch-friendly buttons',
              'Share Sheet Integration - Native mobile share with 8 popular apps',
              'Safe Area Support - Optimized for iOS notch and Android navigation bars'
            ]}
            technical={[
              '11 new files (3 React components, 3 utilities, 4 PWA files)',
              'Service worker with versioned caching (v1.6.0)',
              '26 new E2E tests (106 total tests)',
              '1,659 lines of code added',
              'Browser support: Chrome 90+, Edge 90+, Safari 14+, Firefox 93+'
            ]}
          />

          {/* v1.6.0 - Week 6 */}
          <VersionCard
            version="v1.6.0"
            date="January 20, 2026"
            title="Week 6: UI/UX Polish"
            status="released"
            features={[
              'Onboarding Flow - Interactive 3-step tutorial for first-time users',
              'Message Templates - 6 pre-written templates (Work, Personal, Security)',
              'Keyboard Shortcuts - 12 shortcuts with help modal (Ctrl/Cmd + Enter, Escape, etc.)',
              'Enhanced Animations - 6 new Tailwind animations (slide-up, shimmer, pulse-slow)',
              'Loading Skeletons - 8 reusable skeleton components',
              'Full Accessibility - ARIA labels, keyboard navigation, screen reader support'
            ]}
            technical={[
              '5 new components (OnboardingModal, MessageTemplates, KeyboardShortcutsModal, Skeletons, useKeyboardShortcuts)',
              '878 lines of code added',
              'Full ARIA compliance with semantic HTML',
              'Platform detection for Mac ⌘ vs Ctrl shortcuts'
            ]}
          />

          {/* v1.5.0 - Week 5 */}
          <VersionCard
            version="v1.5.0"
            date="January 14, 2026"
            title="Week 5: Network Effects"
            status="released"
            features={[
              'Group Messages - Create 1-100 unique recipient links with burn-on-first-view option',
              'Referral System - Client-side rewards (100MB file limit, custom expiration, priority badge)',
              'Browser Extension - Chrome/Firefox Manifest V3 with context menu and popup',
              'Invite Friends - Email invitations, social sharing (Twitter, LinkedIn, WhatsApp)',
              'Web Share API - Mobile-optimized sharing with copy to clipboard fallback',
              'Unique Referral Codes - 6-character codes with self-referral prevention'
            ]}
            technical={[
              'Migration 0006: message_groups table',
              '16 new files (components, utilities, extension files)',
              '28 new E2E tests (96 total tests)',
              '2,696 lines of code added',
              'Browser extension with 3 access methods (context menu, floating button, popup)'
            ]}
          />

          {/* v1.4.0 - Week 4 */}
          <VersionCard
            version="v1.4.0"
            date="January 8, 2026"
            title="Week 4: Gamification"
            status="released"
            features={[
              'Achievement System - 8 achievements (First Burn, Speed Demon, Centurion, Streak Master)',
              'Streak Tracking - Daily consecutive message creation with fire emoji',
              'Anonymous Leaderboard - Platform statistics without personal info',
              'Mystery Message Mode - Send completely anonymous messages',
              'Progress Tracking - Visual progress bars for partial achievements',
              'Confetti Celebrations - Achievement unlock animations'
            ]}
            technical={[
              '13 files changed (6 new, 6 modified, 2 moved)',
              '12 new E2E tests (52 total tests)',
              '1,040 lines of code added',
              'Client-side achievement tracking (localStorage for privacy)',
              'Dependency: canvas-confetti@1.9.3'
            ]}
          />

          {/* v1.3.0 - Week 3 */}
          <VersionCard
            version="v1.3.0"
            date="January 1, 2026"
            title="Week 3: Custom URLs & Branding"
            status="released"
            features={[
              'Custom Short URLs - Choose your own URLs (e.g., /SecretSanta) with real-time validation',
              'QR Code Generation - Auto-generate 512x512px QR codes for all messages',
              'Countdown Timer - Live countdown with urgency states (normal/urgent/critical)',
              'Open Graph Tags - Social media preview images (Twitter Card, Facebook, LinkedIn)',
              'Profanity Filter - Leetspeak detection with 21-word filter',
              'Reserved Slugs - Protection for api, admin, login routes'
            ]}
            technical={[
              'Migration 0004: custom_slug column',
              '16 new E2E tests',
              '1,338 lines of code added',
              'Dependencies: qrcode@1.5.4, lodash.debounce@4.0.8',
              'QRCodeDisplay, CountdownTimer components with useOpenGraph hook'
            ]}
          />

          {/* v1.2.5 - E2E Testing */}
          <VersionCard
            version="v1.2.5"
            date="December 25, 2025"
            title="Week 2.5: E2E Testing Setup"
            status="released"
            features={[
              'Playwright Setup - Complete E2E testing infrastructure',
              'Core Security Tests - Message deletion, one-time access, race conditions',
              'User Experience Tests - Dark mode, copy URL, mobile responsive layouts',
              'Edge Case Tests - Large files, browser back button, expired messages',
              'CI Integration - GitHub Actions with test reports'
            ]}
            technical={[
              '96 E2E tests covering all features',
              'Parallel test execution with 3 workers',
              'Screenshot failures for debugging',
              'Test coverage: Weeks 1-5 (message lifecycle, viral mechanics, gamification, network effects)'
            ]}
          />

          {/* v1.2.0 - Week 2 */}
          <VersionCard
            version="v1.2.0"
            date="December 22, 2025"
            title="Week 2: Viral Mechanics"
            status="released"
            features={[
              'Post-Burn CTA - "Create Your Own Message" after destruction with confetti',
              'Message Preview Page - Landing page with mystery/anticipation building',
              'Easy Recreation - "Send Another Message" with pre-filled settings',
              'Loading States - Rotating personality messages during operations',
              'Countdown Timer Animation - Visual urgency for expiring messages'
            ]}
            technical={[
              'Improved success page design',
              'Confetti animation on message burn',
              'Enhanced CTAs throughout app',
              'Urgency messaging with countdown'
            ]}
          />

          {/* v1.1.0 - Week 1 */}
          <VersionCard
            version="v1.1.0"
            date="December 15, 2025"
            title="Week 1: Analytics & Social Proof"
            status="released"
            features={[
              'Message Counter - "X messages burned today/this week" on homepage',
              'Anonymous Usage Stats - Total messages created, burned, files encrypted',
              'Real-Time Updates - Stats refresh every 30 seconds with AnimatedCounter',
              'Platform Statistics - Display stats prominently for trust building',
              'Privacy-Respecting Analytics - No PII collection'
            ]}
            technical={[
              '/api/stats endpoint added',
              'D1 database tracking: daily/weekly/all-time aggregates',
              'useStats hook with 30s refresh interval',
              'AnimatedCounter component with smooth transitions'
            ]}
          />

          {/* v1.0.0 - Initial Launch */}
          <VersionCard
            version="v1.0.0"
            date="December 1, 2025"
            title="Initial Launch"
            status="released"
            features={[
              'Client-Side AES-256-GCM Encryption - Military-grade encryption in browser',
              'One-Time Message Access - Atomic deletion after first successful decryption',
              'Password Protection - PBKDF2 with 300k iterations for strong key derivation',
              'Media File Support - Upload and encrypt files up to 100MB',
              'Auto-Expiration - Set time limits from 1 hour to 7 days',
              'Dark Mode - System preference detection with manual toggle',
              'Responsive Design - Optimized for mobile and desktop',
              '24-Hour Grace Period - File downloads available for 24h after message burn',
              'Privacy-First Architecture - Zero-knowledge, no tracking, no PII collection'
            ]}
            technical={[
              'Cloudflare Workers backend with Hono framework',
              'React 18 frontend with Tailwind CSS',
              'D1 SQLite database for metadata',
              'R2 bucket for encrypted file storage',
              'Vite 5.4.21 build system',
              'End-to-end encryption pipeline'
            ]}
          />
        </div>

        {/* Footer */}
        <div className="mt-16 pt-8 border-t border-gray-200 dark:border-gray-700 text-center">
          <div className="flex items-center justify-center gap-2 text-gray-600 dark:text-gray-400">
            <TestTube className="w-5 h-5" />
            <p className="text-sm">
              All features are thoroughly tested with 186 E2E tests before release
            </p>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
            Last updated: February 20, 2026
          </p>
        </div>
      </div>
    </div>
  );
}

export default ChangelogPage;
