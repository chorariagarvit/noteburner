import { useState } from 'react';
import { Shield, Copy, CheckCircle, QrCode } from 'lucide-react';

export default function TOTPSetup({ totpData }) {
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
          Two-Factor Authentication Enabled
        </h3>
      </div>

      <p className="text-sm text-gray-700 mb-4">
        This message is protected with TOTP (Time-based One-Time Password). 
        The recipient must scan this QR code with an authenticator app to access the message.
      </p>

      <div className="bg-white rounded-lg p-4 mb-4">
        <div className="flex flex-col items-center">
          <div className="mb-3 flex items-center gap-2 text-gray-700">
            <QrCode className="w-5 h-5" />
            <span className="font-medium">Scan with Authenticator App</span>
          </div>
          
          <div className="bg-white p-4 rounded-lg border-2 border-gray-200 mb-3">
            <img 
              src={totpData.qrCodeUrl} 
              alt="TOTP QR Code"
              className="w-64 h-64"
            />
          </div>
          
          <p className="text-xs text-gray-600 text-center">
            Supports: Google Authenticator, Authy, Microsoft Authenticator, etc.
          </p>
        </div>
      </div>

      <div className="bg-white rounded-lg p-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Manual Entry Secret Key
        </label>
        <p className="text-xs text-gray-600 mb-2">
          If you can't scan the QR code, enter this secret manually in your authenticator app:
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
                <span className="text-sm">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                <span className="text-sm">Copy</span>
              </>
            )}
          </button>
        </div>
      </div>

      <div className="mt-4 p-3 bg-amber-100 border border-amber-300 rounded-lg">
        <p className="text-xs text-amber-900">
          <strong>⚠️ Important:</strong> Share this QR code or secret key with the message recipient 
          through a secure channel. They will need it to access the message.
        </p>
      </div>
    </div>
  );
}
