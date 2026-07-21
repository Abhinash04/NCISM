import { LandingNav } from '@/components/layout/LandingNav';
import { HeroSection } from './HeroSection';
import { FeaturesSection } from './FeaturesSection';
import { StatsSection } from './StatsSection';
import { CTASection } from './CTASection';
import { Footer } from '@/components/layout/Footer';

export function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#faf9f5]">
      {/* Page Header Menu */}
      <LandingNav />

      {/* Main Sections Wrapper */}
      <main className="flex-1 flex flex-col mt-16 divide-y divide-[#e6dfd8]">
        
        {/* Hero Banner Section */}
        <HeroSection />

        {/* Streamlined Assessment Workflows */}
        <FeaturesSection />

        {/* Core Stats Overview */}
        <StatsSection />

        {/* Action Prompt Banner */}
        <CTASection />

        {/* Dynamic Footer */}
        <Footer />

      </main>
    </div>
  );
}
