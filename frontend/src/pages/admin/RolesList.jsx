import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useRoles } from '@/features/admin/hooks';

export function RolesList() {
  const { data: roles = [], isLoading, isError } = useRoles();

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Roles</h1>
        <p className="text-muted-foreground mt-1">Role catalogue and the permissions each grants.</p>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : isError ? (
        <p className="text-destructive">Failed to load roles.</p>
      ) : roles.map((r) => (
        <Card key={r.key}>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <span className="font-mono">{r.key}</span>
              <span className="text-sm font-normal text-muted-foreground">{r.name}</span>
            </CardTitle>
            {r.description && <p className="text-sm text-muted-foreground">{r.description}</p>}
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {r.permissions.length
              ? r.permissions.map((p) => <Badge key={p} variant="outline" className="font-mono text-xs">{p}</Badge>)
              : <span className="text-sm text-muted-foreground">No permissions</span>}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
