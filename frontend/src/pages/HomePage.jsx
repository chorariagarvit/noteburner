import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import PropTypes from 'prop-types';
import { Flame, Lock, Zap, Shield, Clock, FileImage, Eye, EyeOff, Upload, X, TrendingUp } from 'lucide-react';
import { encryptMessage, encryptFile, generatePassword } from '../utils/crypto';
import { createMessage, uploadMedia } from '../utils/api';
import { useStats } from '../hooks/useStats';
import { AnimatedCounter } from '../components/AnimatedCounter';

function HomePage() {
  const navigate = useNavigate();
  const { stats, loading: statsLoading } = useStats(30000); // Refresh every 30s
  
  useEffect(() => {
    document.title = 'NoteBurner - Home';
  }, []);
  const [message, setMessage] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [expiresIn, setExpiresIn] = useState('24');
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleFileUpload = (e) => {
    const selectedFiles = Array.from(e.target.files);
    const validFiles = selectedFiles.filter(f => f.size <= 100 * 1024 * 1024);
    
    if (validFiles.length !== selectedFiles.length) {
      setError('Some files exceeded 100MB limit and were skipped');
    }
    
    setFiles([...files, ...validFiles]);
  };

  const removeFile = (index) => {
    setFiles(files.filter((_, i) => i !== index));
  };

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

      const encrypted = await encryptMessage(message, password);
      const expirySeconds = expiresIn ? Number.parseInt(expiresIn) * 3600 : null;
      const result = await createMessage(
        encrypted.encryptedData,
        encrypted.iv,
        encrypted.salt,
        expirySeconds
      );

      if (files.length > 0) {
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

      // Redirect to CreateMessage page in success mode
      navigate('/create', { state: { shareUrl: result.url, password, filesCount: files.length, expiresIn } });
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-8rem)]">
      {/* Hero Section with Form */}
      <section className="bg-gradient-to-br from-primary-50 to-blue-50 dark:from-gray-800 dark:to-gray-900 py-12 md:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-start">
            {/* Left: Hero Content */}
            <div className="animate-fade-in">
              <div className="flex items-center gap-3 mb-6">
                <Flame className="w-12 md:w-16 h-12 md:h-16 text-red-600 dark:text-red-500" />
                <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 dark:text-white">
                  Burn After Reading
                </h1>
              </div>
              <p className="text-base md:text-lg text-gray-600 dark:text-gray-300 mb-6">
                Send encrypted messages and files that self-destruct after one read. 
                No traces. No backups. Complete privacy.
              </p>
              
              {/* Live Stats Counter */}
              {!statsLoading && stats && (
                <div className="inline-flex items-center gap-2 bg-primary-100 dark:bg-primary-900/30 px-4 py-2 rounded-full mb-8">
                  <TrendingUp className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                  <span className="text-sm font-medium text-primary-900 dark:text-primary-100">
                    <AnimatedCounter value={stats.today.messages_burned || 0} /> messages burned today
                  </span>
                  {stats.this_week.messages_burned > 0 && (
                    <span className="text-xs text-primary-700 dark:text-primary-300 ml-2">
                      · <AnimatedCounter value={stats.this_week.messages_burned} /> this week
                    </span>
                  )}
                </div>
              )}
              
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <Shield className="w-6 h-6 text-primary-600 dark:text-primary-500 mt-1 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">Military-Grade Encryption</h3>
                    <p className="text-gray-600 dark:text-gray-300 text-sm">AES-256-GCM with 300,000 PBKDF2 iterations</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Lock className="w-6 h-6 text-primary-600 dark:text-primary-500 mt-1 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">One-Time Access</h3>
                    <p className="text-gray-600 dark:text-gray-300 text-sm">Permanently deleted after first read</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Zap className="w-6 h-6 text-primary-600 dark:text-primary-500 mt-1 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">Lightning Fast</h3>
                    <p className="text-gray-600 dark:text-gray-300 text-sm">Powered by Cloudflare's global network</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Create Message Form */}
            <div className="card">
              <h2 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white mb-4 md:mb-6">
                Create Secure Message
              </h2>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="message" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Message *
                  </label>
                  <textarea
                    id="message"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Enter your secret message..."
                    rows={4}
                    className="input-field resize-none text-sm"
                    required
                  />
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
                        className="input-field pr-10 text-sm"
                        required
                        minLength={8}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={handleGeneratePassword}
                      className="btn-secondary whitespace-nowrap text-sm py-2 px-3 md:px-4"
                    >
                      Generate
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="expiration" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      <Clock className="w-4 h-4 inline mr-1" />
                      Expiration
                    </label>
                    <select
                      id="expiration"
                      value={expiresIn}
                      onChange={(e) => setExpiresIn(e.target.value)}
                      className="input-field text-sm"
                    >
                      <option value="">No expiration</option>
                      <option value="1">1 hour</option>
                      <option value="6">6 hours</option>
                      <option value="24">24 hours</option>
                      <option value="72">3 days</option>
                      <option value="168">7 days</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="files-label" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Files (max 100MB)
                    </label>
                    <label htmlFor="files-upload" className="flex items-center justify-center gap-2 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-2.5 cursor-pointer hover:border-primary-500 dark:hover:border-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors">
                      <Upload className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                      <span className="text-gray-600 dark:text-gray-300 text-sm">{files.length > 0 ? `${files.length} file(s)` : 'Choose files'}</span>
                      <input
                        id="files-upload"
                        type="file"
                        multiple
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>

                {files.length > 0 && (
                  <div className="space-y-1">
                    {files.map((file, index) => (
                      <div key={`${file.name}-${file.size}-${index}`} className="flex items-center justify-between bg-gray-50 dark:bg-gray-700 p-2 rounded text-xs">
                        <span className="text-gray-700 dark:text-gray-200 truncate flex-1">{file.name}</span>
                        <button
                          type="button"
                          onClick={() => removeFile(index)}
                          className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 ml-2"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {error && (
                  <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-3 py-2 rounded-lg text-sm">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary w-full"
                >
                  {loading ? 'Encrypting...' : 'Encrypt & Create Link'}
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center text-gray-900 dark:text-white mb-12">
            Military-Grade Security
          </h2>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <FeatureCard
              icon={<Lock className="w-8 h-8" />}
              title="Client-Side Encryption"
              description="AES-256-GCM encryption happens in your browser. Your password never leaves your device."
            />
            
            <FeatureCard
              icon={<Flame className="w-8 h-8 text-red-600 dark:text-red-500" />}
              title="One-Time Access"
              description="Messages are permanently deleted after the first successful decryption. No backups, no recovery."
            />
            
            <FeatureCard
              icon={<Shield className="w-8 h-8" />}
              title="Password Protected"
              description="PBKDF2 key derivation ensures strong password-based security. Only you and the recipient can decrypt."
            />
            
            <FeatureCard
              icon={<FileImage className="w-8 h-8" />}
              title="Media Support"
              description="Encrypt and share images, documents, and files up to 100MB. All encrypted end-to-end."
            />
            
            <FeatureCard
              icon={<Clock className="w-8 h-8" />}
              title="Auto-Expiration"
              description="Set optional time limits. Messages automatically delete after expiration, even if unread."
            />
            
            <FeatureCard
              icon={<Zap className="w-8 h-8" />}
              title="Lightning Fast"
              description="Powered by Cloudflare's global network. Instant encryption, decryption, and delivery worldwide."
            />
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 bg-gray-50 dark:bg-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center text-gray-900 dark:text-white mb-12">
            How It Works
          </h2>
          
          <div className="grid md:grid-cols-3 gap-8">
            <StepCard
              number="1"
              title="Create & Encrypt"
              description="Write your message, set a password. Everything is encrypted in your browser before being sent."
            />
            
            <StepCard
              number="2"
              title="Share Link"
              description="Get a unique shareable link. Send it along with the password (separately!) to your recipient."
            />
            
            <StepCard
              number="3"
              title="Read & Burn"
              description="Recipient enters password to decrypt and read once. Message is permanently deleted immediately."
            />
          </div>
        </div>
      </section>

      {/* Stats Section */}
      {!statsLoading && stats && (
        <section className="py-12 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-2xl md:text-3xl font-bold text-center text-gray-900 dark:text-white mb-8">
              Platform Statistics
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div className="text-center">
                <div className="text-3xl md:text-4xl font-bold text-primary-600 dark:text-primary-500 mb-2">
                  <AnimatedCounter value={stats.all_time.messages_created || 0} />
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Messages Created</div>
              </div>
              <div className="text-center">
                <div className="text-3xl md:text-4xl font-bold text-red-600 dark:text-red-500 mb-2">
                  <AnimatedCounter value={stats.all_time.messages_burned || 0} />
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Messages Burned</div>
              </div>
              <div className="text-center">
                <div className="text-3xl md:text-4xl font-bold text-green-600 dark:text-green-500 mb-2">
                  <AnimatedCounter value={stats.all_time.files_encrypted || 0} />
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Files Encrypted</div>
              </div>
              <div className="text-center">
                <div className="text-3xl md:text-4xl font-bold text-blue-600 dark:text-blue-500 mb-2">
                  {stats.all_time.avg_file_size 
                    ? `${Math.round(stats.all_time.avg_file_size / 1024 / 1024)}MB`
                    : '0MB'}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Avg File Size</div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* CTA Section */}
      <section className="py-20 bg-primary-600 dark:bg-primary-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-bold text-white mb-6">
            Ready to Send a Secure Message?
          </h2>
          <p className="text-xl text-primary-100 dark:text-primary-200 mb-8">
            Free, anonymous, and completely secure. No registration required.
          </p>
          <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="bg-white dark:bg-gray-100 text-primary-600 dark:text-primary-700 hover:bg-gray-100 dark:hover:bg-gray-200 font-semibold py-4 px-8 rounded-lg text-lg transition-all duration-200 inline-block shadow-lg">
            Create Message Now
          </button>
        </div>
      </section>
    </div>
  );
}

function FeatureCard({ icon, title, description }) {
  return (
    <div className="card hover:shadow-xl transition-shadow duration-200">
      <div className="text-primary-600 dark:text-primary-500 mb-4">{icon}</div>
      <h3 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">{title}</h3>
      <p className="text-gray-600 dark:text-gray-300">{description}</p>
    </div>
  );
}

FeatureCard.propTypes = {
  icon: PropTypes.node.isRequired,
  title: PropTypes.string.isRequired,
  description: PropTypes.string.isRequired,
};

function StepCard({ number, title, description }) {
  return (
    <div className="text-center">
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary-600 dark:bg-primary-500 text-white text-2xl font-bold mb-4">
        {number}
      </div>
      <h3 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">{title}</h3>
      <p className="text-gray-600 dark:text-gray-300">{description}</p>
    </div>
  );
}

StepCard.propTypes = {
  number: PropTypes.string.isRequired,
  title: PropTypes.string.isRequired,
  description: PropTypes.string.isRequired,
};

export default HomePage;
