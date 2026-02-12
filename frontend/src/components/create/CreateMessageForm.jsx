
import React from 'react';
import PropTypes from 'prop-types';
import { Flame, Clock, Eye, EyeOff, Upload, X, Link2, CheckCircle, XCircle, Loader, Users, FileText } from 'lucide-react';
import PasswordStrengthMeter from '../PasswordStrengthMeter';
import SelfDestructOptions from '../SelfDestructOptions';

function CreateMessageForm(props) {
    const {
        handleSubmit,
        loading,
        message,
        setMessage,
        password,
        setPassword,
        showPassword,
        setShowPassword,
        handleGeneratePassword,
        customSlug,
        handleCustomSlugChange,
        slugStatus,
        slugError,
        mysteryMode,
        setMysteryMode,
        isGroupMessage,
        setIsGroupMessage,
        recipientCount,
        setRecipientCount,
        burnOnFirstView,
        setBurnOnFirstView,
        files,
        handleFileUpload,
        removeFile,
        error,
        loadingMessage,
        showTemplates,
        setShowTemplates,
        onSelectTemplate,
        selfDestructOptions,
        setSelfDestructOptions
    } = props;

    return (
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
                    <div className="flex items-center justify-between mb-2">
                        <label htmlFor="message" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                            Message *
                        </label>
                        <button
                            type="button"
                            onClick={() => setShowTemplates(true)}
                            className="text-sm text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 flex items-center gap-1 transition-colors"
                        >
                            <FileText className="w-4 h-4" />
                            Use Template
                        </button>
                    </div>
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
                    <PasswordStrengthMeter password={password} />
                </div>

                {/* Advanced Self-Destruct Options */}
                {!isGroupMessage && (
                    <SelfDestructOptions 
                        options={selfDestructOptions} 
                        onChange={setSelfDestructOptions} 
                    />
                )}

                {!isGroupMessage && (
                    <>
                        <div>
                            <label htmlFor="custom-url" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                <Link2 className="w-4 h-4 inline mr-1" />
                                Custom URL (optional)
                            </label>
                            <div className="relative">
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="text-sm text-gray-500 dark:text-gray-400">noteburner.work/m/</span>
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
                    {loading ? (loadingMessage || 'Encrypting...') : 'Encrypt & Create Link'}
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
    );
}

CreateMessageForm.propTypes = {
    handleSubmit: PropTypes.func.isRequired,
    loading: PropTypes.bool.isRequired,
    message: PropTypes.string.isRequired,
    setMessage: PropTypes.func.isRequired,
    password: PropTypes.string.isRequired,
    setPassword: PropTypes.func.isRequired,
    showPassword: PropTypes.bool.isRequired,
    setShowPassword: PropTypes.func.isRequired,
    handleGeneratePassword: PropTypes.func.isRequired,
    customSlug: PropTypes.string,
    handleCustomSlugChange: PropTypes.func.isRequired,
    slugStatus: PropTypes.string.isRequired,
    slugError: PropTypes.string,
    mysteryMode: PropTypes.bool.isRequired,
    setMysteryMode: PropTypes.func.isRequired,
    isGroupMessage: PropTypes.bool.isRequired,
    setIsGroupMessage: PropTypes.func.isRequired,
    recipientCount: PropTypes.number.isRequired,
    setRecipientCount: PropTypes.func.isRequired,
    burnOnFirstView: PropTypes.bool.isRequired,
    setBurnOnFirstView: PropTypes.func.isRequired,
    files: PropTypes.array.isRequired,
    handleFileUpload: PropTypes.func.isRequired,
    removeFile: PropTypes.func.isRequired,
    error: PropTypes.string,
    loadingMessage: PropTypes.string,
    showTemplates: PropTypes.bool,
    setShowTemplates: PropTypes.func,
    onSelectTemplate: PropTypes.func,
    selfDestructOptions: PropTypes.object.isRequired,
    setSelfDestructOptions: PropTypes.func.isRequired
};

export default CreateMessageForm;
