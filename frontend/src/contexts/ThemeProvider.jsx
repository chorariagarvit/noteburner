import { useEffect, useMemo, useState } from 'react';
import { ThemeContext } from './ThemeContext';
import { STORAGE_KEY, getStorage, readScheme, writeScheme, nextScheme, metaContent, isDark } from '../utils/theme';

const DARK_QUERY = '(prefers-color-scheme: dark)';

/**
 * Three-state theme: "system" (follow the OS), "light" or "dark".
 * The page is themed by CSS from <meta name="color-scheme"> (see index.css); this provider keeps the meta, the
 * stored choice and other open tabs in step, and tells components which scheme is active.
 */
export function ThemeProvider({ children }) {
  const [scheme, setScheme] = useState(() => readScheme(getStorage()));
  const [systemDark, setSystemDark] = useState(() => globalThis.matchMedia(DARK_QUERY).matches);

  // mirror the choice into the <meta> (CSS reads it) and into storage
  useEffect(() => {
    document.querySelector('meta[name="color-scheme"]')?.setAttribute('content', metaContent(scheme));
    writeScheme(getStorage(), scheme);
  }, [scheme]);

  // follow the OS while the choice is "system"
  useEffect(() => {
    const query = globalThis.matchMedia(DARK_QUERY);
    const onChange = (event) => setSystemDark(event.matches);
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);

  // another tab changed the choice
  useEffect(() => {
    const onStorage = (event) => {
      if (event.key === STORAGE_KEY || event.key === null) setScheme(readScheme(getStorage()));
    };
    globalThis.addEventListener('storage', onStorage);
    return () => globalThis.removeEventListener('storage', onStorage);
  }, []);

  const value = useMemo(() => ({
    scheme,
    setScheme,
    cycleScheme: () => setScheme((current) => nextScheme(current)),
    darkMode: isDark(scheme, systemDark),
  }), [scheme, systemDark]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
