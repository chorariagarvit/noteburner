import React, { useContext } from 'react';
import { Link } from 'react-router-dom';
import { Flame, Moon, Sun, Trophy, Gift } from 'lucide-react';
import { ThemeContext } from '../App';

function Header() {
  const { darkMode, toggleDarkMode } = useContext(ThemeContext);
  
  return (
    <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <Flame className="w-8 h-8 text-red-600 dark:text-red-500" />
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              NoteBurner
            </h1>
          </Link>
          
          <nav className="flex items-center gap-4">
            <Link 
              to="/create" 
              className="text-gray-600 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 font-medium transition-colors"
            >
              Create Message
            </Link>
            <Link 
              to="/achievements" 
              className="flex items-center gap-1 text-gray-600 dark:text-gray-300 hover:text-yellow-600 dark:hover:text-yellow-400 font-medium transition-colors"
            >
              <Trophy className="w-4 h-4" />
              <span className="hidden sm:inline">Achievements</span>
            </Link>
            <Link 
              to="/referrals" 
              className="flex items-center gap-1 text-gray-600 dark:text-gray-300 hover:text-green-600 dark:hover:text-green-400 font-medium transition-colors"
            >
              <Gift className="w-4 h-4" />
              <span className="hidden sm:inline">Rewards</span>
            </Link>
            <Link 
              to="/leaderboard" 
              className="text-gray-600 dark:text-gray-300 hover:text-purple-600 dark:hover:text-purple-400 font-medium transition-colors"
            >
              <span className="hidden sm:inline">Leaderboard</span>
              <span className="sm:hidden">Stats</span>
            </Link>
            <button
              onClick={toggleDarkMode}
              className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              aria-label="Toggle dark mode"
            >
              {darkMode ? (
                <Sun className="w-5 h-5 text-yellow-500" />
              ) : (
                <Moon className="w-5 h-5 text-gray-700" />
              )}
            </button>
          </nav>
        </div>
      </div>
    </header>
  );
}

export default Header;
