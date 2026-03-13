import { useState, useEffect } from 'react';
import { Key, Trash2, AlertCircle, CheckCircle, Copy, ExternalLink } from 'lucide-react';
import { getAuthHeaders, getAuthHeadersWithJSON } from '../../utils/session';
import { useI18n } from '../../contexts/I18nContext';

export default function ApiKeyManager() {
  const { t } = useI18n();
  const [apiKeys, setApiKeys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyRateLimit, setNewKeyRateLimit] = useState(1000);
  const [createdKey, setCreatedKey] = useState(null);

  useEffect(() => {
    loadApiKeys();
  }, []);

  const loadApiKeys = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/api-keys', {
        headers: getAuthHeaders()
      });

      if (!response.ok) {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to load API keys');
        } else {
          throw new Error(`Failed to load API keys (${response.status})`);
        }
      }

      const data = await response.json();
      setApiKeys(data.keys || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateKey = async (e) => {
    e.preventDefault();
    
    try {
      setError(null);
      const response = await fetch('/api/api-keys', {
        method: 'POST',
        headers: getAuthHeadersWithJSON(),
        body: JSON.stringify({
          name: newKeyName,
          rate_limit: newKeyRateLimit
        })
      });

      if (!response.ok) {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to create API key');
        } else {
          throw new Error(`Failed to create API key (${response.status})`);
        }
      }

      const data = await response.json();
      setCreatedKey({ key: data.key, ...data.api_key });
      setNewKeyName('');
      setNewKeyRateLimit(1000);
      setShowCreateModal(false);
      loadApiKeys();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleRevokeKey = async (keyId) => {
    if (!confirm('Are you sure you want to revoke this API key?')) return;

    try {
      setError(null);
      const response = await fetch(`/api/api-keys/${keyId}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });

      if (!response.ok) {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to revoke API key');
        } else {
          throw new Error(`Failed to revoke API key (${response.status})`);
        }
      }

      loadApiKeys();
    } catch (err) {
      setError(err.message);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
  };

  if (loading) {
    return <div className="text-center py-8">{t('apiKeys.loading')}</div>;
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{t('apiKeys.title')}</h1>
          <p className="text-gray-600 dark:text-gray-300 mt-2">{t('apiKeys.subtitle')}</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 font-medium"
        >
          {t('apiKeys.createButton')}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200 px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      )}

      {createdKey && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-6 mb-6">
          <h3 className="font-bold text-green-900 dark:text-green-100 mb-2">{t('apiKeys.createdTitle')}</h3>
          <p className="text-sm text-green-800 dark:text-green-200 mb-3">
            {t('apiKeys.createdHint')}
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 bg-white dark:bg-gray-800 px-4 py-2 rounded border border-green-300 dark:border-green-700 text-sm font-mono text-gray-900 dark:text-gray-100">
              {createdKey.key}
            </code>
            <button
              onClick={() => copyToClipboard(createdKey.key)}
              className="px-4 py-2 bg-green-600 dark:bg-green-700 text-white rounded hover:bg-green-700 dark:hover:bg-green-600"
            >
              {t('apiKeys.copyButton')}
            </button>
          </div>
          <button
            onClick={() => setCreatedKey(null)}
            className="mt-3 text-sm text-green-700 dark:text-green-300 hover:underline"
          >
            {t('apiKeys.dismissButton')}
          </button>
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700">
        {apiKeys.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 dark:text-gray-400">{t('apiKeys.empty')}</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('apiKeys.colName')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('apiKeys.colCreated')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('apiKeys.colLastUsed')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('apiKeys.colUsageToday')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('apiKeys.colRateLimit')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('apiKeys.colStatus')}</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">{t('apiKeys.colActions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {apiKeys.map((key) => (
                <tr key={key.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-gray-100">{key.name}</td>
                  <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                    {new Date(key.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                    {key.last_used_at ? new Date(key.last_used_at).toLocaleDateString() : t('apiKeys.never')}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                    {key.requests_today || 0} / {key.rate_limit}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                    {key.rate_limit.toLocaleString()}/day
                  </td>
                  <td className="px-6 py-4">
                    {key.active ? (
                      <span className="px-2 py-1 text-xs rounded-full bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300">
                        {t('apiKeys.statusActive')}
                      </span>
                    ) : (
                      <span className="px-2 py-1 text-xs rounded-full bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300">
                        {t('apiKeys.statusRevoked')}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    {key.active && (
                      <button
                        onClick={() => handleRevokeKey(key.id)}
                        className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 text-sm font-medium"
                      >
                        {t('apiKeys.revokeButton')}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Create API Key Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6">
            <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">{t('apiKeys.modalTitle')}</h2>
            <form onSubmit={handleCreateKey}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('apiKeys.keyNameLabel')}
                </label>
                <input
                  type="text"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  placeholder={t('apiKeys.keyNamePlaceholder')}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-amber-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
                  required
                />
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('apiKeys.rateLimitLabel')}
                </label>
                <select
                  value={newKeyRateLimit}
                  onChange={(e) => setNewKeyRateLimit(parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-amber-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                >
                  <option value={100}>{t('apiKeys.rate100')}</option>
                  <option value={1000}>{t('apiKeys.rate1000')}</option>
                  <option value={10000}>{t('apiKeys.rate10000')}</option>
                  <option value={100000}>{t('apiKeys.rate100000')}</option>
                </select>
              </div>

              <div className="flex gap-3">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-amber-500 dark:bg-amber-600 text-white rounded-lg hover:bg-amber-600 dark:hover:bg-amber-500 font-medium"
                >
                  {t('apiKeys.createKeyButton')}
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 font-medium"
                >
                  {t('apiKeys.cancelButton')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* API Documentation Link */}
      <div className="mt-8 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
        <h3 className="font-bold text-blue-900 dark:text-blue-100 mb-2">{t('apiKeys.docsTitle')}</h3>
        <p className="text-sm text-blue-800 dark:text-blue-200 mb-3">
          {t('apiKeys.docsSubtitle')}
        </p>
        <a
          href="/docs/api"
          className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
        >
          {t('apiKeys.docsLink')}
        </a>
      </div>
    </div>
  );
}
