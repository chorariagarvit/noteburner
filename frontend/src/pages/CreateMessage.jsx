import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Flame, Copy, Check, Eye, EyeOff, Upload, X, Clock } from 'lucide-react';
import { encryptMessage, encryptFile, generatePassword } from '../utils/crypto';
import { createMessage, uploadMedia } from '../utils/api';

function CreateMessage() {
  const navigate = useNavigate();
  const [message, setMessage] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [expiresIn, setExpiresIn] = useState('24'); // Default 24 hours
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  const handleFileUpload = (e) => {
    const selectedFiles = Array.from(e.target.files);
    const validFiles = selectedFiles.filter(f => f.size <= 100 * 1024 * 1024); // 100MB limit
    
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

      // Encrypt message
      const encrypted = await encryptMessage(message, password);
      
      // Create message on server
      const expirySeconds = expiresIn ? parseInt(expiresIn) * 3600 : null;
      const result = await createMessage(
        encrypted.encryptedData,
        encrypted.iv,
        encrypted.salt,
        expirySeconds
      );

      // Upload encrypted files if any
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

      setShareUrl(result.url);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
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
    setFiles([]);
    setShareUrl('');
    setExpiresIn('24'); // Reset to default 24 hours
    setError('');
  };

  if (shareUrl) {
    return (
      <div className="min-h-[calc(100vh-8rem)] bg-gradient-to-br from-green-50 to-emerald-50 py-12">
        <div className="max-w-2xl mx-auto px-4">
          <div className="card animate-fade-in">
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 text-green-600 mb-4">
                <Check className="w-8 h-8" />
              </div>
              <h2 className="text-3xl font-bold text-gray-900 mb-2">
                Message Created Successfully!
              </h2>
              <p className="text-gray-600">
                Your encrypted message is ready to share
              </p>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Share this URL
                </label>
                <div className="flex gap-2">
                  <input
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

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <h3 className="font-semibold text-amber-900 mb-2 flex items-center gap-2">
                  <Flame className="w-5 h-5" />
                  Important Security Notice
                </h3>
                <ul className="text-sm text-amber-800 space-y-1">
                  <li>• Share the password separately (not in the same channel as the link)</li>
                  <li>• The message will be deleted after the first successful decryption</li>
                  <li>• There are no backups - once it's gone, it's gone forever</li>
                  {files.length > 0 && <li>• {files.length} encrypted file(s) attached</li>}
                  {expiresIn && <li>• Message expires in {expiresIn} hour(s)</li>}
                </ul>
              </div>

              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-2">Password</h3>
                <div className="font-mono text-lg text-gray-700 bg-white p-3 rounded border border-gray-300">
                  {password}
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Make sure the recipient has this password before sharing the link
                </p>
              </div>

              <button
                onClick={handleReset}
                className="btn-primary w-full"
              >
                Create Another Message
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-8rem)] bg-gray-50 py-12">
      <div className="max-w-3xl mx-auto px-4">
        <div className="card">
          <div className="text-center mb-8">
            <Flame className="w-12 h-12 text-primary-600 mx-auto mb-4" />
            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              Create Encrypted Message
            </h2>
            <p className="text-gray-600">
              Write your message, set a password, and get a one-time shareable link
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Message *
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Enter your secret message..."
                rows={6}
                className="input-field resize-none"
                required
              />
              <p className="text-sm text-gray-500 mt-1">
                {message.length} characters
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Password * (min 8 characters)
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
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
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Clock className="w-4 h-4 inline mr-1" />
                Expiration (optional)
              </label>
              <select
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

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Attachments (optional, max 100MB per file)
              </label>
              <div className="space-y-2">
                {files.map((file, index) => (
                  <div key={index} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                    <span className="text-sm text-gray-700 truncate flex-1">{file.name}</span>
                    <span className="text-xs text-gray-500 mx-2">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </span>
                    <button
                      type="button"
                      onClick={() => removeFile(index)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                <label className="flex items-center justify-center gap-2 border-2 border-dashed border-gray-300 rounded-lg p-4 cursor-pointer hover:border-primary-500 hover:bg-primary-50 transition-colors">
                  <Upload className="w-5 h-5 text-gray-500" />
                  <span className="text-gray-600">Choose files to encrypt</span>
                  <input
                    type="file"
                    multiple
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
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

          <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-blue-900 mb-2">How it works</h3>
            <ul className="text-sm text-blue-800 space-y-1">
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
