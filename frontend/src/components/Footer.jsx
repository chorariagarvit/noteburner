import React from 'react';
import { Link } from 'react-router-dom';
import { Github, Shield } from 'lucide-react';

function Footer() {
  return (
    <footer className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 mt-auto transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300 text-sm">
            <Shield className="w-4 h-4" />
            <span>End-to-end encrypted. Zero knowledge.</span>
          </div>

          <div className="text-gray-500 dark:text-gray-400 text-sm">
            © {new Date().getFullYear()} NoteBurner. All messages self-destruct.
          </div>

          <div className="flex items-center gap-6">
            <Link to="/privacy" className="text-sm text-gray-600 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400">
              Privacy
            </Link>
            <Link to="/support" className="text-sm text-gray-600 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400">
              Support
            </Link>
            <a
              href="https://github.com/chorariagarvit/noteburner"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-600 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
            >
              <Github className="w-5 h-5" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
