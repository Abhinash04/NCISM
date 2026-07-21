import { useNavigate } from 'react-router-dom';

export function CTASection() {
  const navigate = useNavigate();

  return (
    <section className="w-full bg-primary py-16 px-4 md:px-8">
      <div className="max-w-[1200px] mx-auto text-center flex flex-col items-center justify-center space-y-6">
        <h2 className="font-serif text-[28px] font-normal text-primary-foreground tracking-tight leading-tight select-none">
          Ready to streamline your institution's assessment?
        </h2>
        <p className="font-sans text-base text-primary-foreground/85 leading-relaxed max-w-[500px] mt-2">
          Join the NCISM platform and automate your compliance workflow
        </p>
        <button
          onClick={() => navigate('/register')}
          className="h-11 px-6 bg-background text-foreground rounded-[8px] font-sans text-sm font-medium tracking-wide shadow-sm mt-4 flex items-center justify-center transition-[transform,background-color] duration-150 ease-out hover:bg-accent active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-foreground/70 focus-visible:ring-offset-2 focus-visible:ring-offset-primary"
        >
          Get Started
        </button>
      </div>
    </section>
  );
}
