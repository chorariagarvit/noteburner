
import React from 'react';

function CTASection() {
    return (
        <section className="py-20 bg-primary-600 dark:bg-primary-700">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                <h2 className="text-4xl font-bold text-white mb-6">
                    Ready to Send a Secure Message?
                </h2>
                <p className="text-xl text-primary-100 dark:text-primary-200 mb-8">
                    Free, anonymous, and completely secure. No registration required.
                </p>
                <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="bg-white dark:bg-gray-100 text-primary-600 dark:text-primary-700 hover:bg-gray-100 dark:hover:bg-gray-200 font-semibold py-4 px-8 rounded-lg text-lg transition-all duration-200 inline-block shadow-lg">
                    Create Message Now
                </button>
            </div>
        </section>
    );
}

export default CTASection;
