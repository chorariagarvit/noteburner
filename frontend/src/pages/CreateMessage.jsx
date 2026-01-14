import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Flame, Copy, Check, Eye, EyeOff, Upload, X, Clock, Lock, Link2, CheckCircle, XCircle, Loader, Users } from 'lucide-react';
import { encryptMessage, encryptFile, generatePassword } from '../utils/crypto';
import { createMessage, createGroupMessage, uploadMedia } from '../utils/api';
import { QRCodeDisplay } from '../components/QRCodeDisplay';
import { GroupMessageLinks } from '../components/GroupMessageLinks';
import { updateStatsOnMessageCreate } from '../utils/achievements';
import { incrementReferralProgress } from '../utils/referrals';
import AchievementUnlocked from '../components/AchievementUnlocked';
import RewardUnlocked from '../components/RewardUnlocked';
import InviteModal from '../components/InviteModal';
import { useCustomSlug } from '../hooks/useCustomSlug';
import { useFileUpload } from '../hooks/useFileUpload';

function CreateMessage() {
  const location = useLocation();
  const [message, setMessage] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [expiresIn, setExpiresIn] = useState('24'); // Default 24 hours
  const [loading, setLoading] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  const [locking, setLocking] = useState(false);
  const [mysteryMode, setMysteryMode] = useState(false);
  const [newAchievements, setNewAchievements] = useState([]);
  const [newRewards, setNewRewards] = useState([]);
  const [showInviteModal, setShowInviteModal] = useState(false);
  
  // Group message state
  const [isGroupMessage, setIsGroupMessage] = useState(false);
  const [recipientCount, setRecipientCount] = useState(2);
  const [burnOnFirstView, setBurnOnFirstView] = useState(false);
  const [groupData, setGroupData] = useState(null);
  
  // Use custom hooks for file upload and slug validation
  const { files, handleFileUpload, removeFile, getTotalSize, clearFiles } = useFileUpload();
  const { customSlug, slugStatus, slugError, handleCustomSlugChange, resetSlug } = useCustomSlug();

  // Set document title
  useEffect(() => {
    document.title = 'NoteBurner - Create Message';
  }, []);

  // Check if redirected from HomePage with success data
  useEffect(() => {
    if (location.state?.shareUrl) {
      setShareUrl(location.state.shareUrl);
      setPassword(location.state.password);
      setExpiresIn(location.state.expiresIn || '24');
      // Clear location state to prevent re-showing on refresh
      globalThis.history.replaceState({}, document.title);
    }
  }, [location.state]);

  const handleGeneratePassword = () => {
    const newPassword = generatePassword(16);
    setPassword(newPassword);
  };

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
      const expirySeconds = expiresIn ? Number.parseInt(expiresIn) * 3600 : null;
      
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
        result = await createMessage(
          encrypted.encryptedData,
          encrypted.iv,
          encrypted.salt,
          expirySeconds,
          customSlug || undefined
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

  const handleCopy = async () => {
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleReset = () => {
    setMessage('');
    setPassword('');
    clearFiles();
    setShareUrl('');
    setGroupData(null);
    setExpiresIn('24'); // Reset to default 24 hours
    setError('');
    resetSlug();
    setIsGroupMessage(false);
    setRecipientCount(2);
    setBurnOnFirstView(false);
  };

  const handleCreateSimilar = () => {
    // Keep password and expiresIn settings, just clear message and files
    setMessage('');
    clearFiles();
    setShareUrl('');
    setGroupData(null);
    setError('');
    resetSlug();
    // Scroll to top for better UX
    globalThis.scrollTo({ top: 0, behavior: 'smooth' });
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
      <div className="min-h-[calc(100vh-8rem)] bg-gradient-to-br from-green-50 to-emerald-50 dark:from-gray-800 dark:to-gray-900 py-12">
        <div className="max-w-4xl mx-auto px-4">
          <div className="card animate-fade-in">
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400 mb-4">
                {groupData ? <Users className="w-8 h-8" /> : <Check className="w-8 h-8" />}
              </div>
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                {groupData ? 'Group Message Created!' : 'Message Created Successfully!'}
              </h2>
              <p className="text-gray-600 dark:text-gray-300">
                {groupData 
                  ? `${groupData.recipientCount} unique links generated for your recipients`
                  : 'Your encrypted message is ready to share'
                }
              </p>
            </div>

            {groupData ? (
              /* Group Message Links Display */
              <GroupMessageLinks groupData={groupData} />
            ) : (
              /* Regular Single Message Display */
              <div className="space-y-6">
              <div>
                <label htmlFor="share-url" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Share this URL
                </label>
                <div className="flex gap-2">
                  <input
                    id="share-url"
                    type="text"
                    value={shareUrl}
                    readOnly
                    className="input-field font-mono text-sm"
                  />
                  <button
                    onClick={handleCopy}
                    className="btn-secondary flex items-center gap-2 whitespace-nowrap"
                  >
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                </div>
              </div>

              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                <h3 className="font-semibold text-amber-900 dark:text-amber-400 mb-2 flex items-center gap-2">
                  <Flame className="w-5 h-5" />
                  Important Security Notice
                </h3>
                <ul className="text-sm text-amber-800 dark:text-amber-300 space-y-1">
                  <li>• Share the password separately (not in the same channel as the link)</li>
                  <li>• The message will be deleted after the first successful decryption</li>
                  <li>• There are no backups - once it's gone, it's gone forever</li>
                  {location.state?.filesCount > 0 && <li>• {location.state.filesCount} encrypted file(s) attached</li>}
                  {expiresIn && <li>• Message expires in {expiresIn} hour(s)</li>}
                </ul>
              </div>

              <div className="bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Password</h3>
                <div className="font-mono text-lg text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 p-3 rounded border border-gray-300 dark:border-gray-600">
                  {password}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  Make sure the recipient has this password before sharing the link
                </p>
              </div>

              <div className="bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-lg p-6">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-4 text-center">Share via QR Code</h3>
                <QRCodeDisplay url={shareUrl} size={256} />
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={handleReset}
                  className="btn-secondary flex-1 flex items-center justify-center gap-2"
                >
                  <Flame className="w-4 h-4" />
                  Create New Message
                </button>
                <button
                  onClick={handleCreateSimilar}
                  className="btn-primary flex-1 flex items-center justify-center gap-2"
                >
                  <Copy className="w-4 h-4" />
                  Create Similar Message
                </button>
              </div>
              
              <button
                onClick={() => setShowInviteModal(true)}
                className="btn-secondary w-full flex items-center justify-center gap-2 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30"
              >
                <Users className="w-4 h-4" />
                Invite Friends to NoteBurner
              </button>
              
              <p className="text-xs text-center text-gray-500 dark:text-gray-400 mt-2">
                💡 "Similar" keeps your settings but clears the message
              </p>
            </div>
            )}
          </div>
        </div>
        
        {/* Achievement unlock popup */}
        {newAchievements.map((achievement, index) => {
          const handleCloseAchievement = () => {
            setNewAchievements(prev => prev.filter((_, i) => i !== index));
          };

          return (
            <AchievementUnlocked
              key={achievement.id}
              achievement={achievement}
              onClose={handleCloseAchievement}
            />
          );
        })}
        
        {/* Reward unlock popup */}
        {newRewards.map((reward, index) => {
          const handleCloseReward = () => {
            setNewRewards(prev => prev.filter((_, i) => i !== index));
          };

          return (
            <RewardUnlocked
              key={reward.reward}
              reward={reward}
              onClose={handleCloseReward}
            />
          );
        })}
        
        {/* Invite Friends Modal */}
        <InviteModal
          isOpen={showInviteModal}
          onClose={() => setShowInviteModal(false)}
          shareUrl={shareUrl}
          messagePreview="I just created a secure message using NoteBurner"
        />
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-8rem)] bg-gray-50 dark:bg-gray-900 py-12">
      <div className="max-w-3xl mx-auto px-4">
        <div className="card">
          <div className="text-center mb-8">
            <Flame className="w-12 h-12 text-red-600 dark:text-red-500 mx-auto mb-4" />
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Create Encrypted Message
            </h2>
            <p className="text-gray-600 dark:text-gray-300">
              Write your message, set a password, and get a one-time shareable link
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="message" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Message *
              </label>
              <textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Enter your secret message..."
                rows={6}
                className="input-field resize-none"
                required
              />
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {message.length} characters
              </p>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Password * (min 8 characters)
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter a strong password"
                    className="input-field pr-10"
                    required
                    minLength={8}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                <button
                  type="button"
                  onClick={handleGeneratePassword}
                  className="btn-secondary whitespace-nowrap"
                >
                  Generate
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="expiration" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <Clock className="w-4 h-4 inline mr-1" />
                Expiration (optional)
              </label>
              <select
                id="expiration"
                value={expiresIn}
                onChange={(e) => setExpiresIn(e.target.value)}
                className="input-field"
              >
                <option value="">No expiration</option>
                <option value="1">1 hour</option>
                <option value="6">6 hours</option>
                <option value="24">24 hours</option>
                <option value="72">3 days</option>
                <option value="168">7 days</option>
              </select>
            </div>

            {!isGroupMessage && (
              <>
                <div>
                  <label htmlFor="custom-url" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    <Link2 className="w-4 h-4 inline mr-1" />
                    Custom URL (optional)
                  </label>
                  <div className="relative">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-sm text-gray-500 dark:text-gray-400">noteburner.com/</span>
                      <input
                        id="custom-url"
                        type="text"
                        value={customSlug}
                        onChange={handleCustomSlugChange}
                        placeholder="your-custom-url"
                        className="input-field flex-1"
                        maxLength={20}
                        pattern="[a-z0-9-_]{3,20}"
                      />
                      {slugStatus === 'checking' && <Loader className="w-5 h-5 animate-spin text-gray-400" />}
                      {slugStatus === 'available' && <CheckCircle className="w-5 h-5 text-green-500" />}
                      {slugStatus === 'unavailable' && <XCircle className="w-5 h-5 text-red-500" />}
                    </div>
                    {slugError && (
                      <p className="text-sm text-red-600 dark:text-red-400 mb-1">{slugError}</p>
                    )}
                    {!slugError && customSlug && slugStatus === 'available' && (
                      <p className="text-xs text-green-600 dark:text-green-400">✓ Available</p>
                    )}
                    {!customSlug && (
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        3-20 chars: letters, numbers, hyphens, underscores
                      </p>
                    )}
                  </div>
                </div>
              </>
            )}

            <div className="flex items-center gap-2 p-4 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg">
              <input
                id="mystery-mode"
                type="checkbox"
                checked={mysteryMode}
                onChange={(e) => setMysteryMode(e.target.checked)}
                className="w-4 h-4 text-purple-600 bg-gray-100 border-gray-300 rounded focus:ring-purple-500 dark:focus:ring-purple-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
              />
              <label htmlFor="mystery-mode" className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2 cursor-pointer">
                <span className="text-2xl">🎭</span>
                {' '}
                Mystery Message Mode (completely anonymous)
              </label>
            </div>

            {/* Group Message Section */}
            <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
              <div className="flex items-center gap-2 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg mb-4">
                <input
                  id="group-message"
                  type="checkbox"
                  checked={isGroupMessage}
                  onChange={(e) => {
                    setIsGroupMessage(e.target.checked);
                    if (!e.target.checked) {
                      setRecipientCount(2);
                      setBurnOnFirstView(false);
                    }
                  }}
                  className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                />
                <label htmlFor="group-message" className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2 cursor-pointer">
                  <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  Group Message (create multiple unique links)
                </label>
              </div>

              {isGroupMessage && (
                <div className="space-y-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                  <div>
                    <label htmlFor="recipient-count" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Number of Recipients (1-100)
                    </label>
                    <input
                      id="recipient-count"
                      type="number"
                      min="1"
                      max="100"
                      value={recipientCount}
                      onChange={(e) => setRecipientCount(Number.parseInt(e.target.value) || 2)}
                      className="input-field"
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Each recipient will get a unique, one-time-use link
                    </p>
                  </div>

                  <div className="flex items-start gap-3 p-3 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
                    <input
                      id="burn-on-first-view"
                      type="checkbox"
                      checked={burnOnFirstView}
                      onChange={(e) => setBurnOnFirstView(e.target.checked)}
                      className="mt-1 w-4 h-4 text-red-600 bg-gray-100 border-gray-300 rounded focus:ring-red-500 dark:focus:ring-red-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                    />
                    <label htmlFor="burn-on-first-view" className="flex-1">
                      <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        🔥 Burn all copies after first view
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        When enabled, ALL recipient links will be deleted as soon as the first person views the message.
                        This ensures maximum security but only one recipient can see it.
                      </p>
                    </label>
                  </div>

                  <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
                    <p className="text-sm text-blue-800 dark:text-blue-300">
                      <strong>Note:</strong> Custom URLs and file attachments are not available for group messages.
                      Each recipient will use the same password to decrypt.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {!isGroupMessage && (
              <div>
                <label htmlFor="attachments-label" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Attachments (optional, max 2GB per file)
                </label>
                <div className="space-y-2">
                {files.map((file, index) => (
                  <div key={`${file.name}-${file.size}-${index}`} className="flex items-center justify-between bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                    <span className="text-sm text-gray-700 dark:text-gray-200 truncate flex-1">{file.name}</span>
                    <span className="text-xs text-gray-500 dark:text-gray-400 mx-2">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </span>
                    <button
                      type="button"
                      onClick={() => removeFile(index)}
                      className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                <label htmlFor="file-upload" className="flex items-center justify-center gap-2 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-4 cursor-pointer hover:border-primary-500 dark:hover:border-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors">
                  <Upload className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                  <span className="text-gray-600 dark:text-gray-300">Choose files to encrypt</span>
                  <input
                    id="file-upload"
                    type="file"
                    multiple
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
            )}

            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full text-lg"
            >
              {loading ? 'Encrypting...' : 'Encrypt & Create Link'}
            </button>
          </form>

          <div className="mt-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <h3 className="font-semibold text-blue-900 dark:text-blue-400 mb-2">How it works</h3>
            <ul className="text-sm text-blue-800 dark:text-blue-300 space-y-1">
              <li>• Your message is encrypted in your browser with AES-256-GCM</li>
              <li>• Password never leaves your device</li>
              <li>• Share the link and password separately for maximum security</li>
              <li>• Message deletes permanently after first successful decryption</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CreateMessage;
