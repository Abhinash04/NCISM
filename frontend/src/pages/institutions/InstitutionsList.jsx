import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Search, Building2, ChevronLeft, ChevronRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useInstitutions, useInstitutionMeta } from '@/features/institutions/hooks';

const SYSTEM_LABELS = {
  ayurveda: 'Ayurveda', unani: 'Unani', siddha: 'Siddha', sowa_rigpa: 'Sowa-Rigpa',
};
const ALL = '__all__';
const LIMIT = 25;

export function InstitutionsList() {
  const navigate = useNavigate();
  const { pathname } = useLocation(); // works under /:role/institutions and /admin/institutions
  const [q, setQ] = useState('');
  const [system, setSystem] = useState(ALL);
  const [state, setState] = useState(ALL);
  const [page, setPage] = useState(1);

  const { data: meta } = useInstitutionMeta();
  const params = {
    page, limit: LIMIT,
    ...(q ? { q } : {}),
    ...(system !== ALL ? { system } : {}),
    ...(state !== ALL ? { state } : {}),
  };
  const { data, isLoading, isError } = useInstitutions(params);

  const rows = data?.rows || [];
  const total = data?.total || 0;
  const totalPages = Math.max(1, Math.ceil(total / LIMIT));

  // Any filter change resets to page 1.
  const onFilter = (setter) => (value) => { setter(value); setPage(1); };

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto flex flex-col h-full">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Institutions</h1>
        <p className="text-muted-foreground mt-1">
          Master registry of {total ? total.toLocaleString() : ''} colleges across the four systems of medicine.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search name, institute ID, file number…"
            className="pl-9 bg-background"
            value={q}
            onChange={(e) => { setQ(e.target.value); setPage(1); }}
          />
        </div>
        <Select value={system} onValueChange={onFilter(setSystem)}>
          <SelectTrigger className="w-full sm:w-44"><SelectValue placeholder="System" /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All systems</SelectItem>
            {(meta?.systems || []).map((s) => (
              <SelectItem key={s} value={s}>{SYSTEM_LABELS[s] || s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={state} onValueChange={onFilter(setState)}>
          <SelectTrigger className="w-full sm:w-52"><SelectValue placeholder="State" /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All states</SelectItem>
            {(meta?.states || []).map((s) => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="bg-background rounded-xl border shadow-sm flex-1 overflow-hidden flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted-foreground uppercase bg-muted/50 border-b">
              <tr>
                <th className="px-4 py-3 font-medium">Institute ID</th>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">System</th>
                <th className="px-4 py-3 font-medium">State</th>
                <th className="px-4 py-3 font-medium">File No.</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan="5" className="px-4 py-12 text-center text-muted-foreground">Loading…</td></tr>
              ) : isError ? (
                <tr><td colSpan="5" className="px-4 py-12 text-center text-destructive">Failed to load institutions.</td></tr>
              ) : rows.length ? (
                rows.map((r) => (
                  <tr
                    key={r.id}
                    className="border-b last:border-0 hover:bg-muted/30 transition-colors cursor-pointer"
                    onClick={() => navigate(`${pathname}/${r.id}`)}
                  >
                    <td className="px-4 py-3 font-mono text-xs">{r.institute_id}</td>
                    <td className="px-4 py-3 font-medium max-w-[420px] truncate" title={r.name}>{r.name}</td>
                    <td className="px-4 py-3">{SYSTEM_LABELS[r.system] || r.system}</td>
                    <td className="px-4 py-3 text-muted-foreground">{r.state}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{r.file_number || '—'}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="px-4 py-12 text-center text-muted-foreground">
                    <div className="flex flex-col items-center gap-2">
                      <Building2 className="h-8 w-8 opacity-20" />
                      <p>No institutions match your filters.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between border-t px-4 py-3 text-sm text-muted-foreground">
          <span>Page {page} of {totalPages} · {total.toLocaleString()} total</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}>
              <ChevronLeft className="h-4 w-4" /> Prev
            </Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>
              Next <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
