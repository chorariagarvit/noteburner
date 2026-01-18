
import React, { useEffect } from 'react';
import { Shield, Lock, FileText, CheckCircle, XCircle } from 'lucide-react';

function PrivacyPolicy() {
    useEffect(() => {
        document.title = 'NoteBurner - Privacy Policy';
        window.scrollTo(0, 0);
    }, []);

    return (
        <div className="min-h-[calc(100vh-8rem)] bg-gray-50 dark:bg-gray-900 py-12">
            <div className="max-w-4xl mx-auto px-4">
                <div className="card">
                    <div className="text-center mb-10">
                        <Shield className="w-16 h-16 text-emerald-600 dark:text-emerald-500 mx-auto mb-4" />
                        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
                            Privacy Policy
                        </h1>
                        <p className="text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
                            We believe privacy is a fundamental right. That's why NoteBurner is built with a zero-knowledge architecture.
                        </p>
                        <div className="mt-4 inline-block px-4 py-1 bg-gray-100 dark:bg-gray-800 rounded-full text-sm text-gray-500 dark:text-gray-400">
                            Last Updated: January 17, 2026
                        </div>
                    </div>

                    <div className="prose dark:prose-invert max-w-none space-y-8">
                        {/* Overview */}
                        <section>
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                                <FileText className="w-6 h-6 text-blue-500" />
                                Overview
                            </h2>
                            <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                                NoteBurner respects your privacy. Our browser extension and web application process your data locally in your browser and only communicate with NoteBurner servers to create encrypted messages. We have no way to decrypt your messages.
                            </p>
                        </section>

                        {/* What we collect */}
                        <section className="grid md:grid-cols-2 gap-8">
                            <div className="bg-red-50 dark:bg-red-900/10 p-6 rounded-xl border border-red-100 dark:border-red-900/30">
                                <h3 className="text-xl font-semibold text-red-700 dark:text-red-400 mb-4 flex items-center gap-2">
                                    <XCircle className="w-5 h-5" />
                                    We DO NOT Collect
                                </h3>
                                <ul className="space-y-3">
                                    {[
                                        'Your personal information or identity',
                                        'Browsing history or website visits',
                                        'Passwords or encryption keys',
                                        'Message content before encryption',
                                        'Analytics or tracking data',
                                        'Cookies or device identifiers'
                                    ].map((item, i) => (
                                        <li key={i} className="flex items-start gap-2 text-gray-700 dark:text-gray-300">
                                            <span className="text-red-500 mt-1">✕</span>
                                            <span>{item}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            <div className="bg-emerald-50 dark:bg-emerald-900/10 p-6 rounded-xl border border-emerald-100 dark:border-emerald-900/30">
                                <h3 className="text-xl font-semibold text-emerald-700 dark:text-emerald-400 mb-4 flex items-center gap-2">
                                    <CheckCircle className="w-5 h-5" />
                                    We ONLY Receive
                                </h3>
                                <ul className="space-y-3">
                                    {[
                                        'Encrypted ciphertext (already encrypted by you)',
                                        'Expiration timestamp',
                                        'Random access token (not linked to you)',
                                        'Optional metadata (size, creation time)'
                                    ].map((item, i) => (
                                        <li key={i} className="flex items-start gap-2 text-gray-700 dark:text-gray-300">
                                            <span className="text-emerald-500 mt-1">✓</span>
                                            <span>{item}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </section>

                        {/* Encryption */}
                        <section>
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                                <Lock className="w-6 h-6 text-purple-500" />
                                Encryption & Security
                            </h2>
                            <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-xl border border-gray-100 dark:border-gray-700">
                                <ul className="space-y-4">
                                    <li className="flex gap-4">
                                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-purple-600 dark:text-purple-400 font-bold">1</div>
                                        <div>
                                            <h4 className="font-semibold text-gray-900 dark:text-white">Client-Side Encryption</h4>
                                            <p className="text-gray-600 dark:text-gray-300 text-sm mt-1">
                                                All encryption happens in your browser using AES-256-GCM before any data leaves your device.
                                            </p>
                                        </div>
                                    </li>
                                    <li className="flex gap-4">
                                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-purple-600 dark:text-purple-400 font-bold">2</div>
                                        <div>
                                            <h4 className="font-semibold text-gray-900 dark:text-white">Zero-Knowledge Architecture</h4>
                                            <p className="text-gray-600 dark:text-gray-300 text-sm mt-1">
                                                Your password never leaves your device. We store only the encrypted ciphertext. We cannot decrypt your messages even if compelled to do so.
                                            </p>
                                        </div>
                                    </li>
                                    <li className="flex gap-4">
                                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-purple-600 dark:text-purple-400 font-bold">3</div>
                                        <div>
                                            <h4 className="font-semibold text-gray-900 dark:text-white">secure Transmission</h4>
                                            <p className="text-gray-600 dark:text-gray-300 text-sm mt-1">
                                                All data is transmitted over HTTPS (TLS 1.3) with HSTS enabled.
                                            </p>
                                        </div>
                                    </li>
                                </ul>
                            </div>
                        </section>

                        {/* Data Retention */}
                        <section>
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                                Data Retention & Deletion
                            </h2>
                            <p className="text-gray-600 dark:text-gray-300 mb-4">
                                Your data is ephemeral by design. We strictly enforce deletion policies:
                            </p>
                            <ul className="list-disc pl-5 space-y-2 text-gray-600 dark:text-gray-300">
                                <li><strong>Automatic Deletion:</strong> Messages are deleted immediately after the first successful decryption (for "Burn on read" messages).</li>
                                <li><strong>Expiration:</strong> All messages have a hard expiration time (default 24 hours, max 7 days).</li>
                                <li><strong>Permanent Removal:</strong> When a message is deleted, it is permanently purged from our database. No backups are retained.</li>
                            </ul>
                        </section>

                        {/* Contact */}
                        <section className="bg-blue-50 dark:bg-blue-900/20 p-6 rounded-xl">
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                                Questions?
                            </h2>
                            <p className="text-gray-600 dark:text-gray-300 mb-4">
                                If you have any questions about our privacy practices, please contact us.
                            </p>
                            <div className="flex flex-wrap gap-4">
                                <a href="mailto:privacy@noteburner.work" className="text-blue-600 dark:text-blue-400 hover:underline">
                                    privacy@noteburner.work
                                </a>
                                <a href="https://github.com/chorariagarvit/noteburner" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">
                                    Source Code on GitHub
                                </a>
                            </div>
                        </section>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default PrivacyPolicy;
