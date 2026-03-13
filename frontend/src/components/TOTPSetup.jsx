import { useState } from 'react';
import { Shield, Copy, CheckCircle, QrCode } from 'lucide-react';
import { useI18n } from '../contexts/I18nContext';

export default function TOTPSetup({ totpData }) {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(totpData.secret);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <div className="mt-6 p-6 bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-300 rounded-xl">
      <div className="flex items-center gap-3 mb-4">
        <Shield className="w-6 h-6 text-amber-600" />
        <h3 className="text-lg font-semibold text-gray-900">
          {t('totpSetup.title')}
        </h3>
      </div>

      <p className="text-sm text-gray-700 mb-4">
        {t('totpSetup.description')}
      </p>

      <div className="bg-white rounded-lg p-4 mb-4">
        <div className="flex flex-col items-center">
          <div className="mb-3 flex items-center gap-2 text-gray-700">
            <QrCode className="w-5 h-5" />
            <span className="font-medium">{t('totpSetup.scanTitle')}</span>
          </div>
          
          <div className="bg-white p-4 rounded-lg border-2 border-gray-200 mb-3">
            <img 
              src={totpData.qrCodeUrl} 
              alt="TOTP QR Code"
              className="w-64 h-64"
            />
          </div>
          
          <p className="text-xs text-gray-600 text-center">
            {t('totpSetup.scanSupports')}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-lg p-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {t('totpSetup.secretLabel')}
        </label>
        <p className="text-xs text-gray-600 mb-2">
          {t('totpSetup.secretHint')}
        </p>
        <div className="flex items-center gap-2">
          <code className="flex-1 px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg font-mono text-sm text-gray-800 break-all">
            {totpData.secret}
          </code>
          <button
            onClick={handleCopy}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap"
          >
            {copied ? (
              <>
                <CheckCircle className="w-4 h-4" />
                <span className="text-sm">{t('totpSetup.copiedBtn')}</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                <span className="text-sm">{t('totpSetup.copyBtn')}</span>
              </>
            )}
          </button>
        </div>
      </div>

      <div className="mt-4 p-3 bg-amber-100 border border-amber-300 rounded-lg">
        <p className="text-xs text-amber-900">
          {t('totpSetup.importantNote')}
        </p>
      </div>
    </div>
  );
}
