
import React, { useEffect } from 'react';
import { Shield, Lock, FileText, CheckCircle, XCircle } from 'lucide-react';
import { useI18n } from '../contexts/I18nContext';

function PrivacyPolicy() {
    const { t } = useI18n();

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
                            {t('privacy.title')}
                        </h1>
                        <p className="text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
                            {t('privacy.subtitle')}
                        </p>
                        <div className="mt-4 inline-block px-4 py-1 bg-gray-100 dark:bg-gray-800 rounded-full text-sm text-gray-500 dark:text-gray-400">
                            {t('privacy.lastUpdated')}
                        </div>
                    </div>

                    <div className="prose dark:prose-invert max-w-none space-y-8">
                        {/* Overview */}
                        <section>
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                                <FileText className="w-6 h-6 text-blue-500" />
                                {t('privacy.overviewTitle')}
                            </h2>
                            <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                                {t('privacy.overviewText')}
                            </p>
                        </section>

                        {/* What we collect */}
                        <section className="grid md:grid-cols-2 gap-8">
                            <div className="bg-red-50 dark:bg-red-900/10 p-6 rounded-xl border border-red-100 dark:border-red-900/30">
                                <h3 className="text-xl font-semibold text-red-700 dark:text-red-400 mb-4 flex items-center gap-2">
                                    <XCircle className="w-5 h-5" />
                                    {t('privacy.doNotCollectTitle')}
                                </h3>
                                <ul className="space-y-3">
                                    {[
                                        t('privacy.doNotCollect1'),
                                        t('privacy.doNotCollect2'),
                                        t('privacy.doNotCollect3'),
                                        t('privacy.doNotCollect4'),
                                        t('privacy.doNotCollect5'),
                                        t('privacy.doNotCollect6')
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
                                    {t('privacy.onlyReceiveTitle')}
                                </h3>
                                <ul className="space-y-3">
                                    {[
                                        t('privacy.onlyReceive1'),
                                        t('privacy.onlyReceive2'),
                                        t('privacy.onlyReceive3'),
                                        t('privacy.onlyReceive4')
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
                                {t('privacy.encryptionTitle')}
                            </h2>
                            <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-xl border border-gray-100 dark:border-gray-700">
                                <ul className="space-y-4">
                                    <li className="flex gap-4">
                                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-purple-600 dark:text-purple-400 font-bold">1</div>
                                        <div>
                                            <h4 className="font-semibold text-gray-900 dark:text-white">{t('privacy.enc1Title')}</h4>
                                            <p className="text-gray-600 dark:text-gray-300 text-sm mt-1">
                                                {t('privacy.enc1Desc')}
                                            </p>
                                        </div>
                                    </li>
                                    <li className="flex gap-4">
                                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-purple-600 dark:text-purple-400 font-bold">2</div>
                                        <div>
                                            <h4 className="font-semibold text-gray-900 dark:text-white">{t('privacy.enc2Title')}</h4>
                                            <p className="text-gray-600 dark:text-gray-300 text-sm mt-1">
                                                {t('privacy.enc2Desc')}
                                            </p>
                                        </div>
                                    </li>
                                    <li className="flex gap-4">
                                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-purple-600 dark:text-purple-400 font-bold">3</div>
                                        <div>
                                            <h4 className="font-semibold text-gray-900 dark:text-white">{t('privacy.enc3Title')}</h4>
                                            <p className="text-gray-600 dark:text-gray-300 text-sm mt-1">
                                                {t('privacy.enc3Desc')}
                                            </p>
                                        </div>
                                    </li>
                                </ul>
                            </div>
                        </section>

                        {/* Data Retention */}
                        <section>
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                                {t('privacy.retentionTitle')}
                            </h2>
                            <p className="text-gray-600 dark:text-gray-300 mb-4">
                                {t('privacy.retentionDesc')}
                            </p>
                            <ul className="list-disc pl-5 space-y-2 text-gray-600 dark:text-gray-300">
                                <li>{t('privacy.retentionItem1')}</li>
                                <li>{t('privacy.retentionItem2')}</li>
                                <li>{t('privacy.retentionItem3')}</li>
                            </ul>
                        </section>

                        {/* Contact */}
                        <section className="bg-blue-50 dark:bg-blue-900/20 p-6 rounded-xl">
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                                {t('privacy.questionsTitle')}
                            </h2>
                            <p className="text-gray-600 dark:text-gray-300 mb-4">
                                {t('privacy.questionsDesc')}
                            </p>
                            <div className="flex flex-wrap gap-4">
                                <a href="mailto:privacy@noteburner.work" className="text-blue-600 dark:text-blue-400 hover:underline">
                                    privacy@noteburner.work
                                </a>
                                <a href="https://github.com/chorariagarvit/noteburner" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">
                                    {t('privacy.sourceCode')}
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
