import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Star, Crown, Shield, Check, AlertCircle, Loader2, CreditCard, Bitcoin, Zap } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useI18n } from '../contexts/I18nContext';

const API_BASE = import.meta.env.VITE_API_URL || '';

const PLAN_META = {
  free:     { icon: Shield, color: 'gray',   label: 'Free Plan' },
  premium:  { icon: Star,   color: 'amber',  label: 'Premium Plan' },
  lifetime: { icon: Crown,  color: 'purple', label: 'Lifetime Plan' }
};

export default function PremiumPage() {
  const { isAuthenticated, user, token } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const planParam = searchParams.get('plan');

  const [status, setStatus]     = useState(null);
  const [usage, setUsage]       = useState(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);
  const [subscribing, setSubscribing] = useState(false);
  const [canceling, setCanceling]     = useState(false);
  const [success, setSuccess]   = useState(null);
  const [payMethod, setPayMethod] = useState('stripe');

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login?redirect=/premium' + (planParam ? `?plan=${planParam}` : ''));
    }
  }, [isAuthenticated, navigate, planParam]);

  useEffect(() => {
    if (!isAuthenticated) return;
    fetchStatus();
    fetchUsage();
  }, [isAuthenticated, token]);

  async function fetchStatus() {
    try {
      const res = await fetch(`${API_BASE}/api/premium/status`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const json = await res.json();
      setStatus(json);
    } catch (e) {
      setError('Failed to load premium status.');
    } finally {
      setLoading(false);
    }
  }

  async function fetchUsage() {
    try {
      const res = await fetch(`${API_BASE}/api/premium/usage`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const json = await res.json();
      setUsage(json.usage);
    } catch (e) {
      // Usage is non-critical, ignore errors
    }
  }

  async function handleSubscribe(planId) {
    if (!planId) return;
    setSubscribing(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/premium/subscribe`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ planId, paymentMethod: payMethod })
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Subscription failed');
      }
      setSuccess(`Successfully subscribed to ${planId} plan!`);
      fetchStatus();
      fetchUsage();
    } catch (e) {
      setError(e.message);
    } finally {
      setSubscribing(false);
    }
  }

  async function handleCancel() {
    if (!confirm('Cancel your premium subscription? You will keep access until the end of the billing period.')) return;
    setCanceling(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/premium/cancel`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Cancellation failed');
      setSuccess('Subscription cancelled. Access continues until end of billing period.');
      fetchStatus();
    } catch (e) {
      setError(e.message);
    } finally {
      setCanceling(false);
    }
  }

  if (!isAuthenticated) return null;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="flex items-center gap-3 text-gray-600 dark:text-gray-400">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span>Loading your premium status…</span>
        </div>
      </div>
    );
  }

  const currentPlanId = status?.subscription?.plan_id || 'free';
  const meta = PLAN_META[currentPlanId] || PLAN_META.free;
  const PlanIcon = meta.icon;
  const isActive = status?.subscription?.status === 'active';
  const isPremiumOrLifetime = currentPlanId !== 'free' && isActive;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4">
      <div className="max-w-3xl mx-auto space-y-8">

        {/* Breadcrumb */}
        <div className="text-sm text-gray-500 dark:text-gray-400">
          <Link to="/pricing" className="hover:text-amber-500 transition-colors">Pricing</Link>
          <span className="mx-2">/</span>
          <span>Premium</span>
        </div>

        {/* Success banner */}
        {success && (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-xl p-4 flex items-start gap-3">
            <Check className="w-5 h-5 text-green-600 dark:text-green-400 shrink-0 mt-0.5" />
            <p className="text-sm text-green-800 dark:text-green-300">{success}</p>
          </div>
        )}

        {/* Error banner */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-xl p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
            <p className="text-sm text-red-800 dark:text-red-300">{error}</p>
          </div>
        )}

        {/* Current plan card */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Your Subscription</h1>

          <div className="flex items-center gap-4 mb-6">
            <div className={`p-3 rounded-xl ${
              currentPlanId === 'premium' ? 'bg-amber-100 dark:bg-amber-900/30' :
              currentPlanId === 'lifetime' ? 'bg-purple-100 dark:bg-purple-900/30' :
              'bg-gray-100 dark:bg-gray-700'
            }`}>
              <PlanIcon className={`w-7 h-7 ${
                currentPlanId === 'premium' ? 'text-amber-600' :
                currentPlanId === 'lifetime' ? 'text-purple-600' :
                'text-gray-600 dark:text-gray-400'
              }`} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-semibold text-gray-900 dark:text-white">{meta.label}</span>
                {isActive && currentPlanId !== 'free' && (
                  <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-2 py-0.5 rounded-full font-medium">
                    Active
                  </span>
                )}
              </div>
              {status?.subscription?.expires_at && (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {currentPlanId === 'lifetime' ? 'Never expires' : `Renews ${new Date(status.subscription.expires_at).toLocaleDateString()}`}
                </p>
              )}
            </div>
          </div>

          {/* Plan limits */}
          {status?.plan && (
            <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl mb-6 text-center">
              <div>
                <div className="text-lg font-bold text-gray-900 dark:text-white">
                  {status.plan.file_size_limit >= 1073741824 ? '1GB' : '100MB'}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">File limit</div>
              </div>
              <div>
                <div className="text-lg font-bold text-gray-900 dark:text-white">
                  {status.plan.custom_urls_limit === -1 ? '∞' : status.plan.custom_urls_limit}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Custom URLs</div>
              </div>
              <div>
                <div className="text-lg font-bold text-gray-900 dark:text-white">
                  {status.plan.api_calls_limit === -1 ? '∞' : (status.plan.api_calls_limit / 1000).toFixed(0) + 'k'}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">API calls/day</div>
              </div>
            </div>
          )}

          {/* Cancel button */}
          {isPremiumOrLifetime && currentPlanId !== 'lifetime' && (
            <button
              onClick={handleCancel}
              disabled={canceling}
              className="text-sm text-gray-500 hover:text-red-500 transition-colors disabled:opacity-50"
            >
              {canceling ? 'Cancelling…' : 'Cancel subscription'}
            </button>
          )}
        </div>

        {/* Usage card */}
        {usage && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">This Month's Usage</h2>
            <div className="space-y-4">
              <UsageBar
                label="Messages created"
                used={usage.messages_created}
                limit={usage.limits?.messages_per_month || 1000}
                unit="messages"
              />
              <UsageBar
                label="Storage used"
                used={usage.storage_used}
                limit={usage.limits?.storage_limit || 104857600}
                unit="bytes"
                format="bytes"
              />
              <UsageBar
                label="API calls"
                used={usage.api_calls}
                limit={usage.limits?.api_calls_per_day || 1000}
                unit="calls"
              />
            </div>
          </div>
        )}

        {/* Upgrade section — only shown for free users */}
        {!isPremiumOrLifetime && (
          <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 rounded-2xl border border-amber-200 dark:border-amber-700 p-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Upgrade to Premium</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Unlock 1GB uploads, unlimited custom URLs, and priority support.
            </p>

            {/* Payment method */}
            <div className="mb-6">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Payment method</p>
              <div className="flex gap-3">
                <button
                  onClick={() => setPayMethod('stripe')}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-colors ${
                    payMethod === 'stripe'
                      ? 'bg-amber-500 border-amber-500 text-white'
                      : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  <CreditCard className="w-4 h-4" />
                  Card (Stripe)
                </button>
                <button
                  onClick={() => setPayMethod('crypto')}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-colors ${
                    payMethod === 'crypto'
                      ? 'bg-orange-500 border-orange-500 text-white'
                      : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  <Bitcoin className="w-4 h-4" />
                  Crypto
                </button>
              </div>
            </div>

            {payMethod === 'crypto' && (
              <div className="mb-6 p-4 bg-orange-50 dark:bg-orange-900/20 rounded-xl border border-orange-200 dark:border-orange-700">
                <p className="text-sm text-orange-800 dark:text-orange-300 font-medium mb-1">Crypto payments coming soon!</p>
                <p className="text-xs text-orange-700 dark:text-orange-400">
                  Bitcoin and Ethereum payments are in development. Use Stripe for now.
                </p>
              </div>
            )}

            <div className="grid sm:grid-cols-2 gap-4">
              <button
                onClick={() => handleSubscribe(planParam === 'lifetime' ? 'lifetime' : 'premium')}
                disabled={subscribing || payMethod === 'crypto'}
                className="flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 px-6 rounded-xl transition-colors"
              >
                {subscribing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                {subscribing ? 'Processing…' : 'Subscribe — $5/month'}
              </button>
              <button
                onClick={() => handleSubscribe('lifetime')}
                disabled={subscribing || payMethod === 'crypto'}
                className="flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 px-6 rounded-xl transition-colors"
              >
                {subscribing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Crown className="w-4 h-4" />}
                {subscribing ? 'Processing…' : 'Lifetime — $49'}
              </button>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-3 text-center">
              Secure payment via Stripe. Cancel anytime. See our <Link to="/pricing" className="underline hover:text-amber-500">pricing page</Link> for details.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function UsageBar({ label, used, limit, unit, format }) {
  const pct = limit > 0 ? Math.min((used / limit) * 100, 100) : 0;
  const isNearLimit = pct >= 80;
  const isAtLimit = pct >= 100;

  return (
    <div>
      <div className="flex justify-between text-sm mb-1.5">
        <span className="text-gray-700 dark:text-gray-300">{label}</span>
        <span className={`font-medium ${isAtLimit ? 'text-red-600' : isNearLimit ? 'text-amber-600' : 'text-gray-600 dark:text-gray-400'}`}>
          {format === 'bytes' ? formatBytes(used) : used.toLocaleString()} / {format === 'bytes' ? formatBytes(limit) : limit.toLocaleString()} {format !== 'bytes' ? unit : ''}
        </span>
      </div>
      <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${isAtLimit ? 'bg-red-500' : isNearLimit ? 'bg-amber-500' : 'bg-green-500'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
