import React from 'react';
import { translate } from '../utils/i18n';

/**
 * Catches a crash while rendering a page, so one broken page does not leave a blank screen.
 *
 * It sits inside the router, keyed by the current path, so moving to another page clears the error.
 * It is a class because React only supports error boundaries as classes. It reads the language from props
 * because it must still work if the translation context itself is what failed.
 */
export default class ErrorBoundary extends React.Component {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error, info) {
    console.error('[NoteBurner] A page failed to render:', error, info?.componentStack);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    const t = (key) => translate(this.props.locale || 'en', key);
    return (
      <div role="alert" className="max-w-xl mx-auto px-4 py-20 text-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">{t('errorBoundary.title')}</h1>
        <p className="text-gray-600 dark:text-gray-300 mb-6">{t('errorBoundary.body')}</p>
        <div className="flex justify-center gap-3">
          <button
            type="button"
            onClick={() => globalThis.location.reload()}
            className="px-5 py-2 rounded-lg bg-primary-600 text-white font-semibold hover:bg-primary-700"
          >
            {t('errorBoundary.reload')}
          </button>
          <a href="/" className="px-5 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-100 font-semibold">
            {t('errorBoundary.home')}
          </a>
        </div>
      </div>
    );
  }
}
