import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useI18n } from '../contexts/I18nContext';

/** The "skip to content" link: the first thing a keyboard or screen reader user reaches on every page. */
export function SkipLink() {
  const { t } = useI18n();
  const jump = (event) => {
    event.preventDefault();
    const main = document.getElementById('main-content');
    main?.focus({ preventScroll: true });
    main?.scrollIntoView?.();
  };
  return (
    <a
      href="#main-content"
      onClick={jump}
      className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:px-4 focus:py-2 focus:rounded-lg focus:bg-primary-700 focus:text-white focus:font-semibold focus:shadow-lg"
    >
      {t('a11y.skipToContent')}
    </a>
  );
}

/**
 * Makes page changes in this single-page app perceivable without sight.
 *
 * A normal page load announces the new page and resets focus; a client-side route change does neither, so a
 * screen reader user is left on a link that no longer exists. After every navigation this waits for the new
 * page's heading, gives the page a title if it did not set one, moves focus to the heading and announces the
 * page through a polite live region. The first load is left to the browser.
 */
export default function A11yRouteAnnouncer() {
  const { pathname } = useLocation();
  const { t } = useI18n();
  const [announcement, setAnnouncement] = useState('');
  // The path the page was last settled on. Comparing paths (not a "first render" flag) keeps the first load
  // untouched even when React runs effects twice in development.
  const settledPath = useRef(pathname);

  useEffect(() => {
    if (settledPath.current === pathname) return undefined;
    settledPath.current = pathname;
    const main = document.getElementById('main-content');
    if (!main) return undefined;

    const titleBefore = document.title;
    let finished = false;
    let settleTimer;

    const finish = () => {
      if (finished) return;
      finished = true;
      observer.disconnect();
      clearTimeout(giveUpTimer);
      const heading = main.querySelector('h1');
      if (heading && document.title === titleBefore) {
        document.title = `${heading.textContent.trim()} - NoteBurner`;
      }
      const target = heading ?? main;
      target.setAttribute('tabindex', '-1');
      target.focus({ preventScroll: true });
      setAnnouncement(t('a11y.pageLoaded', { title: document.title }));
    };

    // The page may still be downloading its code: wait for its heading, then a beat so its own title effect runs first
    const observer = new MutationObserver(() => {
      if (main.querySelector('h1')) {
        clearTimeout(settleTimer);
        settleTimer = setTimeout(finish, 80);
      }
    });
    observer.observe(main, { childList: true, subtree: true });
    const giveUpTimer = setTimeout(finish, 3000);
    if (main.querySelector('h1')) settleTimer = setTimeout(finish, 80);

    return () => {
      finished = true;
      observer.disconnect();
      clearTimeout(settleTimer);
      clearTimeout(giveUpTimer);
    };
  }, [pathname, t]);

  return (
    <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
      {announcement}
    </div>
  );
}
