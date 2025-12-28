import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { Download } from 'lucide-react';
import { generateQRCode, downloadQRCode } from '../utils/qrcode';

export function QRCodeDisplay({ url, showDownload = true, size = 256 }) {
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function generateCode() {
      try {
        setLoading(true);
        const dataUrl = await generateQRCode(url, { width: size });
        setQrCodeUrl(dataUrl);
        setError(null);
      } catch (err) {
        console.error('Failed to generate QR code:', err);
        setError('Failed to generate QR code');
      } finally {
        setLoading(false);
      }
    }

    if (url) {
      generateCode();
    }
  }, [url, size]);

  const handleDownload = () => {
    if (qrCodeUrl) {
      downloadQRCode(qrCodeUrl, 'noteburner-secret-message.png');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-red-600 dark:text-red-400 text-sm text-center p-4">
        {error}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="bg-white p-4 rounded-lg shadow-lg">
        <img 
          src={qrCodeUrl} 
          alt="QR Code for secret message" 
          className="w-full h-auto"
          style={{ maxWidth: `${size}px` }}
        />
      </div>
      
      {showDownload && (
        <button
          onClick={handleDownload}
          className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
        >
          <Download className="h-4 w-4" />
          Download QR Code
        </button>
      )}

      <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
        Scan this QR code to access the secret message
      </p>
    </div>
  );
}

QRCodeDisplay.propTypes = {
  url: PropTypes.string.isRequired,
  showDownload: PropTypes.bool,
  size: PropTypes.number
};
