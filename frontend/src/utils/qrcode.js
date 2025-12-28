import QRCode from 'qrcode';

/**
 * Generate QR code as data URL
 * @param {string} url - URL to encode in QR code
 * @param {Object} options - QR code options
 * @returns {Promise<string>} Data URL of QR code image
 */
export async function generateQRCode(url, options = {}) {
  const defaultOptions = {
    width: 512,
    margin: 2,
    color: {
      dark: '#000000',
      light: '#FFFFFF'
    },
    errorCorrectionLevel: 'M',
    ...options
  };

  try {
    const dataUrl = await QRCode.toDataURL(url, defaultOptions);
    return dataUrl;
  } catch (error) {
    console.error('Error generating QR code:', error);
    throw error;
  }
}

/**
 * Download QR code as PNG file
 * @param {string} dataUrl - Data URL of QR code
 * @param {string} filename - Filename for download
 */
export function downloadQRCode(dataUrl, filename = 'noteburner-qr.png') {
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Generate QR code with custom styling for NoteBurner
 * @param {string} url - URL to encode
 * @returns {Promise<string>} Data URL with custom styling
 */
export async function generateBrandedQRCode(url) {
  return generateQRCode(url, {
    width: 600,
    margin: 3,
    color: {
      dark: '#dc2626', // NoteBurner red/flame color
      light: '#FFFFFF'
    },
    errorCorrectionLevel: 'H' // Higher error correction for branding
  });
}
