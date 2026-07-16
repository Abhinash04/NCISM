import { useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { ArrowLeft, Building2, Clock, FileCheck2, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { MarkdownRenderer } from '@/components/markdown/MarkdownRenderer';
import { DragDropZone } from '@/features/documents/components/DragDropZone';
import {
  useApplication, useAllowedActions, useApplicationEvents, useApplicationAction,
  useClarifications, useIssueClarification, useRespondClarification,
} from '@/features/applications/hooks';
import { STATUS_META } from './ApplicationsList';

const SYSTEM_LABELS = { ayurveda: 'Ayurveda', unani: 'Unani', siddha: 'Siddha', sowa_rigpa: 'Sowa-Rigpa' };

// Pure transitions handled by the generic action mutation.
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
  const { data: rounds = [] } = useClarifications(id);
  const action = useApplicationAction(id);
  const issue = useIssueClarification(id);
  const respond = useRespondClarification(id);

  const [dialog, setDialog] = useState(null); // { key } — note/letter dialog
  const [note, setNote] = useState('');
  const [respText, setRespText] = useState('');
  const [respFile, setRespFile] = useState(null);

  if (isLoading) return <div className="p-8 text-muted-foreground">Loading…</div>;
  if (isError || !app) return <div className="p-8 text-destructive">Case not found.</div>;

  const meta = STATUS_META[app.status] || { label: app.status, variant: 'secondary' };
  const busy = action.isPending || issue.isPending || respond.isPending;

  // Buttons: pure transitions + "request clarification"; "respond" is an inline panel below.
  const buttonActions = actions.filter((a) => a !== 'respond');

  const onAction = (key) => {
    if (key === 'request_clarification') { setNote(''); setDialog({ key, issue: true }); return; }
    const def = ACTION_DEFS[key];
    if (def.note) { setNote(''); setDialog({ key }); }
    else action.mutate({ action: def.route, body: def.body || {} });
  };
  const confirmDialog = () => {
    if (dialog.issue) { issue.mutate(note); }
    else {
      const def = ACTION_DEFS[dialog.key];
      action.mutate({ action: def.route, body: { ...(def.body || {}), ...(note ? { note } : {}) } });
    }
    setDialog(null);
  };
  const submitResponse = () => {
    respond.mutate({ responseText: respText, file: respFile }, {
      onSuccess: () => { setRespText(''); setRespFile(null); },
    });
  };

  const dialogTitle = dialog?.issue ? 'Request clarification' : dialog && ACTION_DEFS[dialog.key].label;

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
      {buttonActions.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {buttonActions.map((key) => {
            const def = key === 'request_clarification'
              ? { label: 'Request clarification', variant: 'outline' }
              : ACTION_DEFS[key];
            if (!def) return null;
            return (
              <Button key={key} variant={def.variant} disabled={busy} onClick={() => onAction(key)}>
                {busy ? 'Working…' : def.label}
              </Button>
            );
          })}
        </div>
      )}

      {/* College respond panel — shown when the owning college may answer. */}
      {actions.includes('respond') && (
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Mail className="h-4 w-4" /> Respond to clarification</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <Textarea placeholder="Your response to the shortcomings…" value={respText} onChange={(e) => setRespText(e.target.value)} />
            {respFile ? (
              <div className="flex items-center gap-2 rounded-lg border p-3 text-sm">
                <FileCheck2 className="h-4 w-4 text-emerald-500" />
                <span className="truncate">{respFile.name}</span>
                <Button variant="ghost" size="sm" className="ml-auto" onClick={() => setRespFile(null)}>Change</Button>
              </div>
            ) : <DragDropZone onFileSelect={setRespFile} />}
            <Button onClick={submitResponse} disabled={busy || (!respText && !respFile)}>
              {respond.isPending ? 'Submitting…' : 'Submit response'}
            </Button>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="report">
        <TabsList>
          <TabsTrigger value="report">Assessment report</TabsTrigger>
          <TabsTrigger value="clarifications">Clarifications{rounds.length ? ` (${rounds.length})` : ''}</TabsTrigger>
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

        <TabsContent value="clarifications">
          <Card>
            <CardContent className="pt-6 space-y-4">
              {rounds.length ? rounds.map((r) => (
                <div key={r.id} className="rounded-lg border p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Round {r.round}</span>
                    <Badge variant={r.status === 'responded' ? 'default' : 'secondary'}>{r.status}</Badge>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Letter{r.issued_by_name ? ` · ${r.issued_by_name}` : ''}</p>
                    <p className="text-sm whitespace-pre-wrap">{r.letter_text}</p>
                  </div>
                  {(r.response_text || r.response_file) && (
                    <div className="border-t pt-2">
                      <p className="text-xs text-muted-foreground">Response{r.responded_by_name ? ` · ${r.responded_by_name}` : ''}</p>
                      {r.response_text && <p className="text-sm whitespace-pre-wrap">{r.response_text}</p>}
                      {r.response_file && <p className="text-xs text-muted-foreground mt-1">📎 {r.response_file}</p>}
                    </div>
                  )}
                </div>
              )) : <p className="text-sm text-muted-foreground">No clarifications issued.</p>}
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
          <DialogHeader><DialogTitle>{dialogTitle}</DialogTitle></DialogHeader>
          <Textarea
            placeholder={dialog?.issue ? 'Clarification letter — list the shortcomings…' : 'Add a note (optional)…'}
            value={note} onChange={(e) => setNote(e.target.value)} rows={dialog?.issue ? 6 : 3} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(null)}>Cancel</Button>
            <Button onClick={confirmDialog} disabled={busy || (dialog?.issue && !note.trim())}>Confirm</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
