import React from 'react';
import { Link } from 'react-router-dom';
import { Github, Shield } from 'lucide-react';
import { useI18n } from '../contexts/I18nContext';

function Footer() {
  const { t } = useI18n();
  return (
    <footer className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 mt-auto transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300 text-sm">
            <Shield className="w-4 h-4" />
            <span>{t('footer.encrypted')}</span>
          </div>

          <div className="text-gray-500 dark:text-gray-400 text-sm">
            {t('footer.copyright', { year: new Date().getFullYear() })}
          </div>

          <div className="flex items-center gap-6">
            <Link to="/privacy" className="text-sm text-gray-600 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400">
              {t('footer.privacy')}
            </Link>
            <Link to="/changelog" className="text-sm text-gray-600 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400">
              {t('footer.changelog')}
            </Link>
            <Link to="/support" className="text-sm text-gray-600 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400">
              {t('footer.support')}
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
