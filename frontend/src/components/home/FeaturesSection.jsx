
import React from 'react';
import PropTypes from 'prop-types';
import { Lock, Flame, Shield, FileImage, Clock, Zap } from 'lucide-react';
import { useI18n } from '../../contexts/I18nContext';

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

function FeaturesSection() {
    const { t } = useI18n();
    return (
        <section className="py-20 bg-white dark:bg-gray-900">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <h2 className="text-3xl font-bold text-center text-gray-900 dark:text-white mb-12">
                    {t('home.features.title')}
                </h2>

                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                    <FeatureCard
                        icon={<Lock className="w-8 h-8" />}
                        title={t('home.features.e2e.title')}
                        description={t('home.features.e2e.desc')}
                    />

                    <FeatureCard
                        icon={<Flame className="w-8 h-8 text-red-600 dark:text-red-500" />}
                        title={t('home.features.oneTime.title')}
                        description={t('home.features.oneTime.desc')}
                    />

                    <FeatureCard
                        icon={<Shield className="w-8 h-8" />}
                        title={t('home.features.noAccount.title')}
                        description={t('home.features.noAccount.desc')}
                    />

                    <FeatureCard
                        icon={<FileImage className="w-8 h-8" />}
                        title={t('home.features.autoExpire.title')}
                        description={t('home.features.autoExpire.desc')}
                    />
                </div>
            </div>
        </section>
    );
}

export default FeaturesSection;
