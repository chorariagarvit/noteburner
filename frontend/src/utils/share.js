import { Share2 } from 'lucide-react';

/**
 * Native share utilities for mobile devices
 * 
 * Features:
 * - Web Share API integration
 * - Fallback for unsupported browsers
 * - Share to WhatsApp, Telegram, Signal, etc.
 * - Copy to clipboard fallback
 */

/**
 * Check if Web Share API is supported
 */
export const canShare = () => {
  return typeof navigator !== 'undefined' && !!navigator.share;
};

/**
 * Share using native Web Share API
 */
export const shareNative = async (data) => {
  if (!canShare()) {
    throw new Error('Web Share API not supported');
  }

  try {
    await navigator.share({
      title: data.title || 'NoteBurner - Secure Message',
      text: data.text || 'I sent you a secure self-destructing message',
      url: data.url || window.location.href
    });
    return true;
  } catch (error) {
    if (error.name === 'AbortError') {
      // User cancelled
      return false;
    }
    throw error;
  }
};

/**
 * Share file using Web Share API
 */
export const shareFile = async (file, data = {}) => {
  if (!canShare() || !navigator.canShare) {
    throw new Error('File sharing not supported');
  }

  const shareData = {
    title: data.title || 'NoteBurner - Secure Message',
    text: data.text,
    files: [file]
  };

  if (navigator.canShare(shareData)) {
    try {
      await navigator.share(shareData);
      return true;
    } catch (error) {
      if (error.name === 'AbortError') {
        return false;
      }
      throw error;
    }
  }
  
  throw new Error('This file type cannot be shared');
};

/**
 * Share to specific apps (fallback when Web Share API not available)
 */
export const shareToApp = (app, data) => {
  const { url, text, title } = data;
  const encodedUrl = encodeURIComponent(url || window.location.href);
  const encodedText = encodeURIComponent(text || title || '');

  const urls = {
    whatsapp: `https://wa.me/?text=${encodedText}%20${encodedUrl}`,
    telegram: `https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`,
    signal: `https://signal.me/#p/${encodedUrl}`,
    messenger: `fb-messenger://share/?link=${encodedUrl}`,
    twitter: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedText}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
    email: `mailto:?subject=${encodeURIComponent(title || 'NoteBurner Message')}&body=${encodedText}%20${encodedUrl}`,
    sms: `sms:?body=${encodedText}%20${encodedUrl}`
  };

  if (urls[app]) {
    window.open(urls[app], app === 'email' ? '_self' : '_blank');
    return true;
  }
  
  return false;
};

/**
 * Copy to clipboard (universal fallback)
 */
export const copyToClipboard = async (text) => {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (error) {
      console.error('Clipboard write failed:', error);
    }
  }
  
  // Fallback for older browsers
  const textArea = document.createElement('textarea');
  textArea.value = text;
  textArea.style.position = 'fixed';
  textArea.style.left = '-999999px';
  document.body.appendChild(textArea);
  textArea.select();
  
  try {
    document.execCommand('copy');
    document.body.removeChild(textArea);
    return true;
  } catch (error) {
    document.body.removeChild(textArea);
    return false;
  }
};

/**
 * Share Button Component
 */
export const ShareButton = ({ 
  data, 
  onSuccess, 
  onError,
  className = '',
  children 
}) => {
  const handleShare = async () => {
    try {
      if (canShare()) {
        await shareNative(data);
        if (onSuccess) onSuccess('native');
      } else {
        // Show share options modal
        const copied = await copyToClipboard(data.url || window.location.href);
        if (copied && onSuccess) {
          onSuccess('clipboard');
        }
      }
    } catch (error) {
      if (onError) onError(error);
    }
  };

  return (
    <button
      onClick={handleShare}
      className={`inline-flex items-center gap-2 ${className}`}
      aria-label="Share"
    >
      {children || (
        <>
          <Share2 className="w-5 h-5" />
          <span>Share</span>
        </>
      )}
    </button>
  );
};

/**
 * ShareSheet Component - Mobile-optimized share menu
 */
export const ShareSheet = ({ isOpen, onClose, data }) => {
  const apps = [
    { id: 'whatsapp', name: 'WhatsApp', icon: '💬', color: '#25D366' },
    { id: 'telegram', name: 'Telegram', icon: '✈️', color: '#0088cc' },
    { id: 'signal', name: 'Signal', icon: '🔒', color: '#3a76f0' },
    { id: 'messenger', name: 'Messenger', icon: '💬', color: '#0084ff' },
    { id: 'twitter', name: 'Twitter', icon: '🐦', color: '#1DA1F2' },
    { id: 'email', name: 'Email', icon: '📧', color: '#ea4335' },
    { id: 'sms', name: 'SMS', icon: '💬', color: '#34c759' },
    { id: 'copy', name: 'Copy Link', icon: '📋', color: '#6b7280' }
  ];

  const handleAppShare = async (app) => {
    if (app.id === 'copy') {
      const success = await copyToClipboard(data.url || window.location.href);
      if (success) {
        alert('Link copied to clipboard!');
        onClose();
      }
    } else {
      shareToApp(app.id, data);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center md:justify-center">
      <div 
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />
      
      <div className="relative w-full md:max-w-md bg-slate-800 md:rounded-2xl rounded-t-2xl shadow-2xl p-6">
        <h3 className="text-xl font-bold text-white mb-4">Share Message</h3>
        
        <div className="grid grid-cols-4 gap-4">
          {apps.map((app) => (
            <button
              key={app.id}
              onClick={() => handleAppShare(app)}
              className="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-slate-700 transition-colors"
            >
              <div 
                className="w-12 h-12 rounded-full flex items-center justify-center text-2xl"
                style={{ backgroundColor: app.color }}
              >
                {app.icon}
              </div>
              <span className="text-xs text-slate-300 text-center">{app.name}</span>
            </button>
          ))}
        </div>
        
        <button
          onClick={onClose}
          className="w-full mt-6 py-3 bg-slate-700 text-white rounded-lg font-semibold hover:bg-slate-600 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
};

export default {
  canShare,
  shareNative,
  shareFile,
  shareToApp,
  copyToClipboard,
  ShareButton,
  ShareSheet
};
