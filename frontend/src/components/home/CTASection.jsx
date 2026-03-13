
import React from 'react';
import { useI18n } from '../../contexts/I18nContext';

function CTASection() {
    const { t } = useI18n();
    return (
        <section className="py-20 bg-primary-600 dark:bg-primary-700">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                <h2 className="text-4xl font-bold text-white mb-6">
                    {t('home.cta.title')}
                </h2>
                <p className="text-xl text-primary-100 dark:text-primary-200 mb-8">
                    {t('home.cta.subtitle')}
                </p>
                <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="bg-white dark:bg-gray-100 text-primary-600 dark:text-primary-700 hover:bg-gray-100 dark:hover:bg-gray-200 font-semibold py-4 px-8 rounded-lg text-lg transition-all duration-200 inline-block shadow-lg">
                    {t('home.cta.button')}
                </button>
            </div>
        </section>
    );
}

export default CTASection;
