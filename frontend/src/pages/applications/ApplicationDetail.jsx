import { useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { ArrowLeft, Building2, Clock, FileCheck2, Mail, Gavel } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { MarkdownRenderer } from '@/components/markdown/MarkdownRenderer';
import { DragDropZone } from '@/features/documents/components/DragDropZone';
import {
  useApplication, useAllowedActions, useApplicationEvents, useApplicationAction,
  useClarifications, useIssueClarification, useRespondClarification,
  useHearings, useCommitteeMembers,
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

// Actions with their own form dialog (kind drives which fields render).
const SPECIAL = {
  request_clarification: { label: 'Request clarification', variant: 'outline', kind: 'issue' },
  request_hearing: { label: 'Request hearing', variant: 'outline', route: 'request-hearing', kind: 'note' },
  appoint_committee: { label: 'Appoint hearing committee', variant: 'default', route: 'appoint-committee', kind: 'committee' },
  record_minutes: { label: 'Record hearing minutes', variant: 'default', route: 'hearing/minutes', kind: 'minutes' },
  dispatch_order: { label: 'Dispatch final order', variant: 'default', route: 'dispatch', kind: 'text', field: 'orderText' },
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
  const { data: hearings = [] } = useHearings(id);
  const action = useApplicationAction(id);
  const issue = useIssueClarification(id);
  const respond = useRespondClarification(id);

  const [dialog, setDialog] = useState(null); // { key, kind }
  const committeeOpen = dialog?.kind === 'committee';
  const { data: committee = [] } = useCommitteeMembers(committeeOpen);

  // Form fields shared by the dialogs.
  const [text, setText] = useState('');      // note / letter / order / minutes
  const [verdict, setVerdict] = useState('');
  const [members, setMembers] = useState([]);
  const [when, setWhen] = useState('');
  const [respText, setRespText] = useState('');
  const [respFile, setRespFile] = useState(null);

  if (isLoading) return <div className="p-8 text-muted-foreground">Loading…</div>;
  if (isError || !app) return <div className="p-8 text-destructive">Case not found.</div>;

  const meta = STATUS_META[app.status] || { label: app.status, variant: 'secondary' };
  const busy = action.isPending || issue.isPending || respond.isPending;
  const buttonActions = actions.filter((a) => a !== 'respond');

  const openDialog = (key) => {
    setText(''); setVerdict(''); setMembers([]); setWhen('');
    setDialog({ key, kind: SPECIAL[key]?.kind || (ACTION_DEFS[key]?.note ? 'note' : null) });
  };
  const onAction = (key) => {
    if (SPECIAL[key] || ACTION_DEFS[key]?.note) return openDialog(key);
    const def = ACTION_DEFS[key];
    action.mutate({ action: def.route, body: def.body || {} });
  };
  const toggleMember = (mid) => setMembers((m) => (m.includes(mid) ? m.filter((x) => x !== mid) : [...m, mid]));

  const confirmDialog = () => {
    const key = dialog.key;
    const sp = SPECIAL[key];
    if (sp?.kind === 'issue') issue.mutate(text);
    else if (sp?.kind === 'note') action.mutate({ action: sp.route, body: { note: text } });
    else if (sp?.kind === 'text') action.mutate({ action: sp.route, body: { [sp.field]: text } });
    else if (sp?.kind === 'minutes') action.mutate({ action: sp.route, body: { minutes: text, verdict } });
    else if (sp?.kind === 'committee') action.mutate({ action: sp.route, body: { memberIds: members, scheduledAt: when || null } });
    else { // pure note transition (forward/return/approve/reject)
      const def = ACTION_DEFS[key];
      action.mutate({ action: def.route, body: { ...(def.body || {}), ...(text ? { note: text } : {}) } });
    }
    setDialog(null);
  };
  const confirmDisabled = busy
    || (dialog?.kind === 'issue' && !text.trim())
    || (dialog?.kind === 'committee' && members.length !== 2);

  const submitResponse = () => respond.mutate({ responseText: respText, file: respFile }, {
    onSuccess: () => { setRespText(''); setRespFile(null); },
  });

  const dialogTitle = dialog ? (SPECIAL[dialog.key]?.label || ACTION_DEFS[dialog.key]?.label) : '';

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

      {buttonActions.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {buttonActions.map((key) => {
            const def = SPECIAL[key] || ACTION_DEFS[key];
            if (!def) return null;
            return (
              <Button key={key} variant={def.variant} disabled={busy} onClick={() => onAction(key)}>
                {busy ? 'Working…' : def.label}
              </Button>
            );
          })}
        </div>
      )}

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
          <TabsTrigger value="hearings">Hearings{hearings.length ? ` (${hearings.length})` : ''}</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
        </TabsList>

        <TabsContent value="report">
          <Card><CardContent className="pt-6">
            {app.report_markdown
              ? <div className="prose prose-sm dark:prose-invert max-w-none"><MarkdownRenderer markdown={app.report_markdown} /></div>
              : <p className="text-sm text-muted-foreground">No report yet. Run <strong>Process</strong> to generate the assessment.</p>}
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="clarifications">
          <Card><CardContent className="pt-6 space-y-4">
            {rounds.length ? rounds.map((r) => (
              <div key={r.id} className="rounded-lg border p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Round {r.round}</span>
                  <Badge variant={r.status === 'responded' ? 'default' : 'secondary'}>{r.status}</Badge>
                </div>
                <div><p className="text-xs text-muted-foreground">Letter{r.issued_by_name ? ` · ${r.issued_by_name}` : ''}</p>
                  <p className="text-sm whitespace-pre-wrap">{r.letter_text}</p></div>
                {(r.response_text || r.response_file) && (
                  <div className="border-t pt-2"><p className="text-xs text-muted-foreground">Response{r.responded_by_name ? ` · ${r.responded_by_name}` : ''}</p>
                    {r.response_text && <p className="text-sm whitespace-pre-wrap">{r.response_text}</p>}
                    {r.response_file && <p className="text-xs text-muted-foreground mt-1">📎 {r.response_file}</p>}</div>
                )}
              </div>
            )) : <p className="text-sm text-muted-foreground">No clarifications issued.</p>}
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="hearings">
          <Card><CardContent className="pt-6 space-y-4">
            {hearings.length ? hearings.map((h) => (
              <div key={h.id} className="rounded-lg border p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium flex items-center gap-2"><Gavel className="h-4 w-4" /> Hearing</span>
                  <Badge variant={h.status === 'held' ? 'default' : 'secondary'}>{h.status}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Committee: {(h.members || []).join(', ') || '—'}
                  {h.appointed_by_name ? ` · appointed by ${h.appointed_by_name}` : ''}
                  {h.scheduled_at ? ` · ${new Date(h.scheduled_at).toLocaleString()}` : ''}
                </p>
                {h.minutes_text && <div><p className="text-xs text-muted-foreground">Minutes{h.recorded_by_name ? ` · ${h.recorded_by_name}` : ''}</p><p className="text-sm whitespace-pre-wrap">{h.minutes_text}</p></div>}
                {h.verdict && <p className="text-sm"><span className="text-muted-foreground">Verdict: </span>{h.verdict}</p>}
              </div>
            )) : <p className="text-sm text-muted-foreground">No hearings.</p>}
          </CardContent></Card>
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
                      <p><span className="font-medium">{(STATUS_META[e.to_state] || {}).label || e.to_state}</span>
                        {e.actor_name && <span className="text-muted-foreground"> · {e.actor_name}</span>}
                        <span className="text-muted-foreground"> · {new Date(e.created_at).toLocaleString()}</span></p>
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

          {dialog?.kind === 'committee' ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Committee members (pick exactly 2)</Label>
                {committee.map((m) => (
                  <label key={m.id} className="flex items-center gap-2 text-sm">
                    <Checkbox checked={members.includes(m.id)} onCheckedChange={() => toggleMember(m.id)} />
                    {m.name}
                  </label>
                ))}
                {committee.length === 0 && <p className="text-sm text-muted-foreground">No hearing-committee members found.</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="when">Hearing date</Label>
                <Input id="when" type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} />
              </div>
            </div>
          ) : dialog?.kind === 'minutes' ? (
            <div className="space-y-3">
              <Textarea placeholder="Minutes — observations per shortcoming…" rows={5} value={text} onChange={(e) => setText(e.target.value)} />
              <Input placeholder="Verdict (e.g. submission not considered / compliance verified)" value={verdict} onChange={(e) => setVerdict(e.target.value)} />
            </div>
          ) : (
            <Textarea
              placeholder={dialog?.kind === 'issue' ? 'Clarification letter — list the shortcomings…'
                : dialog?.kind === 'text' ? 'Final order text…'
                : 'Add a note (optional)…'}
              rows={dialog?.kind === 'issue' || dialog?.kind === 'text' ? 6 : 3}
              value={text} onChange={(e) => setText(e.target.value)} />
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(null)}>Cancel</Button>
            <Button onClick={confirmDialog} disabled={confirmDisabled}>Confirm</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
