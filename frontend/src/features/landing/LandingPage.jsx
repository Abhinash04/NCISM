import { LandingNav } from '@/components/layout/LandingNav';
import { HeroSection } from './HeroSection';
import { SystemsStrip } from './SystemsStrip';
import { ProblemSolution } from './ProblemSolution';
import { FeaturesSection } from './FeaturesSection';
import { StatsSection } from './StatsSection';
import { FAQSection } from './FAQSection';
import { CTASection } from './CTASection';
import { Footer } from '@/components/layout/Footer';

export function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Page Header Menu */}
      <LandingNav />

      {/* Main Sections Wrapper */}
      <main className="flex-1 flex flex-col mt-16">

        {/* Hero Banner Section */}
        <HeroSection />

        {/* Recognized Systems Strip */}
        <SystemsStrip />

        {/* Problem / Solution */}
        <ProblemSolution />

        {/* Streamlined Assessment Workflows */}
        <FeaturesSection />

        {/* Core Stats Overview */}
        <StatsSection />

        {/* Frequently Asked Questions */}
        <FAQSection />

        {/* Action Prompt Banner */}
        <CTASection />

        {/* Dynamic Footer */}
        <Footer />

      </main>
    </div>
  );
}
