
import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Lock } from 'lucide-react';
import { encryptMessage, encryptFile, generatePassword } from '../utils/crypto';
import { createMessage, createGroupMessage, uploadMedia } from '../utils/api';
import { updateStatsOnMessageCreate } from '../utils/achievements';
import { incrementReferralProgress } from '../utils/referrals';
import { useCustomSlug } from '../hooks/useCustomSlug';
import { useFileUpload } from '../hooks/useFileUpload';
import { useSubmitShortcut, useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';

import CreateMessageForm from '../components/create/CreateMessageForm';
import CreateMessageSuccess from '../components/create/CreateMessageSuccess';
import MessageTemplates from '../components/templates/MessageTemplates';
import KeyboardShortcutsModal from '../components/keyboard/KeyboardShortcutsModal';
import SelfDestructOptions from '../components/SelfDestructOptions';

function CreateMessage() {
  const location = useLocation();
  const [message, setMessage] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  const [messageId, setMessageId] = useState('');
  const [creatorToken, setCreatorToken] = useState('');
  const [totpData, setTotpData] = useState(null);
  const [error, setError] = useState('');
  const [locking, setLocking] = useState(false);
  const [mysteryMode, setMysteryMode] = useState(false);
  const [newAchievements, setNewAchievements] = useState([]);
  const [newRewards, setNewRewards] = useState([]);
  const [selfDestructOptions, setSelfDestructOptions] = useState({
    maxViews: 1,
    expiresInMinutes: 1440,
    maxPasswordAttempts: 3,
    requireGeoMatch: false,
    autoBurnOnSuspicious: false,
    require2FA: false
  });

  // Group message state
  const [isGroupMessage, setIsGroupMessage] = useState(false);
  const [recipientCount, setRecipientCount] = useState(2);
  const [burnOnFirstView, setBurnOnFirstView] = useState(false);
  const [groupData, setGroupData] = useState(null);
  const [filesCount, setFilesCount] = useState(0);

  // UI state
  const [showTemplates, setShowTemplates] = useState(false);
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false);

  // Use custom hooks for file upload and slug validation
  const { files, handleFileUpload, removeFile, getTotalSize, clearFiles } = useFileUpload();
  const { customSlug, slugStatus, slugError, handleCustomSlugChange, resetSlug } = useCustomSlug();

  // Handler functions (defined before keyboard shortcuts)
  const handleGeneratePassword = () => {
    const newPassword = generatePassword(16);
    setPassword(newPassword);
  };

  const handleReset = () => {
    setMessage('');
    setPassword('');
    clearFiles();
    setShareUrl('');
    setMessageId('');
    setCreatorToken('');
    setTotpData(null);
    setGroupData(null);
    setError('');
    resetSlug();
    setIsGroupMessage(false);
    setRecipientCount(2);
    setBurnOnFirstView(false);
    setSelfDestructOptions({
      maxViews: 1,
      expiresInMinutes: 1440,
      maxPasswordAttempts: 3,
      requireGeoMatch: false,
      autoBurnOnSuspicious: false,
      require2FA: false
    });
  };

  const handleCreateSimilar = () => {
    setMessage('');
    clearFiles();
    setShareUrl('');
    setMessageId('');
    setCreatorToken('');
    setTotpData(null);
    setGroupData(null);
    setError('');
    resetSlug();
    globalThis.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectTemplate = (template) => {
    setMessage(template.message);
    // Templates can set expiration via selfDestructOptions if needed
    setShowTemplates(false);
  };

  // Set document title
  useEffect(() => {
    document.title = 'NoteBurner - Create Message';
  }, []);

  // Check if redirected from HomePage with success data
  useEffect(() => {
    if (location.state?.shareUrl) {
      setShareUrl(location.state.shareUrl);
      setPassword(location.state.password);
      setFilesCount(location.state.filesCount || 0);
      // Update selfDestructOptions if expiresIn was passed from homepage
      if (location.state.expiresIn) {
        setSelfDestructOptions(prev => ({
          ...prev,
          expiresInMinutes: Number.parseInt(location.state.expiresIn)
        }));
      }
      // Clear location state to prevent re-showing on refresh
      globalThis.history.replaceState({}, document.title);
    }
  }, [location.state]);

  // Check for 'text' query parameter (e.g. from extension)
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const textParam = searchParams.get('text');
    if (textParam) {
      setMessage(textParam);
    }
  }, [location.search]);

  // Keyboard shortcuts
  useSubmitShortcut(() => {
    if (!loading && !locking && !shareUrl && !groupData) {
      document.querySelector('form')?.requestSubmit();
    }
  }, !loading && !locking && !shareUrl && !groupData);

  useKeyboardShortcuts({
    '?': () => setShowKeyboardShortcuts(true),
    'ctrl+k': () => document.querySelector('#message')?.focus(),
    'meta+k': () => document.querySelector('#message')?.focus(),
    'ctrl+p': () => document.querySelector('#password')?.focus(),
    'meta+p': () => document.querySelector('#password')?.focus(),
    'ctrl+g': handleGeneratePassword,
    'meta+g': handleGeneratePassword,
    'ctrl+u': () => document.querySelector('#custom-url')?.focus(),
    'meta+u': () => document.querySelector('#custom-url')?.focus(),
    'ctrl+n': handleReset,
    'meta+n': handleReset,
    'ctrl+s': handleCreateSimilar,
    'meta+s': handleCreateSimilar
  }, !loading && !locking);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (!message.trim()) {
        throw new Error('Message cannot be empty');
      }

      if (!password) {
        throw new Error('Password is required');
      }

      if (password.length < 8) {
        throw new Error('Password must be at least 8 characters');
      }

      // Encrypt message
      const encrypted = await encryptMessage(message, password);

      // Create message on server
      const expirySeconds = selfDestructOptions.expiresInMinutes ? selfDestructOptions.expiresInMinutes * 60 : null;

      let result;
      if (isGroupMessage) {
        // Create group message with multiple links
        result = await createGroupMessage(
          encrypted.encryptedData,
          encrypted.iv,
          encrypted.salt,
          expirySeconds,
          recipientCount,
          null, // maxViews - can be added later
          burnOnFirstView
        );
        setGroupData(result);
      } else {
        // Create regular single message
        // Convert expiresInMinutes to seconds for the API
        const expiryFromOptions = selfDestructOptions.expiresInMinutes * 60;
        
        result = await createMessage(
          encrypted.encryptedData,
          encrypted.iv,
          encrypted.salt,
          expiryFromOptions, // Use minutes-based expiry from security options
          customSlug || undefined,
          {
            maxViews: selfDestructOptions.maxViews,
            maxPasswordAttempts: selfDestructOptions.maxPasswordAttempts,
            requireGeoMatch: selfDestructOptions.requireGeoMatch ? 1 : 0,
            autoBurnOnSuspicious: selfDestructOptions.autoBurnOnSuspicious ? 1 : 0,
            require2FA: selfDestructOptions.require2FA ? 1 : 0
          }
        );
      }

      // Upload encrypted files if any (only for non-group messages for now)
      if (files.length > 0 && !isGroupMessage) {
        for (const file of files) {
          const encryptedFile = await encryptFile(file, password);
          await uploadMedia(
            encryptedFile.encryptedData,
            file.name,
            file.type,
            encryptedFile.iv,
            encryptedFile.salt,
            result.token
          );
        }
      }

      // Show locking animation
      setLoading(false);
      setLocking(true);

      // Wait for lock animation to complete
      await new Promise(resolve => setTimeout(resolve, 1500));

      setLocking(false);

      if (!isGroupMessage) {
        setShareUrl(result.url);
        setMessageId(result.token);
        setCreatorToken(result.creatorToken || result.token); // Use creatorToken from API
        setTotpData(result.totp || null); // Save TOTP data if 2FA is enabled
        setFilesCount(files.length);
      }

      // Track achievements
      const fileSize = getTotalSize();
      const achievements = updateStatsOnMessageCreate({
        fileSize,
        expiration: expirySeconds * 1000,
        mysteryMode
      });

      if (achievements.length > 0) {
        setNewAchievements(achievements);
      }

      // Track referral progress (privacy-first, client-side only)
      const referralUpdate = incrementReferralProgress();
      if (referralUpdate.newRewards.length > 0) {
        setNewRewards(referralUpdate.newRewards);
      }
    } catch (err) {
      setError(err.message);
      setLoading(false);
      setLocking(false);
    }
  };

  if (locking) {
    return (
      <div className="min-h-[calc(100vh-8rem)] bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-900 py-12 flex items-center justify-center">
        <div className="text-center">
          <div className="relative inline-block mb-6">
            <div className="absolute inset-0 bg-blue-400 dark:bg-blue-500 rounded-full animate-ping opacity-75"></div>
            <div className="relative bg-white dark:bg-gray-800 rounded-full p-8 shadow-2xl">
              <Lock className="w-16 h-16 text-blue-600 dark:text-blue-400 animate-pulse" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2 animate-pulse">Securing Message...</h2>
          <p className="text-gray-600 dark:text-gray-300">Encrypting with AES-256</p>
        </div>
      </div>
    );
  }

  if (shareUrl || groupData) {
    return (
      <CreateMessageSuccess
        shareUrl={shareUrl}
        groupData={groupData}
        password={password}
        filesCount={filesCount}
        messageId={messageId}
        creatorToken={creatorToken}
        totpData={totpData}
        onReset={handleReset}
        onCreateSimilar={handleCreateSimilar}
        newAchievements={newAchievements}
        setNewAchievements={setNewAchievements}
        newRewards={newRewards}
        setNewRewards={setNewRewards}
      />
    );
  }

  return (
    <div className="min-h-[calc(100vh-8rem)] bg-gray-50 dark:bg-gray-900 py-12">
      <div className="max-w-3xl mx-auto px-4">
        <CreateMessageForm
          handleSubmit={handleSubmit}
          loading={loading}
          message={message}
          setMessage={setMessage}
          password={password}
          setPassword={setPassword}
          showPassword={showPassword}
          setShowPassword={setShowPassword}
          handleGeneratePassword={handleGeneratePassword}
          customSlug={customSlug}
          handleCustomSlugChange={handleCustomSlugChange}
          slugStatus={slugStatus}
          slugError={slugError}
          mysteryMode={mysteryMode}
          setMysteryMode={setMysteryMode}
          isGroupMessage={isGroupMessage}
          setIsGroupMessage={setIsGroupMessage}
          recipientCount={recipientCount}
          setRecipientCount={setRecipientCount}
          burnOnFirstView={burnOnFirstView}
          setBurnOnFirstView={setBurnOnFirstView}
          files={files}
          handleFileUpload={handleFileUpload}
          removeFile={removeFile}
          error={error}
          showTemplates={showTemplates}
          setShowTemplates={setShowTemplates}
          onSelectTemplate={handleSelectTemplate}
          selfDestructOptions={selfDestructOptions}
          setSelfDestructOptions={setSelfDestructOptions}
        />
      </div>

      {/* Message Templates Modal */}
      {showTemplates && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden animate-slide-up">
            <div className="p-6 overflow-y-auto max-h-[90vh]">
              <MessageTemplates 
                onSelectTemplate={handleSelectTemplate}
                onClose={() => setShowTemplates(false)}
              />
            </div>
          </div>
        </div>
      )}

      {/* Keyboard Shortcuts Modal */}
      <KeyboardShortcutsModal
        isOpen={showKeyboardShortcuts}
        onClose={() => setShowKeyboardShortcuts(false)}
      />
    </div>
  );
}

export default CreateMessage;
