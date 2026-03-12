/**
 * Locale detection middleware
 * Week 13 - Internationalization
 *
 * Detects user locale from Accept-Language header and attaches it to context.
 */

const SUPPORTED_LOCALES = ['en', 'es', 'fr', 'de', 'zh', 'hi'];
const DEFAULT_LOCALE = 'en';

/**
 * Parse the Accept-Language header and return the best matching supported locale.
 * @param {string} header - Accept-Language header value
 * @returns {string} - Best matching locale code
 */
function parseAcceptLanguage(header) {
  if (!header) return DEFAULT_LOCALE;

  // Parse: "fr-FR,fr;q=0.9,en;q=0.8"
  const parts = header
    .split(',')
    .map((part) => {
      const [lang, q] = part.trim().split(';q=');
      return { lang: lang.trim().split('-')[0].toLowerCase(), q: parseFloat(q || '1') };
    })
    .sort((a, b) => b.q - a.q);

  for (const { lang } of parts) {
    if (SUPPORTED_LOCALES.includes(lang)) {
      return lang;
    }
  }

  return DEFAULT_LOCALE;
}

/**
 * Hono middleware that attaches locale to context
 */
export function detectLocale() {
  return async (c, next) => {
    const acceptLanguage = c.req.header('Accept-Language') || '';
    const locale = parseAcceptLanguage(acceptLanguage);
    c.set('locale', locale);
    c.header('Content-Language', locale);
    await next();
  };
}

/**
 * Get the detected locale from context (default 'en')
 * @param {Context} c - Hono context
 * @returns {string}
 */
export function getLocale(c) {
  return c.get('locale') || DEFAULT_LOCALE;
}

/**
 * Determine regional compliance requirements based on Accept-Language / IP hints.
 * @param {string} locale
 * @returns {{ gdpr: boolean, ccpa: boolean, region: string }}
 */
export function getComplianceRequirements(locale) {
  const euLocales = ['de', 'fr', 'es'];
  return {
    gdpr: euLocales.includes(locale),
    ccpa: locale === 'en', // US English users may be subject to CCPA
    region: locale === 'zh' ? 'CN' : euLocales.includes(locale) ? 'EU' : 'US'
  };
}
