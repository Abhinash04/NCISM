import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { ThemeToggle } from '@/components/common/ThemeToggle';

const SYSTEMS = ['Ayurveda', 'Unani', 'Siddha', 'Sowa-Rigpa'];

export function AuthLayout({ children, footer }) {
  return (
    <div className="min-h-screen flex flex-col bg-background">

      {/* Top navigation bar */}
      <nav className="sticky top-0 z-50 h-16 bg-background border-b-2 border-foreground px-4 md:px-8">
        <div className="max-w-[1100px] mx-auto h-full flex items-center justify-between">
          <Link to="/" className="flex items-center gap-1.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded">
            <span className="font-serif text-[20px] font-normal text-foreground tracking-wide select-none">
              NCISM
            </span>
            <span className="w-2 h-2 bg-primary rounded-full self-center mb-0.5" />
          </Link>

          <div className="flex items-center gap-2 md:gap-3">
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 h-9 px-3 rounded-full font-sans text-sm font-medium text-foreground border-2 border-foreground bg-background neo-shadow-sm neo-interactive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Home</span>
            </Link>
            <ThemeToggle />
          </div>
        </div>
      </nav>

      {/* Centered auth card */}
      <main className="flex-1 flex items-center justify-center px-4 py-10 md:py-16">
        <div className="w-full max-w-[880px] grid grid-cols-1 md:grid-cols-[0.9fr_1fr] overflow-hidden rounded-3xl bg-card neo-border neo-shadow-lg animate-in fade-in-0 zoom-in-95 duration-300 ease-out motion-reduce:animate-none">

          {/* Brand panel — left column on desktop, top band on mobile */}
          <div className="bg-primary text-primary-foreground p-8 flex flex-col justify-between gap-10 border-b-2 md:border-b-0 md:border-r-2 border-foreground">
            <div className="flex items-center gap-1.5">
              <span className="font-serif text-[24px] font-normal tracking-wide select-none">
                NCISM
              </span>
              <span className="w-2 h-2 rounded-full bg-primary-foreground self-center mb-0.5" />
            </div>

            <div className="hidden md:block">
              <h2 className="font-serif text-[26px] font-normal leading-tight tracking-tight">
                Medical Assessment &amp; Rating Board
              </h2>
              <p className="font-sans text-sm text-primary-foreground/80 leading-relaxed mt-3 max-w-[280px]">
                Automated compliance assessment for Indian systems of medicine.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {SYSTEMS.map((name) => (
                <span
                  key={name}
                  className="font-sans text-xs font-medium px-2.5 py-1 rounded-full border-2 border-primary-foreground/40 text-primary-foreground/90 select-none"
                >
                  {name}
                </span>
              ))}
            </div>
          </div>

          {/* Form column */}
          <div className="p-6 md:p-8 flex flex-col bg-card">
            <div className="w-full">
              {children}
            </div>
            {footer && (
              <div className="mt-6 pt-6 border-t-2 border-foreground/15 w-full">
                {footer}
              </div>
            )}
          </div>
        </div>
      </main>

    </div>
  );
}
