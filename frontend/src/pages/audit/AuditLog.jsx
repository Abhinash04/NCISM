import { useState } from 'react';
import { ScrollText, ChevronLeft, ChevronRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useAuditLog } from '@/features/audit/hooks';

const ALL = '__all__';
const ENTITIES = ['applications', 'meetings', 'institutions', 'admin', 'auth'];
const LIMIT = 50;

export function AuditLog() {
  const [entity, setEntity] = useState(ALL);
  const [actorId, setActorId] = useState('');
  const [page, setPage] = useState(1);

  const params = { page, limit: LIMIT, ...(entity !== ALL ? { entity } : {}), ...(actorId ? { actorId } : {}) };
  const { data, isLoading, isError } = useAuditLog(params);
  const rows = data?.rows || [];
  const total = data?.total || 0;
  const totalPages = Math.max(1, Math.ceil(total / LIMIT));

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <ScrollText className="h-7 w-7" /> Audit log
        </h1>
        <p className="text-muted-foreground mt-1">Append-only trail of every write across the platform.</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <Select value={entity} onValueChange={(v) => { setEntity(v); setPage(1); }}>
          <SelectTrigger className="w-full sm:w-52"><SelectValue placeholder="Entity" /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All entities</SelectItem>
            {ENTITIES.map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}
          </SelectContent>
        </Select>
        <Input placeholder="Filter by actor id…" className="sm:w-72" value={actorId}
          onChange={(e) => { setActorId(e.target.value.trim()); setPage(1); }} />
      </div>

      <div className="bg-background rounded-xl border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted-foreground uppercase bg-muted/50 border-b">
              <tr>
                <th className="px-4 py-3 font-medium">When</th>
                <th className="px-4 py-3 font-medium">Actor</th>
                <th className="px-4 py-3 font-medium">Action</th>
                <th className="px-4 py-3 font-medium">Entity</th>
                <th className="px-4 py-3 font-medium">Path</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan="6" className="px-4 py-12 text-center text-muted-foreground">Loading…</td></tr>
              ) : isError ? (
                <tr><td colSpan="6" className="px-4 py-12 text-center text-destructive">Failed to load audit log.</td></tr>
              ) : rows.length ? rows.map((r) => (
                <tr key={r.id} className="border-b last:border-0">
                  <td className="px-4 py-2 text-muted-foreground whitespace-nowrap">{new Date(r.created_at).toLocaleString()}</td>
                  <td className="px-4 py-2">{r.actor_email || '—'}</td>
                  <td className="px-4 py-2 font-medium">{r.action}</td>
                  <td className="px-4 py-2">{r.entity || '—'}</td>
                  <td className="px-4 py-2 font-mono text-xs text-muted-foreground max-w-[280px] truncate" title={r.path}>{r.path}</td>
                  <td className="px-4 py-2"><Badge variant={r.status < 300 ? 'default' : 'secondary'}>{r.status}</Badge></td>
                </tr>
              )) : (
                <tr><td colSpan="6" className="px-4 py-12 text-center text-muted-foreground">No audit entries.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t px-4 py-3 text-sm text-muted-foreground">
          <span>Page {page} of {totalPages} · {total.toLocaleString()} events</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
              <ChevronLeft className="h-4 w-4" /> Prev
            </Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>
              Next <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
