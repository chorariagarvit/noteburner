
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { setReferredBy } from '../utils/referrals';
import { useStats } from '../hooks/useStats';

// Page Components
import HeroSection from '../components/home/HeroSection';
import FeaturesSection from '../components/home/FeaturesSection';
import HowItWorksSection from '../components/home/HowItWorksSection';
import StatsSection from '../components/home/StatsSection';
import CTASection from '../components/home/CTASection';
import OnboardingModal from '../components/onboarding/OnboardingModal';

function HomePage() {
  const [searchParams] = useSearchParams();
  const { stats, loading: statsLoading } = useStats(30000); // Refresh every 30s
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    document.title = 'NoteBurner - Home';

    // Handle referral code from URL
    const refCode = searchParams.get('ref');
    if (refCode) {
      setReferredBy(refCode);
    }

    // Check if user has seen onboarding
    const hasSeenOnboarding = localStorage.getItem('noteburner_onboarding_complete');
    if (!hasSeenOnboarding) {
      // Show onboarding after a brief delay for better UX
      setTimeout(() => setShowOnboarding(true), 1000);
    }
  }, [searchParams]);

  const handleOnboardingComplete = () => {
    localStorage.setItem('noteburner_onboarding_complete', 'true');
    setShowOnboarding(false);
  };

  return (
    <div className="min-h-[calc(100vh-8rem)]">
      <HeroSection stats={stats} statsLoading={statsLoading} />
      <FeaturesSection />
      <HowItWorksSection />
      <StatsSection stats={stats} loading={statsLoading} />
      <CTASection />
      
      <OnboardingModal
        isOpen={showOnboarding}
        onClose={() => setShowOnboarding(false)}
        onComplete={handleOnboardingComplete}
      />
    </div>
  );
}

export default HomePage;
