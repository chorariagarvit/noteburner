
import React, { useEffect } from 'react';
import { HelpCircle, Mail, Github, MessageSquare, AlertCircle } from 'lucide-react';

function SupportPage() {
    useEffect(() => {
        document.title = 'NoteBurner - Support';
        window.scrollTo(0, 0);
    }, []);

    const faqs = [
        {
            q: "Can I recover a message after it's been burned?",
            a: "No. Once a message is viewed (burned) or expired, it is permanently deleted from our servers. There are no backups."
        },
        {
            q: "I lost my password. Can you recover it?",
            a: "No. NoteBurner uses a zero-knowledge architecture. Your password never leaves your device, so we don't have it and cannot recover it for you."
        },
        {
            q: "Is the browser extension safe?",
            a: "Yes. The extension encrypts selected text locally on your machine before sending only the encrypted data to our servers. It is open source and can be audited on GitHub."
        },
        {
            q: "How long can a message last?",
            a: "You can set messages to expire anywhere from 1 hour to 7 days. If not viewed by then, they are automatically deleted."
        }
    ];

    return (
        <div className="min-h-[calc(100vh-8rem)] bg-gray-50 dark:bg-gray-900 py-12">
            <div className="max-w-4xl mx-auto px-4">
                <div className="card mb-8">
                    <div className="text-center mb-10">
                        <HelpCircle className="w-16 h-16 text-blue-600 dark:text-blue-500 mx-auto mb-4" />
                        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
                            Support Center
                        </h1>
                        <p className="text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
                            Need help? Check our frequently asked questions or get in touch.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-2 gap-6 mb-12">
                        {/* Github Issues */}
                        <a
                            href="https://github.com/chorariagarvit/noteburner/issues"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-6 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors group"
                        >
                            <Github className="w-8 h-8 text-gray-900 dark:text-white mb-4" />
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400">
                                Report a Bug
                            </h3>
                            <p className="text-gray-600 dark:text-gray-400 text-sm">
                                Found a technical issue? Open an issue on our GitHub repository.
                            </p>
                        </a>

                        {/* General Inquiry */}
                        <a
                            href="mailto:support@noteburner.work"
                            className="p-6 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors group"
                        >
                            <Mail className="w-8 h-8 text-blue-600 dark:text-blue-400 mb-4" />
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400">
                                Contact Support
                            </h3>
                            <p className="text-gray-600 dark:text-gray-400 text-sm">
                                For general questions or feedback, send us an email.
                            </p>
                        </a>
                    </div>

                    {/* FAQs */}
                    <section>
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                            <MessageSquare className="w-6 h-6 text-emerald-500" />
                            Frequently Asked Questions
                        </h2>

                        <div className="space-y-4">
                            {faqs.map((faq, index) => (
                                <div key={index} className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-6 border border-gray-100 dark:border-gray-700">
                                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                                        {faq.q}
                                    </h3>
                                    <p className="text-gray-600 dark:text-gray-300">
                                        {faq.a}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </section>
                </div>

                {/* Security Notice */}
                <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-900/30 rounded-xl p-6 flex flex-col sm:flex-row gap-4 items-start">
                    <AlertCircle className="w-6 h-6 text-amber-600 dark:text-amber-500 flex-shrink-0 mt-1" />
                    <div>
                        <h3 className="text-lg font-bold text-amber-900 dark:text-amber-400 mb-2">
                            Security Disclosure
                        </h3>
                        <p className="text-amber-800 dark:text-amber-300 text-sm leading-relaxed mb-3">
                            If you discover a security vulnerability, please do NOT report it publicly on GitHub. Email us directly so we can address it responsibly.
                        </p>
                        <a
                            href="mailto:security@noteburner.work"
                            className="text-amber-700 dark:text-amber-400 font-semibold hover:underline text-sm"
                        >
                            security@noteburner.work →
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default SupportPage;
