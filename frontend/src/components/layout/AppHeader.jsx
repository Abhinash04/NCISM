import { Link } from 'react-router-dom';
import { FileSearch } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useServiceHealth } from '@/hooks/useServiceHealth';

function ServiceHealthIndicator() {
  const healthy = useServiceHealth();

  const label =
    healthy === null ? 'Checking service…' : healthy ? 'Extraction service online' : 'Extraction service offline';

  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <span
        className={cn(
          'inline-block size-2 rounded-full',
          healthy === null && 'bg-slate-300',
          healthy === true && 'bg-emerald-500',
          healthy === false && 'bg-red-500',
        )}
      />
      {label}
    </div>
  );
}

export function AppHeader({ children }) {
  return (
    <header className="sticky top-0 z-10 border-b bg-card">
      <div className="mx-auto flex h-14 max-w-screen-2xl items-center gap-4 px-4">
        <Link to="/" className="flex items-center gap-2 font-semibold">
          <FileSearch className="size-5 text-primary" />
          <span>NCISM Document Intelligence</span>
        </Link>
        <div className="flex-1 min-w-0">{children}</div>
        <ServiceHealthIndicator />
      </div>
    </header>
  );
}
