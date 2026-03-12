import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import {
  detectLocale,
  saveLocale,
  translate,
  formatDate,
  formatNumber,
  getTextDirection,
  SUPPORTED_LOCALES
} from '../utils/i18n';

const I18nContext = createContext(null);

export function I18nProvider({ children }) {
  const [locale, setLocaleState] = useState(() => detectLocale());

  const setLocale = useCallback((newLocale) => {
    if (SUPPORTED_LOCALES.includes(newLocale)) {
      saveLocale(newLocale);
      setLocaleState(newLocale);
      // Update html lang attribute
      document.documentElement.lang = newLocale;
      document.documentElement.dir = getTextDirection(newLocale);
    }
  }, []);

  /** t('nav.createMessage') or t('common.daysAgo', { n: 3 }) */
  const t = useCallback(
    (key, params) => translate(locale, key, params),
    [locale]
  );

  const value = useMemo(
    () => ({
      locale,
      setLocale,
      t,
      formatDate: (date, opts) => formatDate(date, locale, opts),
      formatNumber: (n) => formatNumber(n, locale),
      dir: getTextDirection(locale),
      supportedLocales: SUPPORTED_LOCALES
    }),
    [locale, setLocale, t]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error('useI18n must be used inside I18nProvider');
  }
  return ctx;
}
