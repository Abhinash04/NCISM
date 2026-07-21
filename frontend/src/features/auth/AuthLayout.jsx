import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { ThemeToggle } from '@/components/common/ThemeToggle';

export function AuthLayout({ children, footer }) {
  return (
    <div className="relative min-h-screen flex items-center justify-center bg-background px-4 py-8">
      {/* Return to the public landing page — present on every auth screen (login/register/forgot/MFA). */}
      <Link
        to="/"
        className="absolute top-4 left-4 inline-flex items-center gap-1.5 rounded-md px-2 py-1 font-sans text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <ArrowLeft className="h-4 w-4" />
        Home
      </Link>

      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-[420px] bg-secondary border border-border rounded-[12px] p-6 md:p-8 flex flex-col shadow-sm animate-in fade-in-0 zoom-in-95 duration-300 ease-out motion-reduce:animate-none">
        <div className="w-full">
          {children}
        </div>
        {footer && (
          <div className="mt-6 pt-6 border-t border-border w-full">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
