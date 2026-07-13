import { Link } from 'react-router-dom';
import { FileQuestion } from 'lucide-react';

export function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background text-center p-8 space-y-4">
      <FileQuestion className="w-12 h-12 text-muted-foreground opacity-40" />
      <h1 className="text-3xl font-bold tracking-tight">Page not found</h1>
      <p className="text-muted-foreground max-w-md">
        The page you are looking for does not exist or has been moved.
      </p>
      <Link to="/dashboard" className="text-primary underline underline-offset-4">
        Back to Dashboard
      </Link>
    </div>
  );
}
