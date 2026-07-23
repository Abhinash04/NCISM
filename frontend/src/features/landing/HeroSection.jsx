import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import heroIllustration from '@/assets/Gemini_Generated_Image_xsfkl9xsfkl9xsfk.png';

export function HeroSection() {
  const navigate = useNavigate();

  return (
    <section className="relative w-full bg-background border-b-2 border-foreground px-4 md:px-8 py-16 md:py-32 overflow-hidden min-h-[480px] min-[769px]:min-h-[600px] flex items-center">
      {/* Background illustration — desktop only (hidden below 769px per responsive spec). */}
      <div className="absolute right-0 bottom-0 top-0 hidden min-[769px]:flex w-[70%] lg:w-[65%] xl:w-[60%] items-end justify-end pointer-events-none select-none z-0 overflow-hidden pr-4 pb-4 md:pr-12 md:pb-8">
        <img
          src={heroIllustration}
          alt=""
          aria-hidden="true"
          className="w-auto h-auto max-h-[85%] md:max-h-[90%] object-contain object-right-bottom"
        />
      </div>

      <div className="max-w-[1200px] mx-auto w-full relative z-10 grid grid-cols-1 min-[769px]:grid-cols-2 gap-12 items-center">

        {/* Copy + CTAs */}
        <div className="space-y-5 md:space-y-7 flex flex-col items-start text-left max-w-[600px] animate-in fade-in slide-in-from-bottom-3 duration-500 motion-reduce:animate-none">
          <span className="inline-flex items-center gap-2 rounded-full border-2 border-foreground bg-card px-4 py-1.5 font-sans text-xs font-medium text-foreground shadow-[3px_3px_0px_hsl(var(--foreground))] -rotate-1">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            Medical Assessment &amp; Rating Board · NCISM
          </span>
          <h1 className="font-serif text-[34px] md:text-[48px] font-normal text-foreground tracking-tight leading-[1.08] text-balance">
            Medical Assessment and Rating Board for Indian System of Medicine
          </h1>
          <p className="font-sans text-base md:text-lg text-muted-foreground leading-relaxed max-w-[520px]">
            Automated compliance assessment, document processing, and board review workflows for Ayurveda, Unani, Siddha and Sowa-Rigpa medical institutions.
          </p>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto pt-1">
            <button
              onClick={() => navigate('/register')}
              className="h-12 px-6 bg-primary text-primary-foreground rounded-full border-2 border-foreground font-sans text-sm font-semibold tracking-wide shadow-[6px_6px_0px_hsl(var(--foreground))] flex items-center justify-center gap-1.5 transition-all duration-150 ease-out hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[3px_3px_0px_hsl(var(--foreground))] active:translate-x-[3px] active:translate-y-[3px] motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              Start Assessment <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
              className="h-12 px-6 bg-background border-2 border-foreground text-foreground rounded-full font-sans text-sm font-semibold tracking-wide shadow-[6px_6px_0px_hsl(var(--foreground))] transition-all duration-150 ease-out hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[3px_3px_0px_hsl(var(--foreground))] active:translate-x-[3px] active:translate-y-[3px] motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background flex items-center justify-center"
            >
              Learn More
            </button>
          </div>
        </div>

        {/* Spacer column keeps the copy in the left half while the illustration fills the right (desktop only). */}
        <div className="hidden min-[769px]:block h-[450px]" aria-hidden="true" />

      </div>
    </section>
  );
}
