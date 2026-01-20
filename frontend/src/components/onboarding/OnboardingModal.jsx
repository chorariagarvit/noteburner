import { useState, useEffect } from 'react';
import { X, Lock, Share2, Flame, ChevronRight, ChevronLeft } from 'lucide-react';
import PropTypes from 'prop-types';

const ONBOARDING_STEPS = [
  {
    id: 1,
    title: 'Welcome to NoteBurner 🔥',
    description: 'Send secure, self-destructing messages that vanish after being read. No account required.',
    icon: Flame,
    features: [
      'End-to-end encrypted with AES-256',
      'Messages self-destruct after first view',
      'Zero-knowledge architecture',
      'No tracking, 100% private'
    ]
  },
  {
    id: 2,
    title: 'Create Your First Secret',
    description: 'Type your message, set a password, and choose when it expires. We\'ll generate a secure link.',
    icon: Lock,
    features: [
      'Strong password protection (PBKDF2 300k iterations)',
      'Auto-expire from 1 hour to 7 days',
      'Attach encrypted files up to 10MB',
      'Optional custom URLs'
    ]
  },
  {
    id: 3,
    title: 'Share Securely',
    description: 'Copy the link and share it however you want. Once viewed, the message burns forever.',
    icon: Share2,
    features: [
      'QR codes for easy mobile sharing',
      'One-time access guarantee',
      'Real-time countdown timer',
      'Post-burn confirmation'
    ]
  }
];

function OnboardingModal({ isOpen, onClose, onComplete }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  const step = ONBOARDING_STEPS[currentStep];
  const IconComponent = step.icon;
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === ONBOARDING_STEPS.length - 1;

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const handleNext = () => {
    if (isLastStep) {
      onComplete();
      onClose();
    } else {
      setIsAnimating(true);
      setTimeout(() => {
        setCurrentStep(prev => prev + 1);
        setIsAnimating(false);
      }, 200);
    }
  };

  const handlePrevious = () => {
    if (!isFirstStep) {
      setIsAnimating(true);
      setTimeout(() => {
        setCurrentStep(prev => prev - 1);
        setIsAnimating(false);
      }, 200);
    }
  };

  const handleSkip = () => {
    onComplete();
    onClose();
  };

  if (!isOpen) return null;

  const currentStepData = ONBOARDING_STEPS[currentStep - 1];

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-title"
      aria-describedby="onboarding-description"
    >
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-orange-500 rounded-full flex items-center justify-center">
              <Flame className="w-6 h-6 text-white" aria-hidden="true" />
            </div>
            <h2 id="onboarding-title" className="text-xl font-bold text-gray-900 dark:text-white">
              Getting Started
            </h2>
          </div>
          <button
            onClick={handleSkip}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            aria-label="Close onboarding tutorial"
          >
            <X className="w-5 h-5 text-gray-500 dark:text-gray-400" aria-hidden="true" />
          </button>
        </div>

        {/* Progress bar */}
        <div className="px-6 pt-4">
          <div className="flex gap-2" role="progressbar" aria-valuenow={currentStep} aria-valuemin="1" aria-valuemax={ONBOARDING_STEPS.length} aria-label="Onboarding progress">
            {ONBOARDING_STEPS.map((_, index) => (
              <div
                key={index}
                className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                  index <= currentStep
                    ? 'bg-gradient-to-r from-red-500 to-orange-500'
                    : 'bg-gray-200 dark:bg-gray-700'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Content */}
        <div className={`p-8 transition-opacity duration-200 ${isAnimating ? 'opacity-0' : 'opacity-100'}`}>
          <div className="flex flex-col items-center text-center mb-8">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center mb-6 animate-bounce-slow">
              <IconComponent className="w-10 h-10 text-white" />
            </div>
            <h3 id="onboarding-description" className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
              {step.title}
            </h3>
            <p className="text-gray-600 dark:text-gray-300 text-lg max-w-md">
              {step.description}
            </p>
          </div>

          <div className="space-y-3 mb-8" role="list" aria-label="Key features">
            {step.features.map((feature, index) => (
              <div
                key={index}
                role="listitem"
                className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg animate-fade-in"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5" aria-hidden="true">
                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span className="text-gray-700 dark:text-gray-200 text-sm">
                  {feature}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/30">
          <button
            onClick={handleSkip}
            className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
            aria-label="Skip onboarding tutorial"
          >
            Skip tutorial
          </button>
          <div className="flex items-center gap-3">
            {!isFirstStep && (
              <button
                onClick={handlePrevious}
                className="px-4 py-2 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors flex items-center gap-2"
                aria-label="Go to previous step"
              >
                <ChevronLeft className="w-4 h-4" aria-hidden="true" />
                Previous
              </button>
            )}
            <button
              onClick={handleNext}
              className="px-6 py-2 bg-gradient-to-r from-red-500 to-orange-500 text-white rounded-lg hover:from-red-600 hover:to-orange-600 transition-all flex items-center gap-2 font-medium"
              aria-label={isLastStep ? 'Complete onboarding and get started' : 'Go to next step'}
            >
              {isLastStep ? 'Get Started' : 'Next'}
              {!isLastStep && <ChevronRight className="w-4 h-4" aria-hidden="true" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

OnboardingModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onComplete: PropTypes.func.isRequired
};

export default OnboardingModal;
