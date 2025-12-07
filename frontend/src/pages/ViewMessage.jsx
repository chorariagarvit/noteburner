import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Flame, Lock, Eye, EyeOff, Download, AlertTriangle } from 'lucide-react';
import { decryptMessage, decryptFile } from '../utils/crypto';
import { getMessage, getMedia, deleteMessage } from '../utils/api';

function ViewMessage() {
  const { token } = useParams();
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [decrypted, setDecrypted] = useState(false);
  const [message, setMessage] = useState('');
  const [mediaFiles, setMediaFiles] = useState([]);
  const [error, setError] = useState('');
  const [burning, setBurning] = useState(false);

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

      // Decrypt message
      const decryptedText = await decryptMessage(
        data.encryptedData,
        data.iv,
        data.salt,
        password
      );

      setMessage(decryptedText);

      // Decrypt media files if any
      if (data.mediaFiles && data.mediaFiles.length > 0) {
        const decryptedFiles = [];
        for (const fileId of data.mediaFiles) {
          try {
            const mediaData = await getMedia(fileId);
            const decryptedFile = await decryptFile(
              mediaData.fileData,
              mediaData.iv,
              mediaData.salt,
              password,
              mediaData.fileName,
              mediaData.fileType
            );
            decryptedFiles.push(decryptedFile);
          } catch (err) {
            console.error('Failed to decrypt file:', err);
          }
        }
        setMediaFiles(decryptedFiles);
      }

      // Decryption successful - now permanently delete the message and media
      try {
        await deleteMessage(token);
      } catch (err) {
        console.error('Failed to delete message:', err);
        // Continue anyway - message was decrypted successfully
      }

      setDecrypted(true);
      
      // Show burning animation
      setBurning(true);
      setTimeout(() => setBurning(false), 3000);
    } catch (err) {
      setError(err.message || 'Failed to decrypt message. Check your password.');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = (file) => {
    const url = URL.createObjectURL(file.blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (decrypted) {
    return (
      <div className="min-h-[calc(100vh-8rem)] bg-gradient-to-br from-orange-50 to-red-50 py-12">
        <div className="max-w-3xl mx-auto px-4">
          <div className={`card ${burning ? 'animate-burn' : 'animate-fade-in'}`}>
            <div className="text-center mb-6">
              <Flame className="w-16 h-16 text-primary-600 mx-auto mb-4 animate-pulse" />
              <h2 className="text-3xl font-bold text-gray-900 mb-2">
                Message Decrypted
              </h2>
              <p className="text-gray-600">
                This message has been permanently deleted
              </p>
            </div>

            <div className="bg-white border-2 border-primary-200 rounded-lg p-6 mb-6">
              <pre className="whitespace-pre-wrap text-gray-800 font-sans">
                {message}
              </pre>
            </div>

            {mediaFiles.length > 0 && (
              <div className="space-y-3 mb-6">
                <h3 className="font-semibold text-gray-900">Attached Files</h3>
                {mediaFiles.map((file, index) => (
                  <div key={index} className="flex items-center justify-between bg-gray-50 p-4 rounded-lg">
                    <span className="text-gray-700">{file.fileName}</span>
                    <button
                      onClick={() => handleDownload(file)}
                      className="btn-secondary flex items-center gap-2"
                    >
                      <Download className="w-4 h-4" />
                      Download
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-red-800">
                  <p className="font-semibold mb-1">This message has self-destructed</p>
                  <p>It has been permanently deleted from our servers. There are no backups or recovery options. Make sure to save any important information now.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-8rem)] bg-gray-50 py-12">
      <div className="max-w-2xl mx-auto px-4">
        <div className="card">
          <div className="text-center mb-8">
            <Lock className="w-12 h-12 text-primary-600 mx-auto mb-4" />
            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              Encrypted Message
            </h2>
            <p className="text-gray-600">
              Enter the password to decrypt and view this message
            </p>
          </div>

          <form onSubmit={handleDecrypt} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <div className="relative">
                <input
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
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
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
              {loading ? 'Decrypting...' : 'Decrypt Message'}
            </button>
          </form>

          <div className="mt-6 bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Flame className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-amber-800">
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
