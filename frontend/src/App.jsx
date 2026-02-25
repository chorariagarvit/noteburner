import React, { createContext, useState, useEffect, useMemo } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import CreateMessage from './pages/CreateMessage';
import ViewMessage from './pages/ViewMessage';
import AchievementsPage from './pages/AchievementsPage';
import LeaderboardPage from './pages/LeaderboardPage';
import ReferralsPage from './pages/ReferralsPage';
import InviteFriendsPage from './pages/InviteFriendsPage';
import PrivacyPolicy from './pages/PrivacyPolicy';
import SupportPage from './pages/SupportPage';
import ChangelogPage from './pages/ChangelogPage';
import APIDocumentationPage from './pages/APIDocumentationPage';
import TeamCreationPage from './pages/TeamCreationPage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import Header from './components/Header';
import Footer from './components/Footer';
import ApiKeyManager from './components/enterprise/ApiKeyManager';
import TeamDashboard from './components/enterprise/TeamDashboard';
import BrandingCustomizer from './components/enterprise/BrandingCustomizer';
import ComplianceDashboard from './components/enterprise/ComplianceDashboard';
import { AuthProvider } from './contexts/AuthContext';

export const ThemeContext = createContext();

function App() {
  const [darkMode, setDarkMode] = useState(() => {
    // Check localStorage first, then system preference
    const saved = localStorage.getItem('darkMode');
    if (saved !== null) {
      return saved === 'true';
    }
    return globalThis.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    // Apply dark mode class to document
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    // Save preference
    localStorage.setItem('darkMode', darkMode);
  }, [darkMode]);

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
  };

  const contextValue = useMemo(() => ({ darkMode, toggleDarkMode }), [darkMode]);

  return (
    <ThemeContext.Provider value={contextValue}>
      <AuthProvider>
        <Router>
          <div className="min-h-screen flex flex-col bg-white dark:bg-gray-900 transition-colors">
            <Header />
            <main className="flex-grow">
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/create" element={<CreateMessage />} />
                
                {/* Authentication routes */}
                <Route path="/login" element={<LoginPage />} />
                <Route path="/signup" element={<SignupPage />} />
                <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                <Route path="/reset-password" element={<ResetPasswordPage />} />
                
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
                <Route path="/teams/new" element={<TeamCreationPage />} />
                <Route path="/teams/:teamId" element={<TeamDashboard />} />
                <Route path="/teams/:teamId/branding" element={<BrandingCustomizer />} />
                <Route path="/teams/:teamId/compliance" element={<ComplianceDashboard />} />
                
                {/* Message routes */}
                <Route path="/m/:identifier" element={<ViewMessage />} />
                <Route path="*" element={<HomePage />} />
              </Routes>
            </main>
            <Footer />
          </div>
        </Router>
      </AuthProvider>
    </ThemeContext.Provider>
  );
}

export default App;
