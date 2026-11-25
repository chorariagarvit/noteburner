/**
 * Safe wrappers around localStorage and sessionStorage.
 *
 * Reading `window.localStorage` can itself throw (blocked site data, some private modes, sandboxed frames),
 * and setItem throws when the quota is full. Every call here swallows that and degrades to "nothing stored",
 * so a visitor with storage blocked still gets a working page.
 */
function makeStore(area) {
  const read = () => {
    try { return globalThis[area]; } catch { return null; }
  };
  return {
    get(key) {
      try { return read()?.getItem(key) ?? null; } catch { return null; }
    },
    set(key, value) {
      try {
        const area = read();
        if (!area) return false;
        area.setItem(key, value);
        return true;
      } catch { return false; }
    },
    remove(key) {
      try { read()?.removeItem(key); } catch { /* storage unavailable: nothing to remove */ }
    },
  };
}

export const localStore = makeStore('localStorage');
export const sessionStore = makeStore('sessionStorage');
