import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/features/auth/AuthContext';

export function Profile() {
  const { user, roles } = useAuth();

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold tracking-tight">Profile</h1>
      <Card>
        <CardHeader><CardTitle className="text-base">{user?.name}</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-xs text-muted-foreground">Email</p>
            <p className="text-sm">{user?.email}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Roles</p>
            <div className="flex flex-wrap gap-2">
              {roles.map((r) => <Badge key={r} variant="secondary">{r}</Badge>)}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
