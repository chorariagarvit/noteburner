/**
 * Colour scheme of the popup: "system" (the default: follow the browser/OS), "light" or "dark".
 * The choice is kept in chrome.storage.sync as `colorScheme`. Extensions before 1.15.0 stored a boolean
 * `darkMode`: true becomes "dark", anything else becomes "system" (the old default was always light, which
 * ignored the OS, so only an explicit "dark" is worth keeping).
 *
 * A classic browser script (like crypto.js): top-level functions, no exports.
 */
const COLOR_SCHEMES = ['system', 'light', 'dark'];

/** The scheme to use, from whatever chrome.storage.sync returned. */
function readColorScheme(stored = {}) {
  if (COLOR_SCHEMES.includes(stored.colorScheme)) return stored.colorScheme;
  return stored.darkMode === true ? 'dark' : 'system';
}

/** The next scheme when the button is pressed: system, light, dark, then back to system. */
function nextColorScheme(scheme) {
  return COLOR_SCHEMES[(COLOR_SCHEMES.indexOf(scheme) + 1) % COLOR_SCHEMES.length];
}

/** Whether the popup should be dark, given the chosen scheme and whether the system prefers dark. */
function isDarkScheme(scheme, systemPrefersDark) {
  return scheme === 'dark' || (scheme !== 'light' && Boolean(systemPrefersDark));
}

const COLOR_SCHEME_LABELS = { system: 'System', light: 'Light', dark: 'Dark' };
const COLOR_SCHEME_ICONS = { system: '🖥️', light: '☀️', dark: '🌙' };
