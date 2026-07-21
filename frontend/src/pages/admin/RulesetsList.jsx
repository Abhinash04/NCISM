import { useState } from 'react';
import { Layers, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { useRulesets, useActivateRuleset } from '@/features/rulesets/hooks';

const SYSTEM_LABELS = { ayurveda: 'Ayurveda', unani: 'Unani', siddha: 'Siddha', sowa_rigpa: 'Sowa-Rigpa' };
const STATUS_VARIANT = { active: 'default', draft: 'secondary', retired: 'outline' };

export function RulesetsList() {
  const { data: rows = [], isLoading, isError } = useRulesets();
  const activate = useActivateRuleset();
  const [pending, setPending] = useState(null); // ruleset row awaiting activation
  const [boardRef, setBoardRef] = useState('');

  function confirmActivate() {
    if (!pending || !boardRef.trim()) return;
    activate.mutate({ id: pending.id, boardRef: boardRef.trim() }, {
      onSuccess: () => { toast.success(`Activated ${pending.ruleset_id}@${pending.version}`); setPending(null); setBoardRef(''); },
      onError: (e) => toast.error(e?.response?.data?.error?.message || 'Activation failed.'),
    });
  }

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-5xl mx-auto">
      <div className="flex items-start gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
          <Layers className="h-5 w-5" />
        </span>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Rulesets</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Assessment rulesets per system &amp; level. One <strong>active</strong> ruleset per (system, level)
            drives case processing; activation requires a Board reference (SoD).
          </p>
        </div>
      </div>

      <div className="bg-background rounded-xl border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted-foreground uppercase bg-muted/50 border-b">
              <tr>
                <th className="px-4 py-3 font-medium">Ruleset</th>
                <th className="px-4 py-3 font-medium">System</th>
                <th className="px-4 py-3 font-medium">Level</th>
                <th className="px-4 py-3 font-medium">Version</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Board ref</th>
                <th className="px-4 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan="7" className="px-4 py-12 text-center text-muted-foreground">Loading…</td></tr>
              ) : isError ? (
                <tr><td colSpan="7" className="px-4 py-12 text-center text-destructive">Failed to load rulesets.</td></tr>
              ) : rows.length ? rows.map((r) => (
                <tr key={r.id} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <span className="font-medium">{r.title || r.ruleset_id}</span>
                    <span className="block font-mono text-xs text-muted-foreground">{r.ruleset_id}</span>
                  </td>
                  <td className="px-4 py-3">{SYSTEM_LABELS[r.system] || r.system}</td>
                  <td className="px-4 py-3">{r.level}</td>
                  <td className="px-4 py-3 font-mono text-xs">{r.version}</td>
                  <td className="px-4 py-3">
                    <Badge variant={STATUS_VARIANT[r.status] || 'secondary'} className="gap-1">
                      {r.status === 'active' && <CheckCircle2 className="h-3 w-3" />}{r.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground max-w-[220px] truncate" title={r.board_ref}>{r.board_ref || '—'}</td>
                  <td className="px-4 py-3 text-right">
                    {r.status !== 'active' && (
                      <Button variant="outline" size="sm" onClick={() => { setPending(r); setBoardRef(''); }}>Activate</Button>
                    )}
                  </td>
                </tr>
              )) : (
                <tr><td colSpan="7" className="px-4 py-12 text-center text-muted-foreground">No rulesets registered.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={!!pending} onOpenChange={(o) => !o && setPending(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Activate ruleset</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">
            Activating <strong>{pending?.ruleset_id}@{pending?.version}</strong> for{' '}
            <strong>{SYSTEM_LABELS[pending?.system] || pending?.system} / {pending?.level}</strong> retires the
            currently active ruleset for that system &amp; level. A Board/policy reference is required.
          </p>
          <div className="space-y-1.5">
            <Label htmlFor="boardRef">Board reference <span className="text-primary">*</span></Label>
            <Input id="boardRef" placeholder="e.g. MARB-ISM meeting MARB/2026/07, item 4"
              value={boardRef} onChange={(e) => setBoardRef(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPending(null)} disabled={activate.isPending}>Cancel</Button>
            <Button onClick={confirmActivate} disabled={!boardRef.trim() || activate.isPending}>
              {activate.isPending ? 'Activating…' : 'Activate'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
