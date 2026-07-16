import { useNavigate } from 'react-router-dom';
import { Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useOrgUsers } from '@/features/admin/hooks';

export function UsersList() {
  const navigate = useNavigate();
  const { data: users = [], isLoading, isError } = useOrgUsers();

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Users className="h-7 w-7" /> Users
        </h1>
        <p className="text-muted-foreground mt-1">MARB-ISM org users and their assigned roles.</p>
      </div>

      <div className="bg-background rounded-xl border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted-foreground uppercase bg-muted/50 border-b">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Roles</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan="4" className="px-4 py-12 text-center text-muted-foreground">Loading…</td></tr>
              ) : isError ? (
                <tr><td colSpan="4" className="px-4 py-12 text-center text-destructive">Failed to load users.</td></tr>
              ) : users.map((u) => (
                <tr key={u.id}
                  className="border-b last:border-0 hover:bg-muted/30 cursor-pointer"
                  onClick={() => navigate(`/admin/users/${u.id}`)}>
                  <td className="px-4 py-3 font-medium">{u.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{u.email}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {(u.roles || []).map((r) => <Badge key={r} variant="secondary">{r}</Badge>)}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={u.status === 'active' ? 'default' : 'outline'}>{u.status}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
