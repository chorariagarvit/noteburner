import React, { createContext, useContext, useState, useCallback, useEffect, useMemo } from 'react';
import {
  detectLocale,
  loadLocale,
  saveLocale,
  translate,
  formatDate,
  formatNumber,
  getTextDirection,
  SUPPORTED_LOCALES
} from '../utils/i18n';

const I18nContext = createContext(null);

export function I18nProvider({ children }) {
  const [locale, setLocaleValue] = useState(() => detectLocale());
  // Bumped when a language finishes loading, so the page re-renders with its translations
  const [loadedLocales, setLoadedLocales] = useState(0);

  // Screen readers pick the pronunciation from <html lang>: it must follow the language in use, from the first render
  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = getTextDirection(locale);
  }, [locale]);

  useEffect(() => {
    let cancelled = false;
    loadLocale(locale)
      .then(() => { if (!cancelled) setLoadedLocales((n) => n + 1); })
      .catch(() => { /* offline or blocked: the page keeps showing English */ });
    return () => { cancelled = true; };
  }, [locale]);

  // Load the language first, then switch, so there is no flash of English in between
  const setLocale = useCallback(async (newLocale) => {
    if (!SUPPORTED_LOCALES.includes(newLocale)) return;
    saveLocale(newLocale);
    try { await loadLocale(newLocale); } catch { /* offline: the page falls back to English */ }
    setLocaleValue(newLocale);
  }, []);

  /** t('nav.createMessage') or t('common.daysAgo', { n: 3 }) */
  const t = useCallback(
    (key, params) => translate(locale, key, params),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- loadedLocales makes t() change when a language arrives
    [locale, loadedLocales]
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
