import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';

export default function BrandingCustomizer() {
  const { teamId } = useParams();
  const [branding, setBranding] = useState({
    primary_color: '#f59e0b',
    secondary_color: '#1f2937',
    logo_url: null,
    custom_favicon: null,
    white_label: false,
    custom_footer: null
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    loadBranding();
  }, [teamId]);

  const loadBranding = async () => {
    try {
      const response = await fetch(`/api/branding/${teamId}`, {
        headers: { 'X-Session-Token': sessionStorage.getItem('sessionToken') }
      });
      const data = await response.json();
      setBranding(data.branding);
    } catch (err) {
      console.error('Failed to load branding:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);

    try {
      const response = await fetch(`/api/branding/${teamId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-Session-Token': sessionStorage.getItem('sessionToken')
        },
        body: JSON.stringify(branding)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save branding');
      }

      setMessage({ type: 'success', text: 'Branding saved successfully!' });
      loadBranding();
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveLogo = async () => {
    try {
      await fetch(`/api/branding/${teamId}/logo`, {
        method: 'DELETE',
        headers: { 'X-Session-Token': sessionStorage.getItem('sessionToken') }
      });
      setBranding({ ...branding, logo_url: null });
      setMessage({ type: 'success', text: 'Logo removed' });
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to remove logo' });
    }
  };

  if (loading) {
    return <div className="text-center py-12">Loading branding settings...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Brand Customization</h1>
        <p className="text-gray-600 mt-2">
          Customize the look and feel of NoteBurner for your team
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

      <div className="grid md:grid-cols-2 gap-8">
        {/* Settings Panel */}
        <div className="space-y-6">
          {/* Colors */}
          <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
            <h2 className="text-xl font-bold mb-4">Colors</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Primary Color
                </label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={branding.primary_color}
                    onChange={(e) => setBranding({ ...branding, primary_color: e.target.value })}
                    className="h-10 w-20 rounded border border-gray-300 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={branding.primary_color}
                    onChange={(e) => setBranding({ ...branding, primary_color: e.target.value })}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg font-mono text-sm"
                    placeholder="#f59e0b"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Secondary Color
                </label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={branding.secondary_color}
                    onChange={(e) => setBranding({ ...branding, secondary_color: e.target.value })}
                    className="h-10 w-20 rounded border border-gray-300 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={branding.secondary_color}
                    onChange={(e) => setBranding({ ...branding, secondary_color: e.target.value })}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg font-mono text-sm"
                    placeholder="#1f2937"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Logo */}
          <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
            <h2 className="text-xl font-bold mb-4">Logo</h2>
            
            {branding.logo_url ? (
              <div>
                <img
                  src={branding.logo_url}
                  alt="Team logo"
                  className="max-h-16 mb-3"
                />
                <button
                  onClick={handleRemoveLogo}
                  className="text-red-600 hover:text-red-800 text-sm"
                >
                  Remove Logo
                </button>
              </div>
            ) : (
              <div>
                <input
                  type="url"
                  value={branding.logo_url || ''}
                  onChange={(e) => setBranding({ ...branding, logo_url: e.target.value })}
                  placeholder="https://example.com/logo.png"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-2"
                />
                <p className="text-xs text-gray-500">
                  Enter a URL to your logo image (PNG, SVG, or JPG)
                </p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
            <h2 className="text-xl font-bold mb-4">Custom Footer</h2>
            <textarea
              value={branding.custom_footer || ''}
              onChange={(e) => setBranding({ ...branding, custom_footer: e.target.value })}
              placeholder="© 2026 Your Company. All rights reserved."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg h-24 text-sm"
            />
          </div>

          {/* White Label */}
          <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-xl font-bold mb-2">White Label</h2>
                <p className="text-sm text-gray-600 mb-3">
                  Remove all NoteBurner branding (Enterprise only)
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={branding.white_label}
                  onChange={(e) => setBranding({ ...branding, white_label: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:ring-2 peer-focus:ring-amber-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
              </label>
            </div>
          </div>

          {/* Save Button */}
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full px-6 py-3 bg-amber-500 text-white rounded-lg hover:bg-amber-600 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>

        {/* Preview Panel */}
        <div className="sticky top-6">
          <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
            <h2 className="text-xl font-bold mb-4">Preview</h2>
            
            <div
              className="border-2 border-dashed border-gray-300 rounded-lg p-6"
              style={{
                '--color-primary': branding.primary_color,
                '--color-secondary': branding.secondary_color
              }}
            >
              {/* Header Preview */}
              <div className="mb-6 pb-4 border-b border-gray-200">
                {branding.logo_url ? (
                  <img src={branding.logo_url} alt="Logo" className="h-8 mb-2" />
                ) : !branding.white_label ? (
                  <div className="text-xl font-bold mb-2">🔥 NoteBurner</div>
                ) : (
                  <div className="text-xl font-bold mb-2">Your Brand</div>
                )}
                <div className="h-1 rounded" style={{ backgroundColor: branding.primary_color, width: '60px' }}></div>
              </div>

              {/* Content Preview */}
              <div className="space-y-3">
                <button
                  className="w-full py-2 px-4 rounded-lg text-white font-medium"
                  style={{ backgroundColor: branding.primary_color }}
                >
                  Primary Button
                </button>
                
                <button
                  className="w-full py-2 px-4 rounded-lg text-white font-medium"
                  style={{ backgroundColor: branding.secondary_color }}
                >
                  Secondary Button
                </button>

                <div className="p-3 rounded-lg" style={{ backgroundColor: branding.primary_color + '20' }}>
                  <div style={{ color: branding.primary_color }} className="font-medium">
                    Accent Text
                  </div>
                </div>
              </div>

              {/* Footer Preview */}
              <div className="mt-6 pt-4 border-t border-gray-200 text-xs text-gray-600 text-center">
                {branding.custom_footer || (
                  branding.white_label ? '' : '© 2026 NoteBurner. All rights reserved.'
                )}
              </div>
            </div>

            <div className="mt-4 p-3 bg-blue-50 rounded-lg text-sm text-blue-800">
              💡 Changes will apply to all team message pages
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
