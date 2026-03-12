import React from 'react';
import { Star, Crown } from 'lucide-react';

/**
 * Small badge shown next to username when user has a premium subscription.
 * Usage: <PremiumBadge plan="premium" /> or <PremiumBadge plan="lifetime" />
 */
export default function PremiumBadge({ plan = 'premium', size = 'sm', showLabel = false }) {
  if (!plan || plan === 'free') return null;

  const isLifetime = plan === 'lifetime';

  const sizes = {
    xs: { icon: 'w-3 h-3', text: 'text-xs', wrapper: 'px-1.5 py-0.5 gap-1' },
    sm: { icon: 'w-3.5 h-3.5', text: 'text-xs', wrapper: 'px-2 py-0.5 gap-1' },
    md: { icon: 'w-4 h-4', text: 'text-sm', wrapper: 'px-2.5 py-1 gap-1.5' }
  };

  const s = sizes[size] || sizes.sm;

  if (isLifetime) {
    return (
      <span
        title="Lifetime Member"
        className={`inline-flex items-center rounded-full font-semibold bg-gradient-to-r from-purple-500 to-purple-700 text-white ${s.wrapper}`}
      >
        <Crown className={s.icon} />
        {showLabel && <span className={s.text}>Lifetime</span>}
      </span>
    );
  }

  return (
    <span
      title="Premium Member"
      className={`inline-flex items-center rounded-full font-semibold bg-gradient-to-r from-amber-400 to-amber-600 text-white ${s.wrapper}`}
    >
      <Star className={s.icon} />
      {showLabel && <span className={s.text}>Premium</span>}
    </span>
  );
}
