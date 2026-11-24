// Applies the saved colour scheme before the first paint, so there is no flash of the wrong theme.
// It is an external, synchronous script (not inline) because the Content-Security-Policy forbids inline scripts.
// Keep it tiny and dependency-free; the same rules live in src/utils/theme.js (a test checks they agree).
(function () {
  try {
    var KEY = 'color-scheme';
    var saved = localStorage.getItem(KEY);
    if (saved === null) {
      // one-time migration from the old on/off switch: a stored "true" meant dark, "false" meant "no preference"
      var legacy = localStorage.getItem('darkMode');
      if (legacy !== null) {
        localStorage.removeItem('darkMode');
        if (legacy === 'true') { saved = 'dark'; localStorage.setItem(KEY, saved); }
      }
    }
    var meta = document.querySelector('meta[name="color-scheme"]');
    if (meta && (saved === 'light' || saved === 'dark')) meta.setAttribute('content', saved);
  } catch (e) {
    // storage blocked: the page follows the system preference
  }
})();
