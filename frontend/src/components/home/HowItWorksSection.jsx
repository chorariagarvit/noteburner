
import React from 'react';
import PropTypes from 'prop-types';

function StepCard({ number, title, description }) {
    return (
        <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary-600 dark:bg-primary-500 text-white text-2xl font-bold mb-4">
                {number}
            </div>
            <h3 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">{title}</h3>
            <p className="text-gray-600 dark:text-gray-300">{description}</p>
        </div>
    );
}

StepCard.propTypes = {
    number: PropTypes.string.isRequired,
    title: PropTypes.string.isRequired,
    description: PropTypes.string.isRequired,
};

function HowItWorksSection() {
    return (
        <section className="py-20 bg-gray-50 dark:bg-gray-800">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <h2 className="text-3xl font-bold text-center text-gray-900 dark:text-white mb-12">
                    How It Works
                </h2>

                <div className="grid md:grid-cols-3 gap-8">
                    <StepCard
                        number="1"
                        title="Create & Encrypt"
                        description="Write your message, set a password. Everything is encrypted in your browser before being sent."
                    />

                    <StepCard
                        number="2"
                        title="Share Link"
                        description="Get a unique shareable link. Send it along with the password (separately!) to your recipient."
                    />

                    <StepCard
                        number="3"
                        title="Read & Burn"
                        description="Recipient enters password to decrypt and read once. Message is permanently deleted immediately."
                    />
                </div>
            </div>
        </section>
    );
}

export default HowItWorksSection;
