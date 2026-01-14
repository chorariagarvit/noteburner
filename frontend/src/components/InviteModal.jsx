import { useState } from 'react';
import { Copy, Check, Mail, Share2, Twitter, Linkedin, MessageCircle } from 'lucide-react';
import PropTypes from 'prop-types';

export default function InviteModal({ isOpen, onClose, shareUrl, messagePreview }) {
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
                <h2 className="text-2xl font-bold">Share Your Message</h2>
                <p className="text-sm opacity-90">Invite others to view your secure message</p>
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
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Message Preview</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap break-words">
              {inviteMessage}
            </p>
          </div>

          {/* Quick Actions */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Quick Share</h3>
            
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={handleEmail}
                className="btn-secondary flex items-center justify-center gap-2 py-3"
              >
                {emailSent ? <Check className="w-5 h-5" /> : <Mail className="w-5 h-5" />}
                {emailSent ? 'Opened!' : 'Email'}
              </button>

              <button
                onClick={handleSMS}
                className="btn-secondary flex items-center justify-center gap-2 py-3"
              >
                <MessageCircle className="w-5 h-5" />
                SMS
              </button>

              <button
                onClick={handleWhatsApp}
                className="btn-secondary flex items-center justify-center gap-2 py-3"
              >
                💬
                WhatsApp
              </button>

              <button
                onClick={handleWebShare}
                className="btn-secondary flex items-center justify-center gap-2 py-3"
              >
                <Share2 className="w-5 h-5" />
                Share
              </button>
            </div>
          </div>

          {/* Social Media */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Share on Social Media</h3>
            
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={handleTwitter}
                className="flex items-center justify-center gap-2 py-3 px-4 bg-[#1DA1F2] hover:bg-[#1a8cd8] text-white rounded-lg font-medium transition-colors"
              >
                <Twitter className="w-5 h-5" />
                Twitter
              </button>

              <button
                onClick={handleLinkedIn}
                className="flex items-center justify-center gap-2 py-3 px-4 bg-[#0A66C2] hover:bg-[#004182] text-white rounded-lg font-medium transition-colors"
              >
                <Linkedin className="w-5 h-5" />
                LinkedIn
              </button>
            </div>
          </div>

          {/* Copy Message */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Copy to Clipboard</h3>
            
            <button
              onClick={handleCopy}
              className="btn-primary w-full flex items-center justify-center gap-2 py-3"
            >
              {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
              {copied ? 'Copied!' : 'Copy Full Message'}
            </button>
          </div>

          {/* Tips */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-400 mb-2">💡 Sharing Tips</h3>
            <ul className="text-sm text-blue-800 dark:text-blue-300 space-y-1">
              <li>• The recipient will need the password you set to view the message</li>
              <li>• Share the password through a different channel for security</li>
              <li>• The message will self-destruct after being viewed</li>
              <li>• Link expires based on the time you selected</li>
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
