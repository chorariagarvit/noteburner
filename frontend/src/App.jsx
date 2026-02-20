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
import TeamCreationPage from './pages/TeamCreationPage';
import Header from './components/Header';
import Footer from './components/Footer';
import ApiKeyManager from './components/enterprise/ApiKeyManager';
import TeamDashboard from './components/enterprise/TeamDashboard';
import BrandingCustomizer from './components/enterprise/BrandingCustomizer';
import ComplianceDashboard from './components/enterprise/ComplianceDashboard';

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
      <Router>
        <div className="min-h-screen flex flex-col bg-white dark:bg-gray-900 transition-colors">
          <Header />
          <main className="flex-grow">
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/create" element={<CreateMessage />} />
              <Route path="/achievements" element={<AchievementsPage />} />
              <Route path="/leaderboard" element={<LeaderboardPage />} />
              <Route path="/referrals" element={<ReferralsPage />} />
              <Route path="/invite" element={<InviteFriendsPage />} />
              <Route path="/privacy" element={<PrivacyPolicy />} />
              <Route path="/changelog" element={<ChangelogPage />} />
              <Route path="/support" element={<SupportPage />} />
              <Route path="/api-keys" element={<ApiKeyManager />} />
              <Route path="/teams/new" element={<TeamCreationPage />} />
              <Route path="/teams/:teamId" element={<TeamDashboard />} />
              <Route path="/teams/:teamId/branding" element={<BrandingCustomizer />} />
              <Route path="/teams/:teamId/compliance" element={<ComplianceDashboard />} />
              <Route path="/m/:identifier" element={<ViewMessage />} />
              <Route path="*" element={<HomePage />} />
            </Routes>
          </main>
          <Footer />
        </div>
      </Router>
    </ThemeContext.Provider>
  );
}

export default App;
