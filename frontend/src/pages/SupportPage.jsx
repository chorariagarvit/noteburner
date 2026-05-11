
import React, { useEffect } from 'react';
import { HelpCircle, Mail, MessageSquare, AlertCircle } from 'lucide-react';
import { useI18n } from '../contexts/I18nContext';

function SupportPage() {
    const { t } = useI18n();

    useEffect(() => {
        document.title = 'NoteBurner - Support';
        window.scrollTo(0, 0);
    }, []);

    const faqs = [
        { q: t('support.faq1q'), a: t('support.faq1a') },
        { q: t('support.faq2q'), a: t('support.faq2a') },
        { q: t('support.faq3q'), a: t('support.faq3a') },
        { q: t('support.faq4q'), a: t('support.faq4a') }
    ];

    return (
        <div className="min-h-[calc(100vh-8rem)] bg-gray-50 dark:bg-gray-900 py-12">
            <div className="max-w-4xl mx-auto px-4">
                <div className="card mb-8">
                    <div className="text-center mb-10">
                        <HelpCircle className="w-16 h-16 text-blue-600 dark:text-blue-500 mx-auto mb-4" />
                        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
                            {t('support.title')}
                        </h1>
                        <p className="text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
                            {t('support.subtitle')}
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
                            <svg className="w-8 h-8 text-gray-900 dark:text-white mb-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" /></svg>
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400">
                                {t('support.bugTitle')}
                            </h3>
                            <p className="text-gray-600 dark:text-gray-400 text-sm">
                                {t('support.bugDesc')}
                            </p>
                        </a>

                        {/* General Inquiry */}
                        <a
                            href="mailto:support@noteburner.work"
                            className="p-6 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors group"
                        >
                            <Mail className="w-8 h-8 text-blue-600 dark:text-blue-400 mb-4" />
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400">
                                {t('support.contactTitle')}
                            </h3>
                            <p className="text-gray-600 dark:text-gray-400 text-sm">
                                {t('support.contactDesc')}
                            </p>
                        </a>
                    </div>

                    {/* FAQs */}
                    <section>
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                            <MessageSquare className="w-6 h-6 text-emerald-500" />
                            {t('support.faqTitle')}
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
                            {t('support.securityTitle')}
                        </h3>
                        <p className="text-amber-800 dark:text-amber-300 text-sm leading-relaxed mb-3">
                            {t('support.securityDesc')}
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
