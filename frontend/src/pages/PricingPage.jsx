import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Check, Star, Zap, Shield, Infinity, Crown } from 'lucide-react';
import { useI18n } from '../contexts/I18nContext';
import { useAuth } from '../contexts/AuthContext';

const PLANS = [
  {
    id: 'free',
    name: 'Free',
    price: '$0',
    period: 'forever',
    description: 'For casual users who need basic secure messaging.',
    icon: Shield,
    color: 'gray',
    features: [
      '100MB file uploads',
      'Up to 5 custom URLs',
      'AES-256-GCM encryption',
      'One-time message access',
      '1,000 API calls/day',
      'Community support'
    ],
    cta: 'Get Started',
    ctaLink: '/signup',
    highlighted: false
  },
  {
    id: 'premium',
    name: 'Premium',
    price: '$5',
    period: '/month',
    description: 'For power users who need more storage, features, and support.',
    icon: Star,
    color: 'amber',
    features: [
      '1GB file uploads',
      'Unlimited custom URLs',
      'AES-256-GCM encryption',
      'One-time message access',
      '10,000 API calls/day',
      'Priority support',
      'Advanced analytics',
      'Premium badge',
      'Ad-free experience',
      'Early access to features'
    ],
    cta: 'Start Premium',
    ctaLink: '/premium?plan=premium',
    highlighted: true
  },
  {
    id: 'lifetime',
    name: 'Lifetime',
    price: '$49',
    period: 'one-time',
    description: 'Pay once, use forever. Perfect for early adopters.',
    icon: Crown,
    color: 'purple',
    badge: 'Best Value',
    features: [
      '1GB file uploads',
      'Unlimited custom URLs',
      'AES-256-GCM encryption',
      'One-time message access',
      'Unlimited API calls',
      'Priority support',
      'Advanced analytics',
      'Premium badge',
      'Ad-free experience',
      'All future features',
      'Lifetime updates'
    ],
    cta: 'Get Lifetime Access',
    ctaLink: '/premium?plan=lifetime',
    highlighted: false
  }
];

const COLOR_MAP = {
  gray: {
    header: 'bg-gray-50 dark:bg-gray-800',
    badge: 'bg-gray-100 text-gray-700',
    check: 'text-gray-500',
    button: 'bg-gray-800 hover:bg-gray-700 dark:bg-gray-600 dark:hover:bg-gray-500 text-white'
  },
  amber: {
    header: 'bg-amber-50 dark:bg-amber-900/20',
    badge: 'bg-amber-100 text-amber-800',
    check: 'text-amber-500',
    button: 'bg-amber-500 hover:bg-amber-600 text-white',
    ring: 'ring-2 ring-amber-400'
  },
  purple: {
    header: 'bg-purple-50 dark:bg-purple-900/20',
    badge: 'bg-purple-100 text-purple-800',
    check: 'text-purple-500',
    button: 'bg-purple-600 hover:bg-purple-700 text-white'
  }
};

