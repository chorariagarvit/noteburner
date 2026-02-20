
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import PropTypes from 'prop-types';
import { Flame, Lock, Zap, Shield, Clock, Eye, EyeOff, Upload, X, TrendingUp, Link2, CheckCircle, XCircle, Loader, Settings } from 'lucide-react';
import { encryptMessage, encryptFile, generatePassword } from '../../utils/crypto';
import { createMessage, uploadMedia } from '../../utils/api';
import { uploadLargeFile, shouldUseChunkedUpload } from '../../utils/chunkedUpload';
import { updateStatsOnMessageCreate } from '../../utils/achievements';
import { useLoadingMessages } from '../../hooks/useLoadingMessages';
import { AnimatedCounter } from '../AnimatedCounter';
import StreakCounter from '../StreakCounter';
import { useCustomSlug } from '../../hooks/useCustomSlug';
import { useFileUpload } from '../../hooks/useFileUpload';
import PasswordStrengthMeter from '../PasswordStrengthMeter';

function HeroSection({ stats, statsLoading }) {
    const navigate = useNavigate();
    const [message, setMessage] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [expiresIn, setExpiresIn] = useState('1440'); // Default 24 hours in minutes
    const [loading, setLoading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState({});
    const [error, setError] = useState('');
    const loadingMessage = useLoadingMessages(loading);

    // Use custom hooks for file upload and slug validation
    const { files, handleFileUpload, removeFile, getTotalSize } = useFileUpload();
    const { customSlug, slugStatus, slugError, handleCustomSlugChange } = useCustomSlug();

    const handleGeneratePassword = () => {
        const newPassword = generatePassword(16);
        setPassword(newPassword);
    };

    const validateForm = () => {
        if (!message.trim()) {
            throw new Error('Message cannot be empty');
        }

        if (!password) {
            throw new Error('Password is required');
        }

        if (password.length < 8) {
            throw new Error('Password must be at least 8 characters');
        }

        // Validate custom slug if provided
        if (customSlug && (slugStatus === 'unavailable' || slugStatus === 'invalid')) {
            throw new Error('Please fix the custom URL before submitting');
        }
    };

    const uploadFiles = async (result, password) => {
        for (let i = 0; i < files.length; i++) {
            const file = files[i];

            try {
                const encryptedFile = await encryptFile(file, password);

                // Use chunked upload for files >100MB
                if (shouldUseChunkedUpload(encryptedFile.encryptedData.length)) {
                    await uploadLargeFile(
                        file,
                        encryptedFile.encryptedData,
                        encryptedFile.iv,
                        encryptedFile.salt,
                        result.token,
                        (progress) => {
                            setUploadProgress(prev => ({ ...prev, [i]: progress }));
                        }
                    );
                } else {
                    // Use direct upload for smaller files
                    await uploadMedia(
                        encryptedFile.encryptedData,
                        file.name,
                        file.type,
                        encryptedFile.iv,
                        encryptedFile.salt,
                        result.token
                    );
                    // Set progress to 100 for small files
                    setUploadProgress(prev => ({ ...prev, [i]: 100 }));
                }
            } catch (error_) {
                // Provide more context on upload errors
                throw new Error(`Failed to upload ${file.name}: ${error_.message}`);
            }
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            validateForm();

            const encrypted = await encryptMessage(message, password);
            const expirySeconds = expiresIn ? Number.parseInt(expiresIn) * 60 : null; // Convert minutes to seconds
            const result = await createMessage(
                encrypted.encryptedData,
                encrypted.iv,
                encrypted.salt,
                expirySeconds,
                customSlug || null
            );

            if (files.length > 0) {
                await uploadFiles(result, password);
            }

            // Track achievements
            const fileSize = getTotalSize();
            updateStatsOnMessageCreate({
                fileSize,
                expiration: expirySeconds * 1000,
                mysteryMode: false // HomePage doesn't have mystery mode
            });

            // Redirect to CreateMessage page in success mode
            navigate('/create', { state: { shareUrl: result.url, password, filesCount: files.length, expiresIn } });
        } catch (err) {
            setError(err.message);
            setLoading(false);
        }
    };

    return (
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
                        <div className="flex flex-wrap items-center gap-3 mb-8">
                            <div className="inline-flex items-center gap-2 bg-primary-100 dark:bg-primary-900/30 px-4 py-2 rounded-full">
                                <TrendingUp className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                                <span className="text-sm font-medium text-primary-900 dark:text-primary-100">
                                    {(() => {
                                        if (statsLoading) {
                                            return 'Loading stats...';
                                        }

                                        if (stats) {
                                            return (
                                                <>
                                                    <AnimatedCounter value={stats.today?.messages_burned || 0} /> messages burned today
                                                    {(stats.this_week?.messages_burned || 0) > 0 && (
                                                        <span className="text-xs text-primary-700 dark:text-primary-300 ml-2">
                                                            · <AnimatedCounter value={stats.this_week.messages_burned} /> this week
                                                        </span>
                                                    )}
                                                </>
                                            );
                                        }

                                        return '0 messages burned today';
                                    })()}
                                </span>
                            </div>
                            <StreakCounter />
                        </div>

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
                                <PasswordStrengthMeter password={password} />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label htmlFor="time-limit" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        <Clock className="w-4 h-4 inline mr-1" />
                                        Time Limit
                                    </label>
                                    <select
                                        id="time-limit"
                                        value={expiresIn}
                                        onChange={(e) => setExpiresIn(e.target.value)}
                                        className="input-field text-sm"
                                    >
                                        <option value="">No expiration</option>
                                        <option value="60">1 hour</option>
                                        <option value="360">6 hours</option>
                                        <option value="1440">24 hours</option>
                                        <option value="4320">3 days</option>
                                        <option value="10080">7 days</option>
                                    </select>
                                </div>
                                <div>
                                    <label htmlFor="custom-url" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        <Link2 className="w-4 h-4 inline mr-1" />
                                        Custom URL (optional)
                                    </label>
                                    <div className="relative">
                                        <input
                                            id="custom-url"
                                            type="text"
                                            value={customSlug}
                                            onChange={handleCustomSlugChange}
                                            placeholder="my-secret-link"
                                            maxLength={20}
                                            className="input-field text-sm pr-8"
                                            disabled={loading}
                                        />
                                        {slugStatus === 'checking' && (
                                            <Loader className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 animate-spin" />
                                        )}
                                        {slugStatus === 'available' && (
                                            <CheckCircle className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-green-500" />
                                        )}
                                        {(slugStatus === 'unavailable' || slugStatus === 'invalid') && (
                                            <XCircle className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-red-500" />
                                        )}
                                    </div>
                                    {slugError && (
                                        <p className="text-xs text-red-500 mt-1">{slugError}</p>
                                    )}
                                    {customSlug && slugStatus === 'available' && (
                                        <p className="text-xs text-green-500 mt-1">✓ Available</p>
                                    )}
                                    {!customSlug && (
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">3-20 chars: letters, numbers, hyphens, underscores</p>
                                    )}
                                </div>
                            </div>

                            <div>
                                <label htmlFor="files-label" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Files (max 2GB each)
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

                            {files.length > 0 && (
                                <div className="space-y-2">
                                    {files.map((file, index) => (
                                        <div key={`${file.name}-${file.size}-${index}`}>
                                            <div className="flex items-center justify-between bg-gray-50 dark:bg-gray-700 p-2 rounded text-xs">
                                                <div className="flex-1 truncate">
                                                    <span className="text-gray-700 dark:text-gray-200">{file.name}</span>
                                                    <span className="text-gray-500 dark:text-gray-400 ml-2">
                                                        ({(file.size / (1024 * 1024)).toFixed(1)}MB)
                                                    </span>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => removeFile(index)}
                                                    disabled={loading}
                                                    className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 ml-2 disabled:opacity-50"
                                                >
                                                    <X className="w-3 h-3" />
                                                </button>
                                            </div>
                                            {uploadProgress[index] !== undefined && (
                                                <div className="mt-1">
                                                    <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400 mb-1">
                                                        <span className="flex items-center gap-1">
                                                            {uploadProgress[index] < 30 && '🚀 Launching...'}
                                                            {uploadProgress[index] >= 30 && uploadProgress[index] < 60 && '⚡ Flying through cyberspace...'}
                                                            {uploadProgress[index] >= 60 && uploadProgress[index] < 90 && '🔐 Encrypting chunks...'}
                                                            {uploadProgress[index] >= 90 && '✨ Almost there...'}
                                                        </span>
                                                        <span className="font-mono font-semibold">{uploadProgress[index]}%</span>
                                                    </div>
                                                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 overflow-hidden">
                                                        <div
                                                            className="bg-gradient-to-r from-primary-500 via-pink-500 to-purple-500 h-1.5 rounded-full transition-all duration-300 relative"
                                                            style={{ width: `${uploadProgress[index]}%` }}
                                                        >
                                                            <div className="absolute inset-0 bg-white/30 animate-pulse" />
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
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
                                {loading ? loadingMessage : 'Encrypt & Create Link'}
                            </button>

                            <Link
                                to="/create"
                                className="btn-secondary w-full flex items-center justify-center gap-2 text-sm"
                            >
                                <Settings className="w-4 h-4" />
                                Advanced Options
                            </Link>

                            <p className="text-xs text-center text-gray-500 dark:text-gray-400">
                                Need more features? Use <span className="font-semibold">Advanced Options</span> for group messages, 2FA, geo-matching, and more
                            </p>
                        </form>
                    </div>
                </div>
            </div>
        </section>
    );
}

HeroSection.propTypes = {
    stats: PropTypes.object,
    statsLoading: PropTypes.bool
};

export default HeroSection;
