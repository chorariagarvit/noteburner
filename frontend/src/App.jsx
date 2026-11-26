import React, { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import ErrorBoundary from './components/ErrorBoundary';
import HomePage from './pages/HomePage';
import Header from './components/Header';
import Footer from './components/Footer';
import { AuthProvider } from './contexts/AuthContext';
import { I18nProvider, useI18n } from './contexts/I18nContext';
import { ThemeProvider } from './contexts/ThemeProvider';
import A11yRouteAnnouncer, { SkipLink } from './components/A11yRouteAnnouncer';

// Every page except the landing page is its own chunk, so a visitor downloads only the code for the page
// they open. The two core flows are fetched in the background once the browser is idle, so they open instantly.
const CreateMessage = lazy(() => import('./pages/CreateMessage'));
const ViewMessage = lazy(() => import('./pages/ViewMessage'));
const AchievementsPage = lazy(() => import('./pages/AchievementsPage'));
const LeaderboardPage = lazy(() => import('./pages/LeaderboardPage'));
const ReferralsPage = lazy(() => import('./pages/ReferralsPage'));
const InviteFriendsPage = lazy(() => import('./pages/InviteFriendsPage'));
const PrivacyPolicy = lazy(() => import('./pages/PrivacyPolicy'));
const SupportPage = lazy(() => import('./pages/SupportPage'));
const ChangelogPage = lazy(() => import('./pages/ChangelogPage'));
const APIDocumentationPage = lazy(() => import('./pages/APIDocumentationPage'));
const TeamCreationPage = lazy(() => import('./pages/TeamCreationPage'));
const MyTeamsPage = lazy(() => import('./pages/MyTeamsPage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const SignupPage = lazy(() => import('./pages/SignupPage'));
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage'));
const VerifyEmailPage = lazy(() => import('./pages/VerifyEmailPage'));
const ApiKeyManager = lazy(() => import('./components/enterprise/ApiKeyManager'));
const TeamDashboard = lazy(() => import('./components/enterprise/TeamDashboard'));
const BrandingCustomizer = lazy(() => import('./components/enterprise/BrandingCustomizer'));
const ComplianceDashboard = lazy(() => import('./components/enterprise/ComplianceDashboard'));
const PricingPage = lazy(() => import('./pages/PricingPage'));
const PremiumPage = lazy(() => import('./pages/PremiumPage'));
// A failed prefetch (offline, or the visitor navigated away mid-download) is harmless: the page loads normally when opened
const preloadCoreFlows = () => {
  import('./pages/CreateMessage').catch(() => {});
  import('./pages/ViewMessage').catch(() => {});
};

function PageFallback() {
  const { t } = useI18n();
  return (
    <div role="status" data-page-loading="true" className="flex items-center justify-center py-24 text-gray-600 dark:text-gray-300">
      <span className="w-5 h-5 mr-3 border-2 border-current border-t-transparent rounded-full animate-spin" aria-hidden="true" />
      {t('common.loading')}
    </div>
  );
}


// Resets when the visitor moves to another page, so one crashed page does not block the rest of the site
function PageBoundary({ children }) {
  const { pathname } = useLocation();
  const { locale } = useI18n();
  return <ErrorBoundary key={pathname} locale={locale}>{children}</ErrorBoundary>;
}

function App() {
  useEffect(() => {
    const idle = globalThis.requestIdleCallback ?? ((callback) => setTimeout(callback, 2000));
    idle(preloadCoreFlows);
  }, []);

  return (
    <ThemeProvider>
      <I18nProvider>
      <AuthProvider>
        <Router>
          <div className="min-h-screen flex flex-col bg-white dark:bg-gray-900 transition-colors">
            <SkipLink />
            <Header />
            <main id="main-content" tabIndex={-1} className="flex-grow focus:outline-none">
              <PageBoundary>
              <Suspense fallback={<PageFallback />}>
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/create" element={<CreateMessage />} />
                
                {/* Authentication routes */}
                <Route path="/login" element={<LoginPage />} />
                <Route path="/signup" element={<SignupPage />} />
                <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                <Route path="/reset-password" element={<ResetPasswordPage />} />
                <Route path="/verify-email" element={<VerifyEmailPage />} />
                
                {/* Feature pages */}
                <Route path="/achievements" element={<AchievementsPage />} />
                <Route path="/leaderboard" element={<LeaderboardPage />} />
                <Route path="/referrals" element={<ReferralsPage />} />
                <Route path="/invite" element={<InviteFriendsPage />} />
                <Route path="/privacy" element={<PrivacyPolicy />} />
                <Route path="/changelog" element={<ChangelogPage />} />
                <Route path="/support" element={<SupportPage />} />
                <Route path="/docs/api" element={<APIDocumentationPage />} />
                
                {/* Enterprise features */}
                <Route path="/api-keys" element={<ApiKeyManager />} />
                <Route path="/teams" element={<MyTeamsPage />} />
                <Route path="/teams/new" element={<TeamCreationPage />} />
                <Route path="/teams/:teamId" element={<TeamDashboard />} />
                <Route path="/teams/:teamId/branding" element={<BrandingCustomizer />} />
                <Route path="/teams/:teamId/compliance" element={<ComplianceDashboard />} />
                
                {/* Message routes */}
                <Route path="/m/:identifier" element={<ViewMessage />} />

                {/* Pricing & Premium */}
                <Route path="/pricing" element={<PricingPage />} />
                <Route path="/premium" element={<PremiumPage />} />

                <Route path="*" element={<HomePage />} />
              </Routes>
              </Suspense>
              </PageBoundary>
            </main>
            <Footer />
            <A11yRouteAnnouncer />
          </div>
        </Router>
      </AuthProvider>
    </I18nProvider>
  </ThemeProvider>
  );
}

export default App;
