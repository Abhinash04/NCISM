import { useNavigate } from 'react-router-dom';

export function CTASection() {
  const navigate = useNavigate();

  return (
    <section className="w-full bg-[#cc785c] py-16 px-4 md:px-8">
      <div className="max-w-[1200px] mx-auto text-center flex flex-col items-center justify-center space-y-6">
        <h2 className="font-serif text-[28px] font-normal text-[#ffffff] tracking-tight leading-tight select-none">
          Ready to streamline your institution's assessment?
        </h2>
        <p className="font-sans text-base text-[#ffffff]/85 leading-relaxed max-w-[500px] mt-2">
          Join the NCISM platform and automate your compliance workflow
        </p>
        <button
          onClick={() => navigate('/register')}
          className="h-11 px-6 bg-[#faf9f5] hover:bg-[#e8e0d2] text-[#141413] rounded-[8px] font-sans text-sm font-medium tracking-wide transition-colors duration-150 flex items-center justify-center shadow-sm mt-4"
        >
          Get Started
        </button>
      </div>
    </section>
  );
}
