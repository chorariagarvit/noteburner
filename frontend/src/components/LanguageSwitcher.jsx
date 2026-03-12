import React, { useState, useRef, useEffect } from 'react';
import { Globe } from 'lucide-react';
import { useI18n } from '../contexts/I18nContext';

const LOCALE_FLAGS = {
  en: '🇺🇸',
  es: '🇪🇸',
  fr: '🇫🇷',
  de: '🇩🇪',
  zh: '🇨🇳',
  hi: '🇮🇳'
};

export default function LanguageSwitcher() {
  const { locale, setLocale, t, supportedLocales } = useI18n();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  // Close on outside click
  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 p-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-sm font-medium text-gray-700 dark:text-gray-300"
        aria-label="Select language"
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <Globe className="w-4 h-4" />
        <span className="hidden sm:inline">{LOCALE_FLAGS[locale]} {t(`languages.${locale}`)}</span>
        <span className="sm:hidden">{LOCALE_FLAGS[locale]}</span>
      </button>

      {open && (
        <div
          className="absolute right-0 mt-2 w-44 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50 overflow-hidden"
          role="listbox"
          aria-label="Select language"
        >
          {supportedLocales.map((code) => (
            <button
              key={code}
              role="option"
              aria-selected={locale === code}
              onClick={() => {
                setLocale(code);
                setOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left transition-colors
                ${locale === code
                  ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 font-medium'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
            >
              <span className="text-base">{LOCALE_FLAGS[code]}</span>
              <span>{t(`languages.${code}`)}</span>
              {locale === code && (
                <span className="ml-auto text-red-500">✓</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
