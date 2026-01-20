import PropTypes from 'prop-types';

export function SkeletonText({ className = '', width = 'full' }) {
  const widthClasses = {
    full: 'w-full',
    '3/4': 'w-3/4',
    '1/2': 'w-1/2',
    '1/3': 'w-1/3',
    '1/4': 'w-1/4'
  };

  return (
    <div className={`h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse ${widthClasses[width]} ${className}`} />
  );
}

SkeletonText.propTypes = {
  className: PropTypes.string,
  width: PropTypes.oneOf(['full', '3/4', '1/2', '1/3', '1/4'])
};

export function SkeletonCard({ className = '' }) {
  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 ${className}`}>
      <div className="animate-pulse space-y-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-full" />
          <div className="flex-1 space-y-2">
            <SkeletonText width="3/4" />
            <SkeletonText width="1/2" />
          </div>
        </div>
        <div className="space-y-2">
          <SkeletonText />
          <SkeletonText width="3/4" />
        </div>
      </div>
    </div>
  );
}

SkeletonCard.propTypes = {
  className: PropTypes.string
};

export function SkeletonButton({ className = '' }) {
  return (
    <div className={`h-10 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse ${className}`} />
  );
}

SkeletonButton.propTypes = {
  className: PropTypes.string
};

export function SkeletonInput({ className = '' }) {
  return (
    <div className={`h-12 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse ${className}`} />
  );
}

SkeletonInput.propTypes = {
  className: PropTypes.string
};

export function SkeletonAvatar({ size = 'md', className = '' }) {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
    xl: 'w-24 h-24'
  };

  return (
    <div className={`${sizeClasses[size]} bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse ${className}`} />
  );
}

SkeletonAvatar.propTypes = {
  size: PropTypes.oneOf(['sm', 'md', 'lg', 'xl']),
  className: PropTypes.string
};

export function MessageFormSkeleton() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 space-y-6 animate-pulse">
        {/* Title */}
        <div className="space-y-2">
          <SkeletonText width="1/2" className="h-8" />
          <SkeletonText width="3/4" className="h-4" />
        </div>

        {/* Message field */}
        <div className="space-y-2">
          <SkeletonText width="1/4" />
          <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded-lg" />
        </div>

        {/* Password field */}
        <div className="space-y-2">
          <SkeletonText width="1/4" />
          <SkeletonInput />
        </div>

        {/* Expiration */}
        <div className="space-y-2">
          <SkeletonText width="1/3" />
          <SkeletonInput className="h-10" />
        </div>

        {/* Button */}
        <SkeletonButton className="w-full h-12" />
      </div>
    </div>
  );
}

export function MessageViewSkeleton() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 space-y-6 animate-pulse">
        {/* Icon */}
        <div className="flex justify-center">
          <SkeletonAvatar size="xl" />
        </div>

        {/* Title */}
        <div className="space-y-2 text-center">
          <SkeletonText width="3/4" className="h-8 mx-auto" />
          <SkeletonText width="1/2" className="mx-auto" />
        </div>

        {/* Password field */}
        <div className="space-y-2">
          <SkeletonText width="1/4" />
          <SkeletonInput />
        </div>

        {/* Button */}
        <SkeletonButton className="w-full h-12" />

        {/* Info cards */}
        <div className="grid grid-cols-2 gap-4 mt-6">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </div>
    </div>
  );
}

export function StatsCardSkeleton() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 animate-pulse">
      <div className="space-y-3">
        <SkeletonAvatar size="md" />
        <SkeletonText width="3/4" className="h-6" />
        <SkeletonText width="1/2" />
      </div>
    </div>
  );
}

export default {
  SkeletonText,
  SkeletonCard,
  SkeletonButton,
  SkeletonInput,
  SkeletonAvatar,
  MessageFormSkeleton,
  MessageViewSkeleton,
  StatsCardSkeleton
};
