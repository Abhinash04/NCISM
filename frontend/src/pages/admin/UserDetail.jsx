import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useOrgUser } from '@/features/admin/hooks';

export function UserDetail() {
  const navigate = useNavigate();
  const { userId } = useParams();
  const { data: user, isLoading, isError } = useOrgUser(userId);

  if (isLoading) return <div className="p-8 text-muted-foreground">Loading…</div>;
  if (isError || !user) return <div className="p-8 text-destructive">User not found.</div>;

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-3xl mx-auto">
      <Button variant="ghost" size="sm" onClick={() => navigate('/admin/users')}>
        <ArrowLeft className="h-4 w-4 mr-1" /> Back to users
      </Button>

      <div>
        <h1 className="text-2xl font-bold tracking-tight">{user.name}</h1>
        <p className="text-muted-foreground mt-1">{user.email}</p>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Roles</CardTitle></CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {(user.roles || []).map((r) => <Badge key={r} variant="secondary">{r}</Badge>)}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Effective permissions</CardTitle></CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {(user.permissions || []).map((p) => (
            <Badge key={p} variant="outline" className="font-mono text-xs">{p}</Badge>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
