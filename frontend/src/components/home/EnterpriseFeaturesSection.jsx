import React from 'react';
import { Link } from 'react-router-dom';
import { Users, Key, Palette, FileCheck, Shield, Briefcase } from 'lucide-react';

function EnterpriseFeatureCard({ icon, title, description, link }) {
    return (
        <div className="card hover:shadow-xl transition-all duration-200 group">
            <div className="text-primary-600 dark:text-primary-500 mb-4 group-hover:scale-110 transition-transform duration-200">
                {icon}
            </div>
            <h3 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">{title}</h3>
            <p className="text-gray-600 dark:text-gray-300 mb-4">{description}</p>
            {link && (
                <Link 
                    to={link} 
                    className="text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 text-sm font-medium inline-flex items-center gap-1"
                >
                    Learn more →
                </Link>
            )}
        </div>
    );
}

function EnterpriseFeaturesSection() {
    return (
        <section className="py-20 bg-gradient-to-b from-gray-50 to-white dark:from-gray-800 dark:to-gray-900">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center mb-12">
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary-100 dark:bg-primary-900 rounded-full mb-4">
                        <Briefcase className="w-4 h-4 text-primary-600 dark:text-primary-400" />
                        <span className="text-sm font-semibold text-primary-700 dark:text-primary-300">
                            NEW: Enterprise Features
                        </span>
                    </div>
                    <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
                        Built for Teams & Organizations
                    </h2>
                    <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
                        Take your secure messaging to the next level with advanced collaboration, 
                        branding, and compliance features.
                    </p>
                </div>

                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                    <EnterpriseFeatureCard
                        icon={<Users className="w-8 h-8" />}
                        title="Team Workspaces"
                        description="Create teams with role-based access control. Collaborate securely with admins, members, and viewers."
                        link="/teams/new"
                    />

                    <EnterpriseFeatureCard
                        icon={<Key className="w-8 h-8" />}
                        title="API Key Management"
                        description="Programmatic access with custom rate limits. Integrate NoteBurner into your workflows and applications."
                        link="/api-keys"
                    />

                    <EnterpriseFeatureCard
                        icon={<Palette className="w-8 h-8" />}
                        title="Custom Branding"
                        description="White-label mode with custom logos, colors, and footer. Make NoteBurner truly yours."
                    />

                    <EnterpriseFeatureCard
                        icon={<FileCheck className="w-8 h-8" />}
                        title="GDPR Compliance"
                        description="Configurable data retention, audit log exports, and right to deletion. Stay compliant effortlessly."
                    />

                    <EnterpriseFeatureCard
                        icon={<Shield className="w-8 h-8" />}
                        title="Advanced Security"
                        description="Self-destruct options, password strength meters, audit logging, and suspicious activity detection."
                    />

                    <EnterpriseFeatureCard
                        icon={<Briefcase className="w-8 h-8" />}
                        title="Enterprise Plans"
                        description="Dedicated support, custom integrations, and unlimited team members for large organizations."
                    />
                </div>

                <div className="mt-12 text-center">
                    <Link 
                        to="/teams/new" 
                        className="btn-primary inline-flex items-center gap-2 px-8 py-3 text-lg"
                    >
                        <Users className="w-5 h-5" />
                        Create Your Team Workspace
                    </Link>
                </div>
            </div>
        </section>
    );
}

export default EnterpriseFeaturesSection;
