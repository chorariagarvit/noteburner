
import React from 'react';
import { AnimatedCounter } from '../AnimatedCounter';

// eslint-disable-next-line react/prop-types
function StatsSection({ stats, loading }) {
    return (
        <section className="py-12 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <h2 className="text-2xl md:text-3xl font-bold text-center text-gray-900 dark:text-white mb-8">
                    Platform Statistics
                </h2>
                {(() => {
                    if (loading) {
                        return <div className="text-center text-gray-500 dark:text-gray-400">Loading statistics...</div>;
                    }

                    if (stats) {
                        return (
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                                <div className="text-center">
                                    <div className="text-3xl md:text-4xl font-bold text-primary-600 dark:text-primary-500 mb-2">
                                        <AnimatedCounter value={stats.all_time?.messages_created || 0} />
                                    </div>
                                    <div className="text-sm text-gray-600 dark:text-gray-400">Messages Created</div>
                                </div>
                                <div className="text-center">
                                    <div className="text-3xl md:text-4xl font-bold text-red-600 dark:text-red-500 mb-2">
                                        <AnimatedCounter value={stats.all_time?.messages_burned || 0} />
                                    </div>
                                    <div className="text-sm text-gray-600 dark:text-gray-400">Messages Burned</div>
                                </div>
                                <div className="text-center">
                                    <div className="text-3xl md:text-4xl font-bold text-green-600 dark:text-green-500 mb-2">
                                        <AnimatedCounter value={stats.all_time?.files_encrypted || 0} />
                                    </div>
                                    <div className="text-sm text-gray-600 dark:text-gray-400">Files Encrypted</div>
                                </div>
                                <div className="text-center">
                                    <div className="text-3xl md:text-4xl font-bold text-blue-600 dark:text-blue-500 mb-2">
                                        {stats.all_time?.avg_file_size
                                            ? `${Math.round(stats.all_time.avg_file_size / 1024 / 1024)}MB`
                                            : '0MB'}
                                    </div>
                                    <div className="text-sm text-gray-600 dark:text-gray-400">Avg File Size</div>
                                </div>
                            </div>
                        );
                    }

                    return (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                            <div className="text-center">
                                <div className="text-3xl md:text-4xl font-bold text-primary-600 dark:text-primary-500 mb-2">0</div>
                                <div className="text-sm text-gray-600 dark:text-gray-400">Messages Created</div>
                            </div>
                            <div className="text-center">
                                <div className="text-3xl md:text-4xl font-bold text-red-600 dark:text-red-500 mb-2">0</div>
                                <div className="text-sm text-gray-600 dark:text-gray-400">Messages Burned</div>
                            </div>
                            <div className="text-center">
                                <div className="text-3xl md:text-4xl font-bold text-green-600 dark:text-green-500 mb-2">0</div>
                                <div className="text-sm text-gray-600 dark:text-gray-400">Files Encrypted</div>
                            </div>
                            <div className="text-center">
                                <div className="text-3xl md:text-4xl font-bold text-blue-600 dark:text-blue-500 mb-2">0MB</div>
                                <div className="text-sm text-gray-600 dark:text-gray-400">Avg File Size</div>
                            </div>
                        </div>
                    );
                })()}
            </div>
        </section>
    );
}

export default StatsSection;
