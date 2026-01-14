import { useState } from 'react';
import { Users, Mail, Copy, Check, Share2, Send, Twitter, Linkedin, MessageCircle, Facebook } from 'lucide-react';

export default function InviteFriendsPage() {
  const [emails, setEmails] = useState('');
  const [personalMessage, setPersonalMessage] = useState('');
  const [copied, setCopied] = useState(false);
  const [sent, setSent] = useState(false);

  const inviteUrl = 'https://noteburner.work';
  const defaultInviteMessage = `Hey! 👋

I've been using NoteBurner to send secure, self-destructing messages and thought you might find it useful too!

🔥 What makes NoteBurner special:
• Messages self-destruct after reading
• End-to-end encryption with AES-256
• No account required
• Password-protected messages
• File attachments supported
• Completely free and open source

Try it out: ${inviteUrl}`;

  const handleCopyInvite = async () => {
    const fullMessage = personalMessage 
      ? `${personalMessage}\n\n${defaultInviteMessage}`
      : defaultInviteMessage;
    
    await navigator.clipboard.writeText(fullMessage);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleEmailInvite = () => {
    const subject = encodeURIComponent('Check out NoteBurner - Secure Self-Destructing Messages');
    const fullMessage = personalMessage 
      ? `${personalMessage}\n\n${defaultInviteMessage}`
      : defaultInviteMessage;
    const body = encodeURIComponent(fullMessage);
    
    const mailto = emails.trim()
      ? `mailto:${emails}?subject=${subject}&body=${body}`
      : `mailto:?subject=${subject}&body=${body}`;
    
    window.open(mailto, '_blank');
    setSent(true);
    setTimeout(() => setSent(false), 2000);
  };

  const handleShareInvite = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Check out NoteBurner',
          text: personalMessage || 'Send secure, self-destructing messages',
          url: inviteUrl
        });
      } catch (error) {
        if (error.name !== 'AbortError') {
          handleCopyInvite();
        }
      }
    } else {
      handleCopyInvite();
    }
  };

  return (
    <div className="min-h-[calc(100vh-8rem)] bg-gray-50 dark:bg-gray-900 py-12">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <Users className="w-16 h-16 text-primary-600 dark:text-primary-400 mx-auto mb-4" />
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
            Invite Friends
          </h1>
          <p className="text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Share NoteBurner with friends and help them keep their messages secure and private!
          </p>
        </div>

        {/* Main Card */}
        <div className="card space-y-6">
          {/* Personal Message */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Add a Personal Message (Optional)
            </label>
            <textarea
              value={personalMessage}
              onChange={(e) => setPersonalMessage(e.target.value)}
              placeholder="Add your own message here..."
              rows="3"
              className="input-field resize-none"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              This will be added before the default invitation message
            </p>
          </div>

          {/* Email Addresses */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <Mail className="w-4 h-4 inline mr-1" />
              Email Addresses (Optional)
            </label>
            <input
              type="text"
              value={emails}
              onChange={(e) => setEmails(e.target.value)}
              placeholder="friend1@example.com, friend2@example.com"
              className="input-field"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Separate multiple emails with commas
            </p>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <button
              onClick={handleEmailInvite}
              className="btn-primary flex items-center justify-center gap-2"
            >
              {sent ? <Check className="w-5 h-5" /> : <Send className="w-5 h-5" />}
              {sent ? 'Email Opened!' : 'Send via Email'}
            </button>

            <button
              onClick={handleShareInvite}
              className="btn-secondary flex items-center justify-center gap-2"
            >
              <Share2 className="w-5 h-5" />
              Share
            </button>

            <button
              onClick={handleCopyInvite}
              className="btn-secondary flex items-center justify-center gap-2"
            >
              {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
              {copied ? 'Copied!' : 'Copy Message'}
            </button>
          </div>

          {/* Preview */}
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Preview
            </h3>
            <div className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
              {personalMessage && (
                <>
                  <div className="text-gray-900 dark:text-white font-medium">
                    {personalMessage}
                  </div>
                  <div className="my-2 border-t border-gray-300 dark:border-gray-600"></div>
                </>
              )}
              {defaultInviteMessage}
            </div>
          </div>
        </div>

        {/* Quick Share Card */}
        <div className="card mt-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            Quick Share Link
          </h2>
          
          <div className="space-y-4">
            <div className="flex gap-2">
              <input
                type="text"
                value={inviteUrl}
                readOnly
                className="input-field font-mono text-sm flex-1"
              />
              <button
                onClick={async () => {
                  await navigator.clipboard.writeText(inviteUrl);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
                className="btn-secondary flex items-center gap-2 whitespace-nowrap"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <a
                href={`https://twitter.com/intent/tweet?text=${encodeURIComponent('🔥 Check out NoteBurner - Send secure, self-destructing messages!\n\n')}&url=${encodeURIComponent(inviteUrl)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary flex items-center justify-center gap-2 py-2"
              >
                <Twitter className="w-4 h-4" />
                Twitter
              </a>
              
              <a
                href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(inviteUrl)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary flex items-center justify-center gap-2 py-2"
              >
                <Linkedin className="w-4 h-4" />
                LinkedIn
              </a>
              
              <a
                href={`https://wa.me/?text=${encodeURIComponent(`🔥 Check out NoteBurner - Secure self-destructing messages: ${inviteUrl}`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary flex items-center justify-center gap-2 py-2"
              >
                <MessageCircle className="w-4 h-4" />
                WhatsApp
              </a>
              
              <a
                href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(inviteUrl)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary flex items-center justify-center gap-2 py-2"
              >
                <Facebook className="w-4 h-4" />
                Facebook
              </a>
            </div>
          </div>
        </div>

        {/* Why Invite Section */}
        <div className="card mt-6 bg-gradient-to-br from-primary-50 to-blue-50 dark:from-gray-800 dark:to-gray-700 border-2 border-primary-200 dark:border-primary-700">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            Why Invite Friends?
          </h2>
          
          <div className="grid md:grid-cols-2 gap-4">
            <div className="flex gap-3">
              <span className="text-2xl">🔒</span>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                  Help Protect Privacy
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  The more people use encryption, the safer everyone's communications become
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <span className="text-2xl">🌐</span>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                  Spread the Word
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Help friends discover a better way to share sensitive information
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <span className="text-2xl">🎯</span>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                  Simple & Free
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  No accounts, no subscriptions - just secure messaging
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <span className="text-2xl">🚀</span>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                  Open Source
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Transparent, auditable security anyone can trust
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
