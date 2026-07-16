import { useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { ArrowLeft, Building2, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { MarkdownRenderer } from '@/components/markdown/MarkdownRenderer';
import {
  useApplication, useAllowedActions, useApplicationEvents, useApplicationAction,
} from '@/features/applications/hooks';
import { STATUS_META } from './ApplicationsList';

const SYSTEM_LABELS = { ayurveda: 'Ayurveda', unani: 'Unani', siddha: 'Siddha', sowa_rigpa: 'Sowa-Rigpa' };

// UI action → { API route segment, fixed body, label, needs a note? }
const ACTION_DEFS = {
  process: { route: 'process', label: 'Process (run engine)', variant: 'default' },
  submit: { route: 'submit', label: 'Submit for review', variant: 'default' },
  forward: { route: 'review', body: { action: 'forward' }, label: 'Forward to board', variant: 'default', note: true },
  return: { route: 'review', body: { action: 'return' }, label: 'Return to junior', variant: 'outline', note: true },
  approve: { route: 'decide', body: { action: 'approve' }, label: 'Approve (grant)', variant: 'default', note: true },
  reject: { route: 'decide', body: { action: 'reject' }, label: 'Reject', variant: 'destructive', note: true },
  revise: { route: 'revise', label: 'Reopen for revision', variant: 'default' },
};

export function ApplicationDetail() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { pathname } = useLocation();
  const listPath = pathname.replace(/\/[^/]+$/, '');

  const { data: app, isLoading, isError } = useApplication(id);
  const { data: actions = [] } = useAllowedActions(id);
  const { data: events = [] } = useApplicationEvents(id);
  const action = useApplicationAction(id);

  const [dialog, setDialog] = useState(null); // { key } for a note-requiring action
  const [note, setNote] = useState('');

  if (isLoading) return <div className="p-8 text-muted-foreground">Loading…</div>;
  if (isError || !app) return <div className="p-8 text-destructive">Case not found.</div>;

  const meta = STATUS_META[app.status] || { label: app.status, variant: 'secondary' };

  const run = (key, extraNote) => {
    const def = ACTION_DEFS[key];
    action.mutate({ action: def.route, body: { ...(def.body || {}), ...(extraNote ? { note: extraNote } : {}) } });
  };
  const onAction = (key) => {
    if (ACTION_DEFS[key].note) { setNote(''); setDialog({ key }); }
    else run(key);
  };
  const confirmDialog = () => { run(dialog.key, note); setDialog(null); };

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-4xl mx-auto">
      <Button variant="ghost" size="sm" onClick={() => navigate(listPath)}>
        <ArrowLeft className="h-4 w-4 mr-1" /> Back to cases
      </Button>

      <div className="flex items-start gap-4">
        <div className="p-3 bg-primary/10 rounded-lg text-primary shrink-0"><Building2 className="h-6 w-6" /></div>
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight break-words">{app.institution_name}</h1>
          <p className="text-muted-foreground mt-1 font-mono text-sm">
            {app.institute_id} · {SYSTEM_LABELS[app.system] || app.system} · {app.state}
            {app.session ? ` · ${app.session}` : ''}
          </p>
          <div className="mt-2 flex items-center gap-2">
            <Badge variant={meta.variant}>{meta.label}</Badge>
            {app.decision && <span className="text-xs text-muted-foreground">decision: {app.decision}</span>}
          </div>
        </div>
      </div>

      {app.status === 'failed' && app.error && (
        <p className="text-sm text-destructive rounded-lg border border-destructive/30 bg-destructive/5 p-3">
          Processing failed: {app.error}
        </p>
      )}

      {/* Action bar — rendered only from backend allowedActions (no role checks here). */}
      {actions.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {actions.map((key) => {
            const def = ACTION_DEFS[key];
            if (!def) return null;
            return (
              <Button key={key} variant={def.variant} disabled={action.isPending}
                onClick={() => onAction(key)}>
                {action.isPending ? 'Working…' : def.label}
              </Button>
            );
          })}
        </div>
      )}

      <Tabs defaultValue="report">
        <TabsList>
          <TabsTrigger value="report">Assessment report</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
        </TabsList>

        <TabsContent value="report">
          <Card>
            <CardContent className="pt-6">
              {app.report_markdown
                ? <div className="prose prose-sm dark:prose-invert max-w-none"><MarkdownRenderer markdown={app.report_markdown} /></div>
                : <p className="text-sm text-muted-foreground">No report yet. Run <strong>Process</strong> to generate the assessment.</p>}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="timeline">
          <Card>
            <CardHeader><CardTitle className="text-base">Case history</CardTitle></CardHeader>
            <CardContent>
              <ol className="space-y-4">
                {events.map((e) => (
                  <li key={e.id} className="flex gap-3 text-sm">
                    <Clock className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                    <div>
                      <p>
                        <span className="font-medium">{(STATUS_META[e.to_state] || {}).label || e.to_state}</span>
                        {e.actor_name && <span className="text-muted-foreground"> · {e.actor_name}</span>}
                        <span className="text-muted-foreground"> · {new Date(e.created_at).toLocaleString()}</span>
                      </p>
                      {e.note && <p className="text-muted-foreground">{e.note}</p>}
                    </div>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={!!dialog} onOpenChange={(o) => !o && setDialog(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{dialog && ACTION_DEFS[dialog.key].label}</DialogTitle></DialogHeader>
          <Textarea placeholder="Add a note (optional)…" value={note} onChange={(e) => setNote(e.target.value)} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(null)}>Cancel</Button>
            <Button onClick={confirmDialog} disabled={action.isPending}>Confirm</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
