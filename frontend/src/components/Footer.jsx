import React from 'react';
import { Link } from 'react-router-dom';
import { Shield, Puzzle } from 'lucide-react';

import { useI18n } from '../contexts/I18nContext';

// Brand marks from Simple Icons (CC0), simple-icons@13.21.0: googlechrome and firefoxbrowser
const CHROME_LOGO = 'M12 0C8.21 0 4.831 1.757 2.632 4.501l3.953 6.848A5.454 5.454 0 0 1 12 6.545h10.691A12 12 0 0 0 12 0zM1.931 5.47A11.943 11.943 0 0 0 0 12c0 6.012 4.42 10.991 10.189 11.864l3.953-6.847a5.45 5.45 0 0 1-6.865-2.29zm13.342 2.166a5.446 5.446 0 0 1 1.45 7.09l.002.001h-.002l-5.344 9.257c.206.01.413.016.621.016 6.627 0 12-5.373 12-12 0-1.54-.29-3.011-.818-4.364zM12 16.364a4.364 4.364 0 1 1 0-8.728 4.364 4.364 0 0 1 0 8.728Z';
const FIREFOX_LOGO = 'M8.824 7.287c.008 0 .004 0 0 0zm-2.8-1.4c.006 0 .003 0 0 0zm16.754 2.161c-.505-1.215-1.53-2.528-2.333-2.943.654 1.283 1.033 2.57 1.177 3.53l.002.02c-1.314-3.278-3.544-4.6-5.366-7.477-.091-.147-.184-.292-.273-.446a3.545 3.545 0 01-.13-.24 2.118 2.118 0 01-.172-.46.03.03 0 00-.027-.03.038.038 0 00-.021 0l-.006.001a.037.037 0 00-.01.005L15.624 0c-2.585 1.515-3.657 4.168-3.932 5.856a6.197 6.197 0 00-2.305.587.297.297 0 00-.147.37c.057.162.24.24.396.17a5.622 5.622 0 012.008-.523l.067-.005a5.847 5.847 0 011.957.222l.095.03a5.816 5.816 0 01.616.228c.08.036.16.073.238.112l.107.055a5.835 5.835 0 01.368.211 5.953 5.953 0 012.034 2.104c-.62-.437-1.733-.868-2.803-.681 4.183 2.09 3.06 9.292-2.737 9.02a5.164 5.164 0 01-1.513-.292 4.42 4.42 0 01-.538-.232c-1.42-.735-2.593-2.121-2.74-3.806 0 0 .537-2 3.845-2 .357 0 1.38-.998 1.398-1.287-.005-.095-2.029-.9-2.817-1.677-.422-.416-.622-.616-.8-.767a3.47 3.47 0 00-.301-.227 5.388 5.388 0 01-.032-2.842c-1.195.544-2.124 1.403-2.8 2.163h-.006c-.46-.584-.428-2.51-.402-2.913-.006-.025-.343.176-.389.206-.406.29-.787.616-1.136.974-.397.403-.76.839-1.085 1.303a9.816 9.816 0 00-1.562 3.52c-.003.013-.11.487-.19 1.073-.013.09-.026.181-.037.272a7.8 7.8 0 00-.069.667l-.002.034-.023.387-.001.06C.386 18.795 5.593 24 12.016 24c5.752 0 10.527-4.176 11.463-9.661.02-.149.035-.298.052-.448.232-1.994-.025-4.09-.753-5.844z';

// The published browser extension (also linked from extension/README.md)
const CHROME_STORE_URL = 'https://chromewebstore.google.com/detail/noteburner/jibijfhlnoealebkcibpfpomfdllhhdc';
const FIREFOX_STORE_URL = 'https://addons.mozilla.org/en-US/firefox/addon/noteburner/';
const storeButtonClass = 'inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm font-semibold text-gray-800 dark:text-gray-100 shadow-sm hover:border-primary-500 hover:shadow-md hover:-translate-y-0.5 transition-all';

function StoreLogo({ path, color }) {
  return (
    <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill={color} aria-hidden="true"><path d={path} /></svg>
  );
}

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

          <nav aria-label={t('a11y.footerNavigation')} className="flex items-center gap-6">
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
              aria-label={t('a11y.github')}
              className="text-gray-600 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" /></svg>
            </a>
          </nav>
        </div>

        <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700 flex flex-col sm:flex-row items-center justify-center gap-x-4 gap-y-3" data-testid="extension-links">
          <span className="flex items-center gap-2 text-gray-600 dark:text-gray-300 text-sm">
            <Puzzle className="w-4 h-4" aria-hidden="true" />
            {t('footer.getExtension')}
          </span>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <a href={CHROME_STORE_URL} target="_blank" rel="noopener noreferrer" className={storeButtonClass}>
              <StoreLogo path={CHROME_LOGO} color="#4285F4" />
              {t('footer.chromeStore')}
            </a>
            <a href={FIREFOX_STORE_URL} target="_blank" rel="noopener noreferrer" className={storeButtonClass}>
              <StoreLogo path={FIREFOX_LOGO} color="#FF7139" />
              {t('footer.firefoxStore')}
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
