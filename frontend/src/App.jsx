import React, { createContext, useState, useEffect, useMemo } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import CreateMessage from './pages/CreateMessage';
import ViewMessage from './pages/ViewMessage';
import Header from './components/Header';
import Footer from './components/Footer';

export const ThemeContext = createContext();

function App() {
  const [darkMode, setDarkMode] = useState(() => {
    // Check localStorage first, then system preference
    const saved = localStorage.getItem('darkMode');
    if (saved !== null) {
      return saved === 'true';
    }
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
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
              <Route path="/m/:token" element={<ViewMessage />} />
            </Routes>
          </main>
          <Footer />
        </div>
      </Router>
    </ThemeContext.Provider>
  );
}

export default App;
