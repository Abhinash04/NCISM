import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { FileStack, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { useAuth } from '@/features/auth/AuthContext';
import { useApplications, useDeleteApplication } from '@/features/applications/hooks';

const SYSTEM_LABELS = { ayurveda: 'Ayurveda', unani: 'Unani', siddha: 'Siddha', sowa_rigpa: 'Sowa-Rigpa' };

// eslint-disable-next-line react-refresh/only-export-components -- shared status map co-located with the list page
export const STATUS_META = {
  uploaded: { label: 'Uploaded', variant: 'secondary' },
  processing: { label: 'Processing', variant: 'secondary' },
  processed: { label: 'Processed', variant: 'default' },
  failed: { label: 'Failed', variant: 'destructive' },
  under_validation: { label: 'Validation', variant: 'secondary' },
  clarification_open: { label: 'Clarification sent', variant: 'secondary' },
  clarification_responded: { label: 'Clarification answered', variant: 'default' },
  senior_review: { label: 'Senior review', variant: 'default' },
  board_review: { label: 'Board review', variant: 'default' },
  hearing_requested: { label: 'Hearing requested', variant: 'secondary' },
  hearing_scheduled: { label: 'Hearing scheduled', variant: 'secondary' },
  approved: { label: 'Approved', variant: 'default' },
  closed: { label: 'Closed', variant: 'default' },
  rejected: { label: 'Rejected', variant: 'destructive' },
};

// Per-role page title for the shared queue.
const TITLE_BY_ROLE = {
  admin: 'All cases',
  visitor: 'My uploads',
  junior_consultant: 'My case queue',
  senior_consultant: 'Review queue',
  board_member: 'Board decisions',
  president: 'Board decisions',
};

// Which rows the viewer may delete (server enforces; this only decides the icon).
function canDelete(role, status) {
  if (role === 'visitor') return ['uploaded', 'failed'].includes(status);
  if (role === 'admin') return !['approved', 'closed'].includes(status);
  return false;
}

export function ApplicationsList() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { primaryRole } = useAuth();
  const { data: rows = [], isLoading, isError } = useApplications();
  const del = useDeleteApplication();
  const [pending, setPending] = useState(null); // { id, name } awaiting delete confirmation

  const showActions = rows.some((r) => canDelete(primaryRole, r.status));

  function confirmDelete() {
    if (!pending) return;
    del.mutate(pending.id, {
      onSuccess: () => { toast.success('Upload deleted.'); setPending(null); },
      onError: () => toast.error('Could not delete this case.'),
    });
  }

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
                {showActions && <th className="px-4 py-3 font-medium sr-only">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={showActions ? 6 : 5} className="px-4 py-12 text-center text-muted-foreground">Loading…</td></tr>
              ) : isError ? (
                <tr><td colSpan={showActions ? 6 : 5} className="px-4 py-12 text-center text-destructive">Failed to load cases.</td></tr>
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
                      {showActions && (
                        <td className="px-4 py-3 text-right">
                          {canDelete(primaryRole, r.status) && (
                            <Button
                              variant="ghost" size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-destructive"
                              title="Delete upload"
                              onClick={(e) => { e.stopPropagation(); setPending({ id: r.id, name: r.institution_name }); }}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={showActions ? 6 : 5} className="px-4 py-12 text-center text-muted-foreground">
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

      <Dialog open={!!pending} onOpenChange={(o) => !o && setPending(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Delete this upload?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">
            This permanently removes the case{pending?.name ? ` for ${pending.name}` : ''} and its
            uploaded file from the system. This cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPending(null)} disabled={del.isPending}>Cancel</Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={del.isPending}>
              {del.isPending ? 'Deleting…' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
