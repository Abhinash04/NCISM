import { Link } from 'react-router-dom';
import { ShieldX } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function Forbidden() {
  return (
    <div className="grid min-h-screen place-items-center p-4 text-center">
      <div className="space-y-4">
        <ShieldX className="mx-auto h-12 w-12 text-muted-foreground" />
        <h1 className="text-2xl font-semibold">Access denied</h1>
        <p className="text-muted-foreground">You don’t have permission to view this page.</p>
        <Button asChild><Link to="/dashboard">Back to dashboard</Link></Button>
      </div>
    </div>
  );
}
