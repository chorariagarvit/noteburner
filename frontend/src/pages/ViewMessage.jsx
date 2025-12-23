import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Flame, Lock, Eye, EyeOff, Download, AlertTriangle, Share2, Twitter, MessageSquare, Clock } from 'lucide-react';
import confetti from 'canvas-confetti';
import { decryptMessage, decryptFile } from '../utils/crypto';
import { getMessage, getMedia, deleteMessage, confirmMediaDownload } from '../utils/api';
import { useCountdown, formatTimeLeft } from '../hooks/useCountdown';

function ViewMessage() {
  const { token } = useParams();
  const navigate = useNavigate();
  
  useEffect(() => {
    document.title = 'NoteBurner - View Message';
  }, []);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [decrypted, setDecrypted] = useState(false);
  const [message, setMessage] = useState('');
  const [mediaFileIds, setMediaFileIds] = useState([]); // Store file IDs, not decrypted files
  const [decryptedPassword, setDecryptedPassword] = useState(''); // Store password for on-demand decryption
  const [error, setError] = useState('');
  const [downloading, setDownloading] = useState({});
  const [unlocking, setUnlocking] = useState(false);
  const [showPreview, setShowPreview] = useState(true);
  const [expiresAt, setExpiresAt] = useState(null);
  const timeLeft = useCountdown(expiresAt);

  const handleShare = (platform) => {
    const shareText = 'I just sent a self-destructing message 🔥 Try NoteBurner for secure, encrypted messaging!';
    const shareUrl = window.location.origin;
    
    const urls = {
      twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`,
      reddit: `https://reddit.com/submit?title=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`
    };
    
    window.open(urls[platform], '_blank', 'width=600,height=400');
  };

  const handleDecrypt = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (!password) {
        throw new Error('Password is required');
      }

      // Fetch encrypted message
      const data = await getMessage(token);
      
      // Store expiration time
      if (data.expiresAt) {
        setExpiresAt(data.expiresAt);
      }

      // Decrypt message
      const decryptedText = await decryptMessage(
        data.encryptedData,
        data.iv,
        data.salt,
        password
      );

      setMessage(decryptedText);
      setDecryptedPassword(password); // Store password for on-demand file decryption

      // Store media file IDs instead of decrypting all files at once
      if (data.mediaFiles && data.mediaFiles.length > 0) {
        setMediaFileIds(data.mediaFiles);
      }

      // Show unlocking animation
      setUnlocking(true);
      
      // Wait for unlock animation to complete
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Decryption successful - now permanently delete the message and media
      try {
        await deleteMessage(token);
      } catch (err) {
        console.error('Failed to delete message:', err);
        // Continue anyway - message was decrypted successfully
      }

      setUnlocking(false);
      setDecrypted(true);
      
      // Trigger confetti celebration 🎉
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
      
      // Second burst for extra celebration
      setTimeout(() => {
        confetti({
          particleCount: 50,
          angle: 60,
          spread: 55,
          origin: { x: 0 }
        });
        confetti({
          particleCount: 50,
          angle: 120,
          spread: 55,
          origin: { x: 1 }
        });
      }, 200);
    } catch (err) {
      setError(err.message || 'Failed to decrypt message. Check your password.');
      setUnlocking(false); // Reset unlocking state on error
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (fileId, index) => {
    try {
      setDownloading(prev => ({ ...prev, [index]: true }));
      
      // Fetch and decrypt file on-demand
      const mediaData = await getMedia(fileId);
      const decryptedFile = await decryptFile(
        mediaData.fileData,
        mediaData.iv,
        mediaData.salt,
        decryptedPassword,
        mediaData.fileName,
        mediaData.fileType
      );
      
      // Force download (not open in browser)
      const url = URL.createObjectURL(decryptedFile.blob);
      const a = document.createElement('a');
      a.href = url;
      // Sanitize filename and force download attribute
      const sanitizedFilename = decryptedFile.fileName.replaceAll(/[<>:"/\\|?*]/g, '_');
      a.download = sanitizedFilename;
      a.setAttribute('download', sanitizedFilename); // Explicit attribute
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      
      // Cleanup - delayed to ensure download starts
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 100);
      
      // Only delete file after successful download
      // If there's a network error or decryption failure, file stays available
      await confirmMediaDownload(fileId);
      
      // Remove this file from the list (one-time download)
      setMediaFileIds(prev => prev.filter((_, i) => i !== index));
      
      setDownloading(prev => ({ ...prev, [index]: false }));
    } catch (err) {
      console.error('Failed to download file:', err);
      setError('Failed to download file: ' + err.message + '. You can retry.');
      setDownloading(prev => ({ ...prev, [index]: false }));
      // File remains available for retry on error
    }
  };

  if (decrypted) {
    return (
      <div className="min-h-[calc(100vh-8rem)] bg-gradient-to-br from-orange-50 to-red-50 dark:from-gray-800 dark:to-gray-900 py-12">
        <div className="max-w-3xl mx-auto px-4">
          <div className="card animate-fade-in">
            <div className="text-center mb-6">
              <Flame className="w-16 h-16 text-primary-600 dark:text-primary-500 mx-auto mb-4 animate-pulse" />
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                Message Decrypted
              </h2>
              <p className="text-gray-600 dark:text-gray-300">
                This message has been permanently deleted
              </p>
            </div>

            <div className="bg-white dark:bg-gray-700 border-2 border-primary-200 dark:border-primary-700 rounded-lg p-6 mb-6">
              <pre className="whitespace-pre-wrap text-gray-800 dark:text-gray-100 font-sans">
                {message}
              </pre>
            </div>

            {mediaFileIds.length > 0 && (
              <div className="space-y-3 mb-6">
                <h3 className="font-semibold text-gray-900 dark:text-white">Attached Files ({mediaFileIds.length})</h3>
                <p className="text-sm text-amber-700 dark:text-amber-400 mb-2">⚠️ Files are decrypted and downloaded on-demand to save memory. You have 24 hours to download them before they're permanently deleted.</p>
                {mediaFileIds.map((fileId, index) => (
                  <div key={fileId} className="flex items-center justify-between bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                    <span className="text-gray-700 dark:text-gray-200">File {index + 1}</span>
                    <button
                      onClick={() => handleDownload(fileId, index)}
                      disabled={downloading[index]}
                      className="btn-secondary flex items-center gap-2"
                    >
                      <Download className="w-4 h-4" />
                      {downloading[index] ? 'Downloading...' : 'Download'}
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-red-800 dark:text-red-300">
                  <p className="font-semibold mb-1">This message has self-destructed</p>
                  <p>It has been permanently deleted from our servers. There are no backups or recovery options. Make sure to save any important information now.</p>
                </div>
              </div>
            </div>

            {/* Social Share Section */}
            <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-100 dark:bg-primary-900/30 rounded-full mb-4">
                  <Flame className="w-8 h-8 text-primary-600 dark:text-primary-500" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                  Your secret has self-destructed! 🔥
                </h3>
                <p className="text-base text-gray-600 dark:text-gray-400 mb-1">
                  Want to send your own encrypted message?
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-500">
                  No registration. No tracking. Just pure privacy.
                </p>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-3 justify-center mb-6">
                <button
                  onClick={() => navigate('/')}
                  className="btn-primary flex items-center justify-center gap-2 text-lg px-6 py-3"
                >
                  <Flame className="w-5 h-5" />
                  Create Your Secret Message
                </button>
              </div>
              
              <div className="text-center">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">Share NoteBurner with friends:</p>
                <div className="flex gap-3 justify-center">
                  <button
                    onClick={() => handleShare('twitter')}
                    className="btn-secondary flex items-center gap-2 text-sm"
                  >
                    <Twitter className="w-4 h-4" />
                    Share on X
                  </button>
                  <button
                    onClick={() => handleShare('reddit')}
                    className="btn-secondary flex items-center gap-2 text-sm"
                  >
                    <MessageSquare className="w-4 h-4" />
                    Share on Reddit
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (unlocking) {
    return (
      <div className="min-h-[calc(100vh-8rem)] bg-gradient-to-br from-green-50 to-emerald-50 dark:from-gray-800 dark:to-gray-900 py-12 flex items-center justify-center">
        <div className="text-center">
          <div className="relative inline-block mb-6">
            <div className="absolute inset-0 bg-green-400 dark:bg-green-500 rounded-full animate-ping opacity-75"></div>
            <div className="relative bg-white dark:bg-gray-800 rounded-full p-8 shadow-2xl">
              <Lock className="w-16 h-16 text-green-600 dark:text-green-400 animate-bounce" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2 animate-pulse">Unlocking Message...</h2>
          <p className="text-gray-600 dark:text-gray-300">Decryption successful!</p>
        </div>
      </div>
    );
  }

  // Show preview page first
  if (showPreview) {
    return (
      <div className="min-h-[calc(100vh-8rem)] bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50 dark:from-gray-900 dark:via-purple-900/20 dark:to-pink-900/20 py-12 flex items-center justify-center">
        <div className="max-w-2xl mx-auto px-4">
          <div className="card text-center">
            <div className="mb-8">
              <div className="relative inline-block">
                <div className="absolute inset-0 bg-gradient-to-r from-primary-400 to-pink-400 rounded-full animate-pulse opacity-30 blur-xl"></div>
                <div className="relative bg-gradient-to-r from-primary-500 to-pink-500 rounded-full p-8 shadow-2xl">
                  <Lock className="w-20 h-20 text-white animate-bounce" style={{ animationDuration: '2s' }} />
                </div>
              </div>
            </div>

            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4 bg-gradient-to-r from-primary-600 to-pink-600 dark:from-primary-400 dark:to-pink-400 bg-clip-text text-transparent">
              Someone sent you a secret message...
            </h1>
            
            <p className="text-lg text-gray-600 dark:text-gray-300 mb-3">
              🔐 Encrypted end-to-end
            </p>
            <p className="text-lg text-gray-600 dark:text-gray-300 mb-3">
              🔥 Self-destructs after reading
            </p>
            <p className="text-lg text-gray-600 dark:text-gray-300 mb-8">
              ⏱️ One-time access only
            </p>

            <button
              onClick={() => setShowPreview(false)}
              className="btn-primary text-xl px-8 py-4 shadow-lg hover:shadow-xl transform hover:scale-105 transition-all"
            >
              <Lock className="w-6 h-6 inline-block mr-2" />
              Unlock Secret Message
            </button>

            <div className="mt-8 pt-8 border-t border-gray-200 dark:border-gray-700">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Powered by <span className="font-semibold text-primary-600 dark:text-primary-400">NoteBurner</span>
                <br />
                Military-grade encryption • Zero knowledge • No tracking
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-8rem)] bg-gray-50 dark:bg-gray-900 py-12">
      <div className="max-w-2xl mx-auto px-4">
        <div className="card">
          <div className="text-center mb-8">
            <Lock className="w-12 h-12 text-primary-600 dark:text-primary-500 mx-auto mb-4" />
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Encrypted Message
            </h2>
            <p className="text-gray-600 dark:text-gray-300">
              Enter the password to decrypt and view this message
            </p>
          </div>

          <form onSubmit={handleDecrypt} className="space-y-6">
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter the password"
                  className="input-field pr-10"
                  required
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

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
              {loading ? 'Decrypting...' : 'Decrypt Message'}
            </button>
          </form>

          {timeLeft && !timeLeft.expired && (
            <div className="mt-6 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4">
              <div className="flex items-center justify-center gap-3">
                <Clock className="w-5 h-5 text-orange-600 dark:text-orange-400 animate-pulse" />
                <div className="text-center">
                  <p className="text-sm font-semibold text-orange-900 dark:text-orange-300">
                    Message expires in
                  </p>
                  <p className="text-2xl font-mono font-bold text-orange-700 dark:text-orange-400">
                    {formatTimeLeft(timeLeft)}
                  </p>
                </div>
              </div>
            </div>
          )}

          {timeLeft?.expired && (
            <div className="mt-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <div className="flex items-center justify-center gap-3">
                <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
                <p className="text-sm font-semibold text-red-900 dark:text-red-300">
                  ⏰ This message has expired
                </p>
              </div>
            </div>
          )}

          <div className="mt-6 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Flame className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-amber-800 dark:text-amber-300">
                <p className="font-semibold mb-1">Warning: One-Time Access Only</p>
                <p>Once you decrypt this message, it will be permanently deleted from our servers. There are no backups or second chances.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ViewMessage;
