import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import heroIllustration from '@/assets/Gemini_Generated_Image_xsfkl9xsfkl9xsfk.png';

export function HeroSection() {
  const navigate = useNavigate();

  return (
    <section className="relative w-full bg-[#faf9f5] py-20 md:py-32 px-4 md:px-8 overflow-hidden min-h-[600px] flex items-center">
      {/* Background illustration scaled and padded to fit cleanly inside viewport */}
      <div className="absolute right-0 bottom-0 top-0 w-full md:w-[70%] lg:w-[65%] xl:w-[60%] flex items-end justify-end pointer-events-none select-none z-0 overflow-hidden pr-4 pb-4 md:pr-12 md:pb-8">
        <img 
          src={heroIllustration} 
          alt="NCISM Assessment Workflow Background" 
          className="w-auto h-auto max-h-[85%] md:max-h-[90%] object-contain object-right-bottom"
        />
      </div>

      <div className="max-w-[1200px] mx-auto w-full relative z-10 grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
        
        {/* Left Column (Copy and Call to Action) */}
        <div className="space-y-6 md:space-y-8 flex flex-col items-start text-left max-w-[560px]">
          <h1 className="font-serif text-[32px] md:text-[48px] font-normal text-[#141413] tracking-tight leading-[1.1] select-none">
            Medical Assessment and Rating Board for Indian System of Medicine
          </h1>
          <p className="font-sans text-base md:text-lg text-[#3d3d3a] leading-relaxed">
            Automated compliance assessment, document processing, and board review workflows for Ayurvedic medical institutions.
          </p>
          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
            <button
              onClick={() => navigate('/register')}
              className="w-full sm:w-auto h-11 px-6 bg-[#cc785c] hover:bg-[#a9583e] text-white rounded-[8px] font-sans text-sm font-semibold tracking-wide transition-colors duration-150 flex items-center justify-center gap-1.5 shadow-sm"
            >
              Start Assessment <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                const element = document.getElementById('features');
                element?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="w-full sm:w-auto h-11 px-6 bg-[#faf9f5] border border-[#e6dfd8] text-[#141413] hover:bg-[#efe9de] rounded-[8px] font-sans text-sm font-semibold tracking-wide transition-colors duration-150 flex items-center justify-center"
            >
              Learn More
            </button>
          </div>
        </div>

        {/* Right Column (Empty spacer column to let background illustration show on desktop) */}
        <div className="hidden md:block h-[450px]" />

      </div>
    </section>
  );
}
