import { useState } from 'react';
import { Copy, Check, Mail, Share2, X as XIcon, MessageCircle } from 'lucide-react';
import PropTypes from 'prop-types';
import { useI18n } from '../contexts/I18nContext';

export default function InviteModal({ isOpen, onClose, shareUrl, messagePreview }) {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  if (!isOpen) return null;

  const defaultMessage = messagePreview || "I just sent you a secure, self-destructing message";
  const inviteMessage = `🔥 Check out NoteBurner - Send self-destructing encrypted messages!\n\n${defaultMessage}\n\nOpen it here: ${shareUrl}\n\n⚠️ This message will self-destruct after viewing. NoteBurner keeps your conversations private with end-to-end encryption.`;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(inviteMessage);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleEmail = () => {
    const subject = encodeURIComponent('🔥 Secure Message from NoteBurner');
    const body = encodeURIComponent(inviteMessage);
    window.open(`mailto:?subject=${subject}&body=${body}`, '_blank');
    setEmailSent(true);
    setTimeout(() => setEmailSent(false), 2000);
  };

  const handleSMS = () => {
    const body = encodeURIComponent(inviteMessage);
    window.open(`sms:?body=${body}`, '_blank');
  };

  const handleTwitter = () => {
    const text = encodeURIComponent(`🔥 Just sent a self-destructing message with @NoteBurner\n\nSecure • Private • Burns after reading\n\nTry it: noteburner.work`);
    window.open(`https://twitter.com/intent/tweet?text=${text}`, '_blank', 'width=550,height=420');
  };

  const handleLinkedIn = () => {
    const url = encodeURIComponent('https://noteburner.work');
    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${url}`, '_blank', 'width=550,height=420');
  };

  const handleWhatsApp = () => {
    const text = encodeURIComponent(inviteMessage);
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  const handleWebShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: '🔥 Secure Message from NoteBurner',
          text: defaultMessage,
          url: shareUrl
        });
      } catch (error) {
        if (error.name !== 'AbortError') {
          console.error('Share failed:', error);
          handleCopy();
        }
      }
    } else {
      handleCopy();
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div 
        className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-primary-600 to-blue-600 text-white p-6 rounded-t-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Share2 className="w-8 h-8" />
              <div>
                <h2 className="text-2xl font-bold">{t('inviteModal.title')}</h2>
                <p className="text-sm opacity-90">{t('inviteModal.subtitle')}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:bg-white hover:bg-opacity-20 rounded-full p-2 transition-colors"
              aria-label="Close"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Message Preview */}
          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">{t('inviteModal.previewTitle')}</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap break-words">
              {inviteMessage}
            </p>
          </div>

          {/* Quick Actions */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">{t('inviteModal.quickShareTitle')}</h3>
            
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={handleEmail}
                className="btn-secondary flex items-center justify-center gap-2 py-3"
              >
                {emailSent ? <Check className="w-5 h-5" /> : <Mail className="w-5 h-5" />}
                {emailSent ? t('inviteModal.emailOpened') : t('inviteModal.email')}
              </button>

              <button
                onClick={handleSMS}
                className="btn-secondary flex items-center justify-center gap-2 py-3"
              >
                <MessageCircle className="w-5 h-5" />
                {t('inviteModal.sms')}
              </button>

              <button
                onClick={handleWhatsApp}
                className="btn-secondary flex items-center justify-center gap-2 py-3"
              >
                💬
                {t('inviteModal.whatsapp')}
              </button>

              <button
                onClick={handleWebShare}
                className="btn-secondary flex items-center justify-center gap-2 py-3"
              >
                <Share2 className="w-5 h-5" />
                {t('inviteModal.share')}
              </button>
            </div>
          </div>

          {/* Social Media */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">{t('inviteModal.socialTitle')}</h3>
            
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={handleTwitter}
                className="flex items-center justify-center gap-2 py-3 px-4 bg-[#1DA1F2] hover:bg-[#1a8cd8] text-white rounded-lg font-medium transition-colors"
              >
                <XIcon className="w-5 h-5" />
                {t('inviteModal.twitter')}
              </button>

              <button
                onClick={handleLinkedIn}
                className="flex items-center justify-center gap-2 py-3 px-4 bg-[#0A66C2] hover:bg-[#004182] text-white rounded-lg font-medium transition-colors"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
                {t('inviteModal.linkedin')}
              </button>
            </div>
          </div>

          {/* Copy Message */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">{t('inviteModal.copyTitle')}</h3>
            
            <button
              onClick={handleCopy}
              className="btn-primary w-full flex items-center justify-center gap-2 py-3"
            >
              {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
              {copied ? t('inviteModal.copied') : t('inviteModal.copyFull')}
            </button>
          </div>

          {/* Tips */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-400 mb-2">{t('inviteModal.tipsTitle')}</h3>
            <ul className="text-sm text-blue-800 dark:text-blue-300 space-y-1">
              <li>• {t('inviteModal.tip1')}</li>
              <li>• {t('inviteModal.tip2')}</li>
              <li>• {t('inviteModal.tip3')}</li>
              <li>• {t('inviteModal.tip4')}</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

InviteModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  shareUrl: PropTypes.string.isRequired,
  messagePreview: PropTypes.string
};
