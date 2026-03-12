/**
 * Internationalization (i18n) utility
 * Week 13 - Internationalization
 *
 * Lightweight i18n without external dependencies.
 * Supports: en, es, fr, de, zh, hi
 */

import en from '../locales/en.json';
import es from '../locales/es.json';
import fr from '../locales/fr.json';
import de from '../locales/de.json';
import zh from '../locales/zh.json';
import hi from '../locales/hi.json';

export const SUPPORTED_LOCALES = ['en', 'es', 'fr', 'de', 'zh', 'hi'];
export const DEFAULT_LOCALE = 'en';

const translations = { en, es, fr, de, zh, hi };

/**
 * Detect user's preferred locale from browser settings
 * @returns {string} - Detected locale code or default
 */
export function detectLocale() {
  const stored = localStorage.getItem('noteburner_locale');
  if (stored && SUPPORTED_LOCALES.includes(stored)) {
    return stored;
  }

  const browserLangs = navigator.languages || [navigator.language];

  for (const lang of browserLangs) {
    const code = lang.split('-')[0].toLowerCase();
    if (SUPPORTED_LOCALES.includes(code)) {
      return code;
    }
  }

  return DEFAULT_LOCALE;
}

/**
 * Save user's locale preference to localStorage
 * @param {string} locale
 */
export function saveLocale(locale) {
  localStorage.setItem('noteburner_locale', locale);
}

/**
 * Resolve a nested translation key (e.g. "nav.createMessage")
 * @param {Object} obj - Translation object
 * @param {string} key - Dot-notation key
 * @returns {string|undefined}
 */
function resolvePath(obj, key) {
  return key.split('.').reduce((acc, part) => acc?.[part], obj);
}

/**
 * Get a translated string for the given locale and key.
 * Falls back to English if the key is missing in the requested locale.
 *
 * @param {string} locale - Locale code (e.g. 'es')
 * @param {string} key - Dot-notation key (e.g. 'nav.createMessage')
 * @param {Object} [params] - Interpolation parameters (e.g. { n: 5 })
 * @returns {string}
 */
export function translate(locale, key, params = {}) {
  const localeData = translations[locale] || translations[DEFAULT_LOCALE];
  let value = resolvePath(localeData, key);

  // Fall back to English
  if (value === undefined) {
    value = resolvePath(translations[DEFAULT_LOCALE], key);
  }

  // Final fallback: return the key itself
  if (value === undefined) {
    return key;
  }

  // Interpolate {variable} placeholders
  return String(value).replace(/\{(\w+)\}/g, (_, name) =>
    params[name] !== undefined ? params[name] : `{${name}}`
  );
}

/**
 * Locale-aware date formatter
 * @param {string|Date} date
 * @param {string} locale
 * @param {Intl.DateTimeFormatOptions} [options]
 * @returns {string}
 */
export function formatDate(date, locale, options = {}) {
  const intlLocale = localeToIntl(locale);
  return new Intl.DateTimeFormat(intlLocale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    ...options
  }).format(new Date(date));
}

/**
 * Locale-aware number formatter
 * @param {number} n
 * @param {string} locale
 * @returns {string}
 */
export function formatNumber(n, locale) {
  return new Intl.NumberFormat(localeToIntl(locale)).format(n);
}

/**
 * Map our locale codes to BCP 47 language tags for Intl APIs
 */
function localeToIntl(locale) {
  const map = {
    en: 'en-US',
    es: 'es-ES',
    fr: 'fr-FR',
    de: 'de-DE',
    zh: 'zh-CN',
    hi: 'hi-IN'
  };
  return map[locale] || 'en-US';
}

/**
 * Get the text direction for a locale
 * @param {string} locale
 * @returns {'ltr'|'rtl'}
 */
export function getTextDirection(locale) {
  // None of our current locales are RTL, but this future-proofs it
  const rtlLocales = ['ar', 'he', 'fa', 'ur'];
  return rtlLocales.includes(locale) ? 'rtl' : 'ltr';
}

export { translations };
