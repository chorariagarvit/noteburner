import React from 'react';
import { useI18n } from '../contexts/I18nContext';

/**
 * Self-Destruct Options Component
 * Advanced destruction settings for high-security messages
 */
const SelfDestructOptions = ({ options, onChange }) => {
  const { t } = useI18n();
  const handleChange = (key, value) => {
    onChange({ ...options, [key]: value });
  };

  return (
    <div className="space-y-4 bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
      <div className="flex items-center gap-2">
        <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <h3 className="font-medium text-gray-900 dark:text-white">
          {t('selfDestruct.title')}
        </h3>
      </div>

      {/* Max view count */}
      <div>
        <label htmlFor="max-views" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          {t('selfDestruct.maxViewsLabel')}
        </label>
        <select
          id="max-views"
          value={options.maxViews || 1}
          onChange={(e) => handleChange('maxViews', parseInt(e.target.value))}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent"
        >
          <option value={1}>{t('selfDestruct.view1')}</option>
          <option value={2}>{t('selfDestruct.view2')}</option>
          <option value={3}>{t('selfDestruct.view3')}</option>
          <option value={5}>{t('selfDestruct.view5')}</option>
          <option value={10}>{t('selfDestruct.view10')}</option>
          <option value={-1}>{t('selfDestruct.viewUnlimited')}</option>
        </select>
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          {t('selfDestruct.maxViewsHint')}
        </p>
      </div>

      {/* Time-based expiration */}
      <div>
        <label htmlFor="time-limit" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          {t('selfDestruct.timeLimitLabel')}
        </label>
        <select
          id="time-limit"
          value={options.expiresInMinutes || 1440}
          onChange={(e) => handleChange('expiresInMinutes', parseInt(e.target.value))}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent"
        >
          <option value={5}>{t('selfDestruct.time5m')}</option>
          <option value={15}>{t('selfDestruct.time15m')}</option>
          <option value={30}>{t('selfDestruct.time30m')}</option>
          <option value={60}>{t('selfDestruct.time1h')}</option>
          <option value={360}>{t('selfDestruct.time6h')}</option>
          <option value={720}>{t('selfDestruct.time12h')}</option>
          <option value={1440}>{t('selfDestruct.time24h')}</option>
          <option value={4320}>{t('selfDestruct.time3d')}</option>
          <option value={10080}>{t('selfDestruct.time7d')}</option>
        </select>
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          {t('selfDestruct.timeLimitHint')}
        </p>
      </div>

      {/* Max password attempts */}
      <div>
        <label htmlFor="max-password-attempts" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          {t('selfDestruct.maxAttemptsLabel')}
        </label>
        <select
          id="max-password-attempts"
          value={options.maxPasswordAttempts || 3}
          onChange={(e) => handleChange('maxPasswordAttempts', parseInt(e.target.value))}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent"
        >
          <option value={1}>{t('selfDestruct.attempt1')}</option>
          <option value={3}>{t('selfDestruct.attempt3')}</option>
          <option value={5}>{t('selfDestruct.attempt5')}</option>
          <option value={10}>{t('selfDestruct.attempt10')}</option>
          <option value={-1}>{t('selfDestruct.attemptUnlimited')}</option>
        </select>
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          {t('selfDestruct.maxAttemptsHint')}
        </p>
      </div>

      {/* Geographic restrictions */}
      <div>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={options.requireGeoMatch || false}
            onChange={(e) => handleChange('requireGeoMatch', e.target.checked)}
            className="w-4 h-4 text-orange-600 bg-gray-100 border-gray-300 rounded focus:ring-orange-500 dark:focus:ring-orange-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
          />
          <div>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {t('selfDestruct.geoLabel')}
            </span>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {t('selfDestruct.geoDesc')}
            </p>
          </div>
        </label>
      </div>

      {/* Auto-burn on suspicious activity */}
      <div>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={options.autoBurnOnSuspicious || false}
            onChange={(e) => handleChange('autoBurnOnSuspicious', e.target.checked)}
            className="w-4 h-4 text-orange-600 bg-gray-100 border-gray-300 rounded focus:ring-orange-500 dark:focus:ring-orange-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
          />
          <div>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {t('selfDestruct.suspiciousLabel')}
            </span>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {t('selfDestruct.suspiciousDesc')}
            </p>
          </div>
        </label>
      </div>

      {/* Require 2FA */}
      <div>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={options.require2FA || false}
            onChange={(e) => handleChange('require2FA', e.target.checked)}
            className="w-4 h-4 text-orange-600 bg-gray-100 border-gray-300 rounded focus:ring-orange-500 dark:focus:ring-orange-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
          />
          <div>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {t('selfDestruct.totpLabel')}
            </span>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {t('selfDestruct.totpDesc')}
            </p>
          </div>
        </label>
      </div>

      {/* Warning message */}
      <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-3">
        <div className="flex gap-2">
          <svg className="w-5 h-5 text-orange-600 dark:text-orange-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <div className="text-sm text-orange-700 dark:text-orange-300">
            <p className="font-medium mb-1">{t('selfDestruct.warningTitle')}</p>
            <p className="text-xs">
              {t('selfDestruct.warningDesc')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SelfDestructOptions;
