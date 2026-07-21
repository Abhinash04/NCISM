import { ThemeToggle } from '@/components/common/ThemeToggle';

export function AuthLayout({ children, footer }) {
  return (
    <div className="relative min-h-screen flex items-center justify-center bg-background px-4 py-8">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-[420px] bg-secondary border border-border rounded-[12px] p-6 md:p-8 flex flex-col">
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
