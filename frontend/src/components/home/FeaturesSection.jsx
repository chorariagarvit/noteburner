
import React from 'react';
import PropTypes from 'prop-types';
import { Lock, Flame, Shield, FileImage, Clock, Zap } from 'lucide-react';

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
    return (
        <section className="py-20 bg-white dark:bg-gray-900">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <h2 className="text-3xl font-bold text-center text-gray-900 dark:text-white mb-12">
                    Military-Grade Security
                </h2>

                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                    <FeatureCard
                        icon={<Lock className="w-8 h-8" />}
                        title="Client-Side Encryption"
                        description="AES-256-GCM encryption happens in your browser. Your password never leaves your device."
                    />

                    <FeatureCard
                        icon={<Flame className="w-8 h-8 text-red-600 dark:text-red-500" />}
                        title="One-Time Access"
                        description="Messages are permanently deleted after the first successful decryption. No backups, no recovery."
                    />

                    <FeatureCard
                        icon={<Shield className="w-8 h-8" />}
                        title="Password Protected"
                        description="PBKDF2 key derivation ensures strong password-based security. Only you and the recipient can decrypt."
                    />

                    <FeatureCard
                        icon={<FileImage className="w-8 h-8" />}
                        title="Media Support"
                        description="Encrypt and share images, documents, and files up to 100MB. All encrypted end-to-end."
                    />

                    <FeatureCard
                        icon={<Clock className="w-8 h-8" />}
                        title="Auto-Expiration"
                        description="Set optional time limits. Messages automatically delete after expiration, even if unread."
                    />

                    <FeatureCard
                        icon={<Zap className="w-8 h-8" />}
                        title="Lightning Fast"
                        description="Powered by Cloudflare's global network. Instant encryption, decryption, and delivery worldwide."
                    />
                </div>
            </div>
        </section>
    );
}

export default FeaturesSection;
