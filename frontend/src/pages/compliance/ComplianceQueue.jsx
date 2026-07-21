import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ClipboardCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@/features/auth/AuthContext';
import { useComplianceQueue, useUpdatePenalty } from '@/features/applications/hooks';

const ALL = '__all__';
const PENALTY_LABELS = {
  seat_reduction: 'Seat reduction', denial: 'Denial', monetary: 'Monetary penalty',
  teacher_code_revocation: 'Teacher-code revocation',
};
const STATUSES = ['pending', 'applied', 'paid', 'waived'];

export function ComplianceQueue() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { hasPermission } = useAuth();
  const canManage = hasPermission('compliance:manage');

  const [status, setStatus] = useState('pending');
  const { data: rows = [], isLoading, isError } = useComplianceQueue(status === ALL ? undefined : status);
  const update = useUpdatePenalty();

  const caseLink = (appId) => navigate(`${pathname.replace(/compliance$/, 'applications')}/${appId}`);

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-6xl mx-auto">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <ClipboardCheck className="h-7 w-7" /> Compliance & penalties
          </h1>
          <p className="text-muted-foreground mt-1">Seat reductions, denials, monetary penalties and teacher-code revocations across cases.</p>
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All statuses</SelectItem>
            {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="bg-background rounded-xl border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted-foreground uppercase bg-muted/50 border-b">
              <tr>
                <th className="px-4 py-3 font-medium">Institution</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Detail</th>
                <th className="px-4 py-3 font-medium">Seats/Amount</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan="5" className="px-4 py-12 text-center text-muted-foreground">Loading…</td></tr>
              ) : isError ? (
                <tr><td colSpan="5" className="px-4 py-12 text-center text-destructive">Failed to load.</td></tr>
              ) : rows.length ? rows.map((p) => (
                <tr key={p.id} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="px-4 py-2 cursor-pointer" onClick={() => caseLink(p.application_id)}>
                    <span className="font-mono text-xs text-muted-foreground mr-2">{p.institute_id}</span>{p.institution_name}
                  </td>
                  <td className="px-4 py-2 font-medium">{PENALTY_LABELS[p.type] || p.type}</td>
                  <td className="px-4 py-2 text-muted-foreground max-w-[260px] truncate" title={p.description}>{p.description || '—'}</td>
                  <td className="px-4 py-2">{p.type === 'monetary' ? `₹${Number(p.amount).toLocaleString('en-IN')}` : (p.seats != null ? `${p.seats} seats` : '—')}</td>
                  <td className="px-4 py-2">
                    {canManage ? (
                      <Select value={p.status} onValueChange={(s) => update.mutate({ penaltyId: p.id, status: s })}>
                        <SelectTrigger className="h-7 w-28"><SelectValue /></SelectTrigger>
                        <SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                      </Select>
                    ) : <Badge variant={p.status === 'paid' || p.status === 'waived' ? 'default' : 'secondary'}>{p.status}</Badge>}
                  </td>
                </tr>
              )) : (
                <tr><td colSpan="5" className="px-4 py-12 text-center text-muted-foreground">No penalties for this filter.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
