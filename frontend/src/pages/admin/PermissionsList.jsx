import { usePermissions } from '@/features/admin/hooks';

export function PermissionsList() {
  const { data: permissions = [], isLoading, isError } = usePermissions();

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Permissions</h1>
        <p className="text-muted-foreground mt-1">The resource:action permission catalogue.</p>
      </div>

      <div className="bg-background rounded-xl border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted-foreground uppercase bg-muted/50 border-b">
              <tr>
                <th className="px-4 py-3 font-medium">Key</th>
                <th className="px-4 py-3 font-medium">Resource</th>
                <th className="px-4 py-3 font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan="3" className="px-4 py-12 text-center text-muted-foreground">Loading…</td></tr>
              ) : isError ? (
                <tr><td colSpan="3" className="px-4 py-12 text-center text-destructive">Failed to load permissions.</td></tr>
              ) : permissions.map((p) => (
                <tr key={p.key} className="border-b last:border-0">
                  <td className="px-4 py-3 font-mono text-xs">{p.key}</td>
                  <td className="px-4 py-3">{p.resource}</td>
                  <td className="px-4 py-3">{p.action}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
