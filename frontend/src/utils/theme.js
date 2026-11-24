// Colour-scheme preference. Three states: "system" (nothing stored: follow the OS), "light" and "dark".
// The choice is kept in localStorage under STORAGE_KEY and mirrored in <meta name="color-scheme">, which the
// CSS (index.css) turns into the color-scheme property that drives native controls, light-dark() and dark:.
export const STORAGE_KEY = 'color-scheme';
export const SCHEMES = ['system', 'light', 'dark'];

/** The page's localStorage, or null when the browser blocks it (merely reading window.localStorage can throw). */
export function getStorage(win = globalThis) {
  try {
    return win.localStorage ?? null;
  } catch {
    return null;
  }
}

/** The stored preference, or "system" when nothing (or anything invalid) is stored or storage is blocked. */
export function readScheme(storage) {
  try {
    const value = storage.getItem(STORAGE_KEY);
    return value === 'light' || value === 'dark' ? value : 'system';
  } catch {
    return 'system'; // storage blocked: follow the system
  }
}

/** Store "light" or "dark"; "system" removes the entry so the OS preference applies again. */
export function writeScheme(storage, scheme) {
  try {
    if (scheme === 'light' || scheme === 'dark') storage.setItem(STORAGE_KEY, scheme);
    else storage.removeItem(STORAGE_KEY);
  } catch {
    // storage blocked: the choice lasts for this page view only
  }
}

/** The order the header button cycles through. */
export const nextScheme = (scheme) => ({ system: 'light', light: 'dark', dark: 'system' })[scheme] ?? 'system';

/** Value of <meta name="color-scheme">: "light dark" means "follow the system". */
export const metaContent = (scheme) => (scheme === 'light' || scheme === 'dark' ? scheme : 'light dark');

/** Whether the page is dark right now (explicit dark, or system while the OS prefers dark). */
export const isDark = (scheme, systemPrefersDark) => scheme === 'dark' || (scheme !== 'light' && Boolean(systemPrefersDark));
