import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';

export default function ComplianceDashboard() {
  const { teamId } = useParams();
  const [settings, setSettings] = useState(null);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    loadData();
  }, [teamId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const sessionToken = getSessionToken();

      // Load compliance settings
      const settingsRes = await fetch(`/api/compliance/${teamId}/settings`, {
        headers: getAuthHeaders()
      });
      const settingsData = await settingsRes.json();
      setSettings(settingsData.settings);

      // Load compliance report
      const reportRes = await fetch(`/api/compliance/${teamId}/report`, {
        headers: getAuthHeaders()
      });
      const reportData = await reportRes.json();
      setReport(reportData.report);

    } catch (err) {
      console.error('Failed to load compliance data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    setMessage(null);

    try {
      const response = await fetch(`/api/compliance/${teamId}/settings`, {
        method: 'PUT',
        headers: getAuthHeadersWithJSON(),
        body: JSON.stringify(settings)
      });

      if (!response.ok) throw new Error('Failed to save settings');

      setMessage({ type: 'success', text: 'Settings saved successfully!' });
      loadData();
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setSaving(false);
    }
  };

  const handleExport = async (type, format = 'json') => {
    try {
      const sessionToken = getSessionToken();
      const url = `/api/compliance/${teamId}/export/${type}?format=${format}`;
      
      const response = await fetch(url, {
        headers: getAuthHeaders()
      });

      if (format === 'csv') {
        const blob = await response.blob();
        const downloadUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = `${type}-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(downloadUrl);
        a.remove();
      } else {
        const data = await response.json();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const downloadUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = `${type}-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(downloadUrl);
        a.remove();
      }

      setMessage({ type: 'success', text: `${type} exported successfully!` });
    } catch (err) {
      setMessage({ type: 'error', text: `Export failed: ${err.message}` });
    }
  };

  const handleDeleteAllData = async () => {
    try {
      const response = await fetch(`/api/compliance/${teamId}/gdpr/delete-all`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Session-Token': sessionStorage.getItem('sessionToken')
        },
        body: JSON.stringify({ confirmation: 'DELETE_ALL_DATA' })
      });

      if (!response.ok) throw new Error('Failed to delete data');

      alert('All team data has been deleted per GDPR request');
      window.location.href = '/';
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    }
  };

  if (loading) {
    return <div className="text-center py-12">Loading compliance dashboard...</div>;
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Compliance & GDPR</h1>
        <p className="text-gray-600 mt-2">
          Manage data retention, exports, and compliance settings
        </p>
      </div>

      {message && (
        <div className={`mb-6 px-4 py-3 rounded-lg ${
          message.type === 'success' 
            ? 'bg-green-50 border border-green-200 text-green-800'
            : 'bg-red-50 border border-red-200 text-red-800'
        }`}>
          {message.text}
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6 mb-6">
        {/* Compliance Status */}
        <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
          <h2 className="text-xl font-bold mb-4">📋 GDPR Compliance Status</h2>
          
          {report?.gdpr_compliance && (
            <div className="space-y-3">
              <div className="flex justify-between items-center pb-2 border-b border-gray-100">
                <span className="text-gray-600">GDPR Enabled</span>
                <span className={`font-medium ${report.gdpr_compliance.enabled ? 'text-green-600' : 'text-gray-400'}`}>
                  {report.gdpr_compliance.enabled ? '✓ Yes' : '✗ No'}
                </span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-gray-100">
                <span className="text-gray-600">Data Retention</span>
                <span className="font-medium">{report.gdpr_compliance.data_retention_days} days</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-gray-100">
                <span className="text-gray-600">Auto-Delete</span>
                <span className={`font-medium ${report.gdpr_compliance.auto_delete_enabled ? 'text-green-600' : 'text-gray-400'}`}>
                  {report.gdpr_compliance.auto_delete_enabled ? '✓ Enabled' : '✗ Disabled'}
                </span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-gray-100">
                <span className="text-gray-600">Right to Access</span>
                <span className="text-green-600 font-medium">✓ Supported</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-gray-100">
                <span className="text-gray-600">Right to Deletion</span>
                <span className="text-green-600 font-medium">✓ Supported</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Right to Export</span>
                <span className="text-green-600 font-medium">✓ Supported</span>
              </div>
            </div>
          )}
        </div>

        {/* Statistics */}
        <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
          <h2 className="text-xl font-bold mb-4">📊 Statistics</h2>
          
          {report?.statistics && (
            <div className="space-y-3">
              <div className="flex justify-between items-center pb-2 border-b border-gray-100">
                <span className="text-gray-600">Total Messages</span>
                <span className="font-bold text-lg">{report.statistics.total_messages || 0}</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-gray-100">
                <span className="text-gray-600">Burned Messages</span>
                <span className="font-bold text-lg text-red-600">{report.statistics.burned_messages || 0}</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-gray-100">
                <span className="text-gray-600">Password Protected</span>
                <span className="font-bold text-lg text-green-600">{report.statistics.password_protected || 0}</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-gray-100">
                <span className="text-gray-600">Audit Log Entries</span>
                <span className="font-bold text-lg">{report.statistics.audit_log_entries || 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Team Members</span>
                <span className="font-bold text-lg">{report.statistics.team_members || 0}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Settings */}
      {settings && (
        <div className="bg-white rounded-lg shadow border border-gray-200 p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">⚙️ Compliance Settings</h2>
          
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Data Retention Period (days)
              </label>
              <input
                type="number"
                value={settings.data_retention_days}
                onChange={(e) => setSettings({ ...settings, data_retention_days: parseInt(e.target.value) })}
                min="1"
                max="3650"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
              <p className="text-xs text-gray-500 mt-1">
                Messages will be deleted after this period
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Audit Log Retention (days)
              </label>
              <input
                type="number"
                value={settings.audit_log_retention}
                onChange={(e) => setSettings({ ...settings, audit_log_retention: parseInt(e.target.value) })}
                min="1"
                max="3650"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Minimum Password Strength
              </label>
              <select
                value={settings.min_password_strength}
                onChange={(e) => setSettings({ ...settings, min_password_strength: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                <option value={0}>No requirement</option>
                <option value={1}>Weak (6+ chars)</option>
                <option value={2}>Fair (8+ chars)</option>
                <option value={3}>Good (10+ chars, mixed)</option>
                <option value={4}>Strong (12+ chars, complex)</option>
              </select>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-gray-700">GDPR Compliance</div>
                <div className="text-sm text-gray-500">Enable GDPR features</div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.gdpr_enabled}
                  onChange={(e) => setSettings({ ...settings, gdpr_enabled: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:ring-2 peer-focus:ring-amber-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
              </label>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-gray-700">Auto-Delete</div>
                <div className="text-sm text-gray-500">Automatically delete expired data</div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.auto_delete_enabled}
                  onChange={(e) => setSettings({ ...settings, auto_delete_enabled: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:ring-2 peer-focus:ring-amber-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
              </label>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-gray-700">Require Password</div>
                <div className="text-sm text-gray-500">Force password on all messages</div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.require_password}
                  onChange={(e) => setSettings({ ...settings, require_password: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:ring-2 peer-focus:ring-amber-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
              </label>
            </div>
          </div>

          <button
            onClick={handleSaveSettings}
            disabled={saving}
            className="mt-6 px-6 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 font-medium disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      )}

      {/* Data Export */}
      <div className="bg-white rounded-lg shadow border border-gray-200 p-6 mb-6">
        <h2 className="text-xl font-bold mb-4">📥 Data Export</h2>
        <p className="text-gray-600 mb-4">Export your team's data for compliance or backup purposes</p>
        
        <div className="grid md:grid-cols-2 gap-4">
          <div className="border border-gray-200 rounded-lg p-4">
            <h3 className="font-medium mb-2">Audit Logs</h3>
            <p className="text-sm text-gray-600 mb-3">Export all audit log entries</p>
            <div className="flex gap-2">
              <button
                onClick={() => handleExport('audit-logs', 'json')}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm"
              >
                JSON
              </button>
              <button
                onClick={() => handleExport('audit-logs', 'csv')}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm"
              >
                CSV
              </button>
            </div>
          </div>

          <div className="border border-gray-200 rounded-lg p-4">
            <h3 className="font-medium mb-2">Message Metadata</h3>
            <p className="text-sm text-gray-600 mb-3">Export message metadata (no content)</p>
            <div className="flex gap-2">
              <button
                onClick={() => handleExport('messages', 'json')}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm"
              >
                JSON
              </button>
              <button
                onClick={() => handleExport('messages', 'csv')}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm"
              >
                CSV
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* GDPR Right to be Forgotten */}
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <h2 className="text-xl font-bold text-red-900 mb-2">⚠️ Right to be Forgotten</h2>
        <p className="text-red-800 mb-4">
          Permanently delete all team data including messages, audit logs, and settings. 
          This action cannot be undone.
        </p>
        <button
          onClick={() => setShowDeleteConfirm(true)}
          className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium"
        >
          Delete All Team Data
        </button>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h2 className="text-2xl font-bold text-red-900 mb-4">⚠️ Confirm Deletion</h2>
            <p className="text-gray-700 mb-6">
              This will permanently delete ALL team data including:
            </p>
            <ul className="list-disc list-inside text-sm text-gray-600 mb-6 space-y-1">
              <li>All messages and their content</li>
              <li>All audit logs</li>
              <li>Team members and settings</li>
              <li>Branding configuration</li>
              <li>All associated data</li>
            </ul>
            <p className="text-red-800 font-medium mb-6">
              This action is IRREVERSIBLE.
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleDeleteAllData}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium"
              >
                Yes, Delete Everything
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
