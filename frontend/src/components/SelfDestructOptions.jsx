import React from 'react';

/**
 * Self-Destruct Options Component
 * Advanced destruction settings for high-security messages
 */
const SelfDestructOptions = ({ options, onChange }) => {
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
          Self-Destruct Settings
        </h3>
      </div>

      {/* Max view count */}
      <div>
        <label htmlFor="max-views" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Maximum Views
        </label>
        <select
          id="max-views"
          value={options.maxViews || 1}
          onChange={(e) => handleChange('maxViews', parseInt(e.target.value))}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent"
        >
          <option value={1}>1 view (burn-on-read)</option>
          <option value={2}>2 views</option>
          <option value={3}>3 views</option>
          <option value={5}>5 views</option>
          <option value={10}>10 views</option>
          <option value={-1}>Unlimited (time-based only)</option>
        </select>
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          Message deletes after this many successful decryptions
        </p>
      </div>

      {/* Time-based expiration */}
      <div>
        <label htmlFor="time-limit" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Time Limit
        </label>
        <select
          id="time-limit"
          value={options.expiresInMinutes || 1440}
          onChange={(e) => handleChange('expiresInMinutes', parseInt(e.target.value))}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent"
        >
          <option value={5}>5 minutes</option>
          <option value={15}>15 minutes</option>
          <option value={30}>30 minutes</option>
          <option value={60}>1 hour</option>
          <option value={360}>6 hours</option>
          <option value={720}>12 hours</option>
          <option value={1440}>24 hours (default)</option>
          <option value={4320}>3 days</option>
          <option value={10080}>7 days</option>
        </select>
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          Message deletes after this time, regardless of views
        </p>
      </div>

      {/* Max password attempts */}
      <div>
        <label htmlFor="max-password-attempts" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Max Password Attempts
        </label>
        <select
          id="max-password-attempts"
          value={options.maxPasswordAttempts || 3}
          onChange={(e) => handleChange('maxPasswordAttempts', parseInt(e.target.value))}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent"
        >
          <option value={1}>1 attempt (instant burn)</option>
          <option value={3}>3 attempts</option>
          <option value={5}>5 attempts</option>
          <option value={10}>10 attempts</option>
          <option value={-1}>Unlimited</option>
        </select>
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          Message burns after this many incorrect password attempts
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
              Restrict to same country
            </span>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Require recipient to be in same country as sender
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
              Auto-burn on suspicious activity
            </span>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Delete message if rapid attempts from multiple IPs detected
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
              Require 2FA code (TOTP)
            </span>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Add time-based one-time password for extra security
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
            <p className="font-medium mb-1">⚠️ High-Security Mode</p>
            <p className="text-xs">
              These settings provide maximum protection but may make the message harder to access.
              Balance security with usability for your recipient.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SelfDestructOptions;
