import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Menu, X } from 'lucide-react';

export function LandingNav() {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);

  const links = [
    { label: 'Home', href: '/' },
    { label: 'About', href: '/about' },
    { label: 'Features', href: '#features' },
    { label: 'Contact', href: '#contact' },
  ];

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 h-16 bg-[#faf9f5] border-b border-[#e6dfd8] z-50 px-4 md:px-8">
        <div className="max-w-[1200px] mx-auto h-full flex items-center justify-between">
          
          {/* Brand Logo */}
          <Link to="/" className="flex items-center gap-1.5 focus:outline-none">
            <span className="font-serif text-[20px] font-normal text-[#141413] tracking-wide select-none">
              NCISM
            </span>
            <span className="w-2 h-2 bg-[#cc785c] rounded-full self-center mb-0.5" />
          </Link>

          {/* Desktop Nav Links */}
          <div className="hidden md:flex items-center gap-8">
            {links.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="font-sans text-sm font-medium text-[#141413] hover:text-[#6c6a64] transition-colors duration-150"
              >
                {link.label}
              </a>
            ))}
          </div>

          {/* Desktop Call to Actions */}
          <div className="hidden md:flex items-center gap-4">
            <button
              onClick={() => navigate('/login')}
              className="font-sans text-sm font-medium text-[#141413] hover:text-[#6c6a64] bg-transparent border-0 focus:outline-none cursor-pointer"
            >
              Sign In
            </button>
            <button
              onClick={() => navigate('/register')}
              className="h-9 px-4 bg-[#cc785c] hover:bg-[#a9583e] text-white rounded-[8px] font-sans text-xs font-semibold tracking-wide transition-colors duration-150 flex items-center justify-center"
            >
              Get Started
            </button>
          </div>

          {/* Mobile Hamburger Button */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="md:hidden p-1.5 hover:bg-[#efe9de] rounded-lg text-[#141413] transition-colors duration-150 focus:outline-none"
          >
            {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </nav>

      {/* Mobile Full Screen Menu Overlay */}
      {isOpen && (
        <div className="fixed inset-0 top-16 bg-[#faf9f5] z-40 animate-in fade-in slide-in-from-top-4 duration-200 p-6 flex flex-col md:hidden">
          <div className="flex flex-col gap-6 pt-4 flex-1">
            {links.map((link) => (
              <a
                key={link.label}
                href={link.href}
                onClick={() => setIsOpen(false)}
                className="font-sans text-lg font-medium text-[#141413] border-b border-[#e6dfd8] pb-3"
              >
                {link.label}
              </a>
            ))}
          </div>
          <div className="flex flex-col gap-3 pt-6 border-t border-[#e6dfd8] w-full">
            <button
              onClick={() => {
                setIsOpen(false);
                navigate('/login');
              }}
              className="w-full h-11 bg-transparent border border-[#e6dfd8] text-[#141413] hover:bg-[#efe9de] rounded-[8px] font-sans text-sm font-medium transition-colors flex items-center justify-center"
            >
              Sign In
            </button>
            <button
              onClick={() => {
                setIsOpen(false);
                navigate('/register');
              }}
              className="w-full h-11 bg-[#cc785c] hover:bg-[#a9583e] text-white rounded-[8px] font-sans text-sm font-semibold transition-colors flex items-center justify-center"
            >
              Get Started
            </button>
          </div>
        </div>
      )}
    </>
  );
}
