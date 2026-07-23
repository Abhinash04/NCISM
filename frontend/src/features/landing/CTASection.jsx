import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

export function CTASection() {
  const navigate = useNavigate();

  return (
    <section className="w-full bg-primary border-b-2 border-foreground py-32 px-4 md:px-8">
      <div className="max-w-[900px] mx-auto text-center flex flex-col items-center justify-center gap-6">
        <h2 className="font-serif text-[36px] md:text-[52px] font-normal text-primary-foreground tracking-tight leading-tight select-none">
          Ready to streamline your institution's assessment?
        </h2>
        <p className="font-sans text-lg text-primary-foreground/90 leading-relaxed max-w-[540px]">
          Join the NCISM platform and automate your compliance workflow
        </p>
        <button
          onClick={() => navigate('/register')}
          className="mt-4 h-14 px-8 bg-background text-foreground rounded-full border-2 border-foreground font-sans text-base font-semibold tracking-wide shadow-[8px_8px_0px_hsl(var(--foreground))] flex items-center justify-center gap-2 transition-all duration-150 ease-out hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-[4px_4px_0px_hsl(var(--foreground))] active:translate-x-[4px] active:translate-y-[4px] motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-background focus-visible:ring-offset-2 focus-visible:ring-offset-primary"
        >
          Get Started <ArrowRight className="w-5 h-5" />
        </button>
      </div>
    </section>
  );
}
