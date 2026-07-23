import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AnimatedHamburgerButton } from '@/components/ui/AnimatedHamburgerButton';
import { ThemeToggle } from '@/components/common/ThemeToggle';

export function LandingNav() {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);

  const links = [
    { label: 'Home', href: '/' },
    { label: 'Overview', href: '#overview' },
    { label: 'Features', href: '#features' },
    { label: 'FAQ', href: '#faq' },
    { label: 'Contact', href: '#contact' },
  ];

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 h-16 bg-background border-b-2 border-foreground z-50 px-4 md:px-8">
        <div className="max-w-[1200px] mx-auto h-full flex items-center justify-between">

          {/* Brand Logo */}
          <Link to="/" className="flex items-center gap-1.5 focus:outline-none">
            <span className="font-serif text-[20px] font-normal text-foreground tracking-wide select-none">
              NCISM
            </span>
            <span className="w-2 h-2 bg-primary rounded-full self-center mb-0.5" />
          </Link>

          {/* Desktop Nav Links */}
          <div className="hidden md:flex items-center gap-8">
            {links.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="font-sans text-sm font-medium text-foreground hover:text-muted-foreground transition-colors duration-150"
              >
                {link.label}
              </a>
            ))}
          </div>

          {/* Desktop Call to Actions */}
          <div className="hidden md:flex items-center gap-4">
            <ThemeToggle />
            <button
              onClick={() => navigate('/login')}
              className="font-sans text-sm font-medium text-foreground hover:text-muted-foreground bg-transparent border-0 cursor-pointer rounded px-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Sign In
            </button>
            <button
              onClick={() => navigate('/register')}
              className="h-9 px-5 bg-primary text-primary-foreground rounded-full border-2 border-foreground font-sans text-xs font-semibold tracking-wide flex shadow-[4px_4px_0px_hsl(var(--foreground))] transition-all duration-150 ease-out hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_hsl(var(--foreground))] active:translate-x-[3px] active:translate-y-[3px] motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background items-center justify-center"
            >
              Get Started
            </button>
          </div>

          {/* Mobile Hamburger Button */}
          <div className="md:hidden -mr-2">
            <AnimatedHamburgerButton active={isOpen} setActive={setIsOpen} />
          </div>
        </div>
      </nav>

      {/* Mobile Full Screen Menu Overlay */}
      {isOpen && (
        <div className="fixed inset-0 top-16 bg-background z-40 animate-in fade-in slide-in-from-top-4 duration-200 motion-reduce:animate-none p-6 flex flex-col md:hidden">
          <div className="flex flex-col gap-6 pt-4 flex-1">
            {links.map((link) => (
              <a
                key={link.label}
                href={link.href}
                onClick={() => setIsOpen(false)}
                className="font-sans text-lg font-medium text-foreground border-b border-border pb-3"
              >
                {link.label}
              </a>
            ))}
          </div>
          <div className="flex flex-col gap-3 pt-6 border-t border-border w-full">
            <div className="flex items-center justify-between">
              <span className="font-sans text-sm text-muted-foreground">Theme</span>
              <ThemeToggle />
            </div>
            <button
              onClick={() => {
                setIsOpen(false);
                navigate('/login');
              }}
              className="w-full h-11 bg-background border-2 border-foreground text-foreground rounded-full font-sans text-sm font-medium flex shadow-[4px_4px_0px_hsl(var(--foreground))] transition-all duration-150 ease-out hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_hsl(var(--foreground))] motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring items-center justify-center"
            >
              Sign In
            </button>
            <button
              onClick={() => {
                setIsOpen(false);
                navigate('/register');
              }}
              className="w-full h-11 bg-primary text-primary-foreground border-2 border-foreground rounded-full font-sans text-sm font-semibold flex shadow-[4px_4px_0px_hsl(var(--foreground))] transition-all duration-150 ease-out hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_hsl(var(--foreground))] motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring items-center justify-center"
            >
              Get Started
            </button>
          </div>
        </div>
      )}
    </>
  );
}