export default function PricingPage() {
  const { t } = useI18n();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [billing, setBilling] = useState('monthly');

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-16 px-4">
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-4 py-1.5 rounded-full text-sm font-medium mb-4">
            <Star className="w-4 h-4" />
            Week 14 — Premium Features
          </div>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Simple, Transparent Pricing
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Start for free. Upgrade when you need more. No hidden fees, cancel anytime.
          </p>
        </div>

        {/* Plans grid */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          {PLANS.map((plan) => {
            const colors = COLOR_MAP[plan.color];
            const Icon = plan.icon;
            return (
              <div
                key={plan.id}
                className={`relative bg-white dark:bg-gray-800 rounded-2xl shadow-sm overflow-hidden flex flex-col
                  ${plan.highlighted ? `${colors.ring} shadow-lg shadow-amber-100 dark:shadow-amber-900/20` : 'border border-gray-200 dark:border-gray-700'}`}
              >
                {plan.badge && (
                  <div className="absolute top-4 right-4">
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${colors.badge}`}>
                      {plan.badge}
                    </span>
                  </div>
                )}
                {plan.highlighted && (
                  <div className="bg-amber-500 text-white text-center py-1.5 text-xs font-bold uppercase tracking-wide">
                    Most Popular
                  </div>
                )}

                {/* Plan header */}
                <div className={`p-6 ${colors.header}`}>
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`p-2 rounded-lg ${plan.highlighted ? 'bg-amber-100' : plan.id === 'lifetime' ? 'bg-purple-100' : 'bg-gray-100'}`}>
                      <Icon className={`w-5 h-5 ${plan.highlighted ? 'text-amber-600' : plan.id === 'lifetime' ? 'text-purple-600' : 'text-gray-600'}`} />
                    </div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">{plan.name}</h2>
                  </div>
                  <div className="flex items-baseline gap-1 mb-2">
                    <span className="text-4xl font-bold text-gray-900 dark:text-white">{plan.price}</span>
                    <span className="text-gray-500 dark:text-gray-400 text-sm">{plan.period}</span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{plan.description}</p>
                </div>

                {/* Features */}
                <div className="p-6 flex-1">
                  <ul className="space-y-3">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-3">
                        <Check className={`w-5 h-5 mt-0.5 shrink-0 ${colors.check}`} />
                        <span className="text-sm text-gray-700 dark:text-gray-300">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* CTA */}
                <div className="p-6 pt-0">
                  <Link
                    to={isAuthenticated ? plan.ctaLink : (plan.id === 'free' ? '/signup' : `/signup?redirect=${encodeURIComponent(plan.ctaLink)}`)}
                    className={`w-full block text-center py-3 px-6 rounded-xl font-semibold transition-colors ${colors.button}`}
                  >
                    {plan.cta}
                  </Link>
                </div>
              </div>
            );
          })}
        </div>

        {/* Feature comparison */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden mb-16">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Full Feature Comparison</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-700/50">
                  <th className="text-left py-3 px-6 text-sm font-semibold text-gray-600 dark:text-gray-400">Feature</th>
                  <th className="text-center py-3 px-6 text-sm font-semibold text-gray-600 dark:text-gray-400">Free</th>
                  <th className="text-center py-3 px-6 text-sm font-semibold text-amber-600 dark:text-amber-400">Premium</th>
                  <th className="text-center py-3 px-6 text-sm font-semibold text-purple-600 dark:text-purple-400">Lifetime</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {[
                  ['File upload limit', '100MB', '1GB', '1GB'],
                  ['Custom URLs', '5', 'Unlimited', 'Unlimited'],
                  ['API calls/day', '1,000', '10,000', 'Unlimited'],
                  ['Priority support', '✗', '✓', '✓'],
                  ['Advanced analytics', '✗', '✓', '✓'],
                  ['Premium badge', '✗', '✓', '✓'],
                  ['Ad-free experience', '✗', '✓', '✓'],
                  ['Future features', '✗', '✗', '✓'],
                  ['Payment', 'Free', '$5/mo', '$49 once']
                ].map(([feature, free, premium, lifetime]) => (
                  <tr key={feature} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                    <td className="py-3 px-6 text-sm text-gray-700 dark:text-gray-300 font-medium">{feature}</td>
                    <td className="py-3 px-6 text-sm text-center text-gray-600 dark:text-gray-400">{free}</td>
                    <td className="py-3 px-6 text-sm text-center font-semibold text-amber-600 dark:text-amber-400">{premium}</td>
                    <td className="py-3 px-6 text-sm text-center font-semibold text-purple-600 dark:text-purple-400">{lifetime}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* FAQ */}
        <div className="grid md:grid-cols-2 gap-6 mb-16">
          <h2 className="md:col-span-2 text-2xl font-bold text-gray-900 dark:text-white text-center mb-2">
            Frequently Asked Questions
          </h2>
          {[
            ['Is the free plan really free?', 'Yes, forever. No credit card required. The free plan includes all core security features.'],
            ['Can I cancel anytime?', 'Yes, cancel anytime. Your premium access continues until the end of the billing period.'],
            ['What payment methods do you accept?', 'Credit/debit cards via Stripe. Crypto payments (BTC/ETH) are coming soon.'],
            ['Is my data safe?', 'Absolutely. All messages are encrypted client-side with AES-256-GCM before leaving your device. We never see your content.'],
            ['What happens to my messages if I downgrade?', 'Existing messages are unaffected. You just lose access to premium features for new messages.'],
            ['Do you offer refunds?', 'Yes, within 7 days of purchase. For lifetime plans, within 30 days.']
          ].map(([question, answer]) => (
            <div key={question} className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">{question}</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">{answer}</p>
            </div>
          ))}
        </div>

        {/* CTA band */}
        <div className="bg-gradient-to-r from-amber-500 to-orange-500 rounded-2xl p-8 text-center text-white">
          <h2 className="text-2xl font-bold mb-2">Ready to upgrade?</h2>
          <p className="mb-6 opacity-90">Join thousands of users who trust NoteBurner for secure communication.</p>
          <Link
            to={isAuthenticated ? '/premium?plan=premium' : '/signup?redirect=/premium?plan=premium'}
            className="inline-block bg-white text-amber-600 font-bold px-8 py-3 rounded-xl hover:bg-amber-50 transition-colors"
          >
            Start Premium — $5/month
          </Link>
        </div>
      </div>
    </div>
  );
}
