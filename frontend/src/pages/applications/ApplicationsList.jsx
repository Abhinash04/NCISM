import { useNavigate, useLocation } from 'react-router-dom';
import { FileStack, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/features/auth/AuthContext';
import { useApplications } from '@/features/applications/hooks';

const SYSTEM_LABELS = { ayurveda: 'Ayurveda', unani: 'Unani', siddha: 'Siddha', sowa_rigpa: 'Sowa-Rigpa' };

export const STATUS_META = {
  uploaded: { label: 'Uploaded', variant: 'secondary' },
  processing: { label: 'Processing', variant: 'secondary' },
  processed: { label: 'Processed', variant: 'default' },
  failed: { label: 'Failed', variant: 'destructive' },
  under_validation: { label: 'Validation', variant: 'secondary' },
  senior_review: { label: 'Senior review', variant: 'default' },
  board_review: { label: 'Board review', variant: 'default' },
  approved: { label: 'Approved', variant: 'default' },
  rejected: { label: 'Rejected', variant: 'destructive' },
};

// Per-role page title for the shared queue.
const TITLE_BY_ROLE = {
  visitor: 'My uploads',
  junior_consultant: 'My case queue',
  senior_consultant: 'Review queue',
  board_member: 'Board decisions',
  president: 'Board decisions',
};

export function ApplicationsList() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { primaryRole } = useAuth();
  const { data: rows = [], isLoading, isError } = useApplications();

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-6xl mx-auto">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{TITLE_BY_ROLE[primaryRole] || 'Applications'}</h1>
          <p className="text-muted-foreground mt-1">Assessment cases in the review workflow.</p>
        </div>
        {primaryRole === 'visitor' && (
          <Button onClick={() => navigate(`${pathname}/new`)}>
            <Plus className="h-4 w-4 mr-1" /> New upload
          </Button>
        )}
      </div>

      <div className="bg-background rounded-xl border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted-foreground uppercase bg-muted/50 border-b">
              <tr>
                <th className="px-4 py-3 font-medium">Institution</th>
                <th className="px-4 py-3 font-medium">System</th>
                <th className="px-4 py-3 font-medium">State</th>
                <th className="px-4 py-3 font-medium">Session</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan="5" className="px-4 py-12 text-center text-muted-foreground">Loading…</td></tr>
              ) : isError ? (
                <tr><td colSpan="5" className="px-4 py-12 text-center text-destructive">Failed to load cases.</td></tr>
              ) : rows.length ? (
                rows.map((r) => {
                  const meta = STATUS_META[r.status] || { label: r.status, variant: 'secondary' };
                  return (
                    <tr key={r.id}
                      className="border-b last:border-0 hover:bg-muted/30 cursor-pointer"
                      onClick={() => navigate(`${pathname}/${r.id}`)}>
                      <td className="px-4 py-3 font-medium max-w-[360px] truncate" title={r.institution_name}>
                        <span className="font-mono text-xs text-muted-foreground mr-2">{r.institute_id}</span>
                        {r.institution_name}
                      </td>
                      <td className="px-4 py-3">{SYSTEM_LABELS[r.system] || r.system}</td>
                      <td className="px-4 py-3 text-muted-foreground">{r.state}</td>
                      <td className="px-4 py-3 text-muted-foreground">{r.session || '—'}</td>
                      <td className="px-4 py-3"><Badge variant={meta.variant}>{meta.label}</Badge></td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="5" className="px-4 py-12 text-center text-muted-foreground">
                    <div className="flex flex-col items-center gap-2">
                      <FileStack className="h-8 w-8 opacity-20" />
                      <p>No cases in your queue.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
