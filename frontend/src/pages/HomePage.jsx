
import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { setReferredBy } from '../utils/referrals';
import { useStats } from '../hooks/useStats';

// Page Components
import HeroSection from '../components/home/HeroSection';
import FeaturesSection from '../components/home/FeaturesSection';
import HowItWorksSection from '../components/home/HowItWorksSection';
import StatsSection from '../components/home/StatsSection';
import CTASection from '../components/home/CTASection';

function HomePage() {
  const [searchParams] = useSearchParams();
  const { stats, loading: statsLoading } = useStats(30000); // Refresh every 30s

  useEffect(() => {
    document.title = 'NoteBurner - Home';

    // Handle referral code from URL
    const refCode = searchParams.get('ref');
    if (refCode) {
      setReferredBy(refCode);
    }
  }, [searchParams]);

  return (
    <div className="min-h-[calc(100vh-8rem)]">
      <HeroSection stats={stats} statsLoading={statsLoading} />
      <FeaturesSection />
      <HowItWorksSection />
      <StatsSection stats={stats} loading={statsLoading} />
      <CTASection />
    </div>
  );
}

export default HomePage;
