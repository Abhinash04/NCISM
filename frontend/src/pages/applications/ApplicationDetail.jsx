import { useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { ArrowLeft, Building2, Clock, FileCheck2, Mail, Gavel, Trash2, FileText, Download, CheckCircle2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { MarkdownRenderer } from '@/components/markdown/MarkdownRenderer';
import { DownloadMenu } from '@/components/common/DownloadMenu';
import { CasePdfViewer } from '@/features/applications/CasePdfViewer';
import { AiGenerateButton } from '@/components/common/AiGenerateButton';
import {
  genHearingMinutes, genDecisionNote, genPenaltyDescription, genClarificationResponse,
  genForwardNote, genReturnNote, genRejectNote, genHearingRequest, genClarificationReview,
} from '@/features/applications/generate';
import { getSourcePdf } from '@/features/applications/application.api';
import { downloadBlob } from '@/lib/download';
import { DragDropZone } from '@/features/documents/components/DragDropZone';
import { StructureViewer } from '@/features/workspace/components/StructureViewer';
import { useJob } from '@/features/workspace/hooks/useJob';
import {
  useApplication, useAllowedActions, useApplicationEvents, useApplicationAction, useDeleteApplication,
  useClarifications, useIssueClarification, useRespondClarification, useReviewClarification, useRequestRevision,
  useHearings, useCommitteeMembers, useLetters, previewLetter,
  usePenalties, useAddPenalty, useUpdatePenalty, useDeletePenalty, usePenaltyPolicy,
} from '@/features/applications/hooks';
import { useAuth } from '@/features/auth/AuthContext';
import { STATUS_META } from './ApplicationsList';

const PENALTY_LABELS = {
  seat_reduction: 'Seat reduction', denial: 'Denial', monetary: 'Monetary penalty',
  teacher_code_revocation: 'Teacher-code revocation',
};
const PENALTY_STATUSES = ['pending', 'applied', 'paid', 'waived'];

// Verdict options for the hearing-minutes dialog (no backend enum exists; free-text column).
const VERDICT_OPTIONS = [
  'Permission Granted',
  'Permission Granted with Conditions',
  'Seat Reduction Recommended',
  'Permission Denied',
  'Deferred for Clarification',
];

// Standard MESAR monetary fine auto-filled when a monetary penalty is selected
const STANDARD_MONETARY_FINE = 2500000;

const SYSTEM_LABELS = { ayurveda: 'Ayurveda', unani: 'Unani', siddha: 'Siddha', sowa_rigpa: 'Sowa-Rigpa' };

// Pure transitions handled by the generic action mutation.
const ACTION_DEFS = {
  process: { route: 'process', label: 'Process (run engine)', variant: 'default' },
  submit: { route: 'submit', label: 'Submit for review', variant: 'default' },
  forward: { route: 'review', body: { action: 'forward' }, label: 'Forward to board', variant: 'default', note: true },
  return: { route: 'review', body: { action: 'return' }, label: 'Return to consultant', variant: 'outline', note: true },
  reject: { route: 'decide', body: { action: 'reject' }, label: 'Reject', variant: 'destructive', note: true },
  revise: { route: 'revise', label: 'Reopen for revision', variant: 'default' },
};

// Actions with their own form dialog (kind drives which fields render).
const SPECIAL = {
  request_clarification: { label: 'Request clarification', variant: 'outline', kind: 'issue', letterKind: 'clarification' },
  request_hearing: { label: 'Request hearing', variant: 'outline', route: 'request-hearing', kind: 'note' },
  appoint_committee: { label: 'Appoint hearing committee', variant: 'default', route: 'appoint-committee', kind: 'committee' },
  record_minutes: { label: 'Record hearing minutes', variant: 'default', route: 'hearing/minutes', kind: 'minutes' },
  approve: { label: 'Approve (decide)', variant: 'default', kind: 'approve' },
  dispatch_order: { label: 'Dispatch final order', variant: 'default', route: 'dispatch', kind: 'text', field: 'orderText', letterKind: 'final_order' },
};

const LETTER_LABELS = {
  clarification: 'Clarification Letter',
  hearing_without_clarification: 'Hearing Notice',
  hearing_with_clarification: 'Hearing Notice (post-clarification)',
  final_order: 'Final Order',
};

const OUTCOMES = [
  { value: 'grant', label: 'Grant (full permission)' },
  { value: 'grant_with_conditions', label: 'Grant with conditions' },
  { value: 'reduce_intake', label: 'Grant with reduced intake' },
  { value: 'deny', label: 'Deny permission' },
];

/** Suggests a decision outcome from the punitive summary in the report. */
function defaultOutcome(app) {
  const p = (() => { try { return typeof app.report_json === 'string' ? JSON.parse(app.report_json) : app.report_json; } catch { return null; } })();
  const s = p?.punitiveSummary;
  const intake = app.intake || null;
  if (!s) return { outcome: 'grant', seats: intake };
  if (s.outcome === 'denial') return { outcome: 'deny', seats: null };
  if (s.totalSeatReduction > 0) return { outcome: 'reduce_intake', seats: intake ? Math.max(0, intake - Math.round(s.totalSeatReduction)) : null };
  return { outcome: 'grant', seats: intake };
}

export function ApplicationDetail() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { pathname } = useLocation();
  const listPath = pathname.replace(/\/[^/]+$/, '');

  const { data: app, isLoading, isError } = useApplication(id);
  const processing = app?.status === 'processing';
  const { data: actions = [] } = useAllowedActions(id, processing);
  const { data: events = [] } = useApplicationEvents(id, processing);
  const { data: rounds = [] } = useClarifications(id);
  const { data: hearings = [] } = useHearings(id);
  const { data: letters = [] } = useLetters(id);
  const { data: penalties = [] } = usePenalties(id);
  const { data: job, isPending: jobPending } = useJob(app?.job_id);
  const { hasPermission } = useAuth();
  const canManagePenalties = hasPermission('compliance:manage');
  const addPenalty = useAddPenalty(id);
  const updatePenalty = useUpdatePenalty(id);
  const deletePenalty = useDeletePenalty(id);
  // Bug 4: ghost-faculty penalty rate derived from the case's active punitive policy
  // (falls back to the standard ₹25 lakh if the policy has no monetary entry).
  const { data: penaltyPolicy } = usePenaltyPolicy(id);
  const ghostRate = penaltyPolicy?.ghostFacultyPenalty || STANDARD_MONETARY_FINE;

  // Bug 4: Penalty Amount Calculation state
  const [pType, setPType] = useState('monetary');
  const [pDesc, setPDesc] = useState('');
  const [ghostCount, setGhostCount] = useState('1');
  const [pAmount, setPAmount] = useState(String(STANDARD_MONETARY_FINE));
  const [delPenalty, setDelPenalty] = useState(null);

  // Auto-calculate the amount from the selected penalty type and ghost faculty count.
  // Ghost-faculty count is a human determination (not produced by the deterministic
  // assessment); the per-faculty rate is policy-derived (ghostRate).
  const onPenaltyType = (type) => {
    setPType(type);
    if (type === 'monetary') {
      const cnt = parseInt(ghostCount, 10) || 1;
      setPAmount(String(cnt * ghostRate));
    } else {
      setPAmount('');
    }
  };

  const onGhostCountChange = (val) => {
    setGhostCount(val);
    if (pType === 'monetary') {
      const cnt = parseInt(val, 10) || 1;
      setPAmount(String(cnt * ghostRate));
    }
  };

  const action = useApplicationAction(id);
  const issue = useIssueClarification(id);
  const respond = useRespondClarification(id);
  const reviewClarificationMut = useReviewClarification(id);
  const requestRevisionMut = useRequestRevision(id);
  const del = useDeleteApplication();

  const [dialog, setDialog] = useState(null); // { key, kind }
  const [confirmDel, setConfirmDel] = useState(false);
  const committeeOpen = dialog?.kind === 'committee';
  const { data: committee = [] } = useCommitteeMembers(committeeOpen);

  // Form fields shared by the dialogs.
  const [text, setText] = useState('');      // note / letter / order / minutes
  const [verdict, setVerdict] = useState('');
  const [members, setMembers] = useState([]);
  const [when, setWhen] = useState('');
  const [outcome, setOutcome] = useState('grant');
  const [seats, setSeats] = useState('');
  const [drafting, setDrafting] = useState(false);
  const [respText, setRespText] = useState('');
  const [respFile, setRespFile] = useState(null);

  // Bug 1: Clarification review state
  const [reviewRemarks, setReviewRemarks] = useState('');
  const [reviewVerdict, setReviewVerdict] = useState('accepted');

  if (isLoading) return <div className="p-8 text-muted-foreground">Loading…</div>;
  if (isError || !app) return <div className="p-8 text-destructive">Case not found.</div>;

  const meta = STATUS_META[app.status] || { label: app.status, variant: 'secondary' };
  const busy = action.isPending || issue.isPending || respond.isPending || reviewClarificationMut.isPending || requestRevisionMut.isPending;
  const canDelete = actions.includes('delete');
  const buttonActions = actions.filter((a) => a !== 'respond' && a !== 'delete');

  const onDelete = () => del.mutate(id, {
    onSuccess: () => { toast.success('Case deleted.'); navigate(listPath); },
    onError: () => { toast.error('Could not delete this case.'); setConfirmDel(false); },
  });

  const openDialog = async (key) => {
    setText(''); setVerdict(''); setMembers([]); setWhen('');
    const sp = SPECIAL[key];
    if (sp?.kind === 'approve') { const d = defaultOutcome(app); setOutcome(d.outcome); setSeats(d.seats ?? ''); }
    setDialog({ key, kind: sp?.kind || (ACTION_DEFS[key]?.note ? 'note' : null) });
    // Prefill the editable letter draft for clarification / final-order actions.
    if (sp?.letterKind) {
      setDrafting(true);
      try { setText(await previewLetter(id, sp.letterKind)); } catch { /* leave blank */ } finally { setDrafting(false); }
    }
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
    else if (sp?.kind === 'approve') action.mutate({ action: 'decide', body: { action: 'approve', outcome, approvedSeats: outcome === 'reduce_intake' && seats !== '' ? Number(seats) : undefined, note: text || undefined } });
    else if (sp?.kind === 'note') action.mutate({ action: sp.route, body: { note: text } });
    else if (sp?.kind === 'text') action.mutate({ action: sp.route, body: { [sp.field]: text } });
    else if (sp?.kind === 'minutes') action.mutate({ action: sp.route, body: { minutes: text, verdict } });
    else if (sp?.kind === 'committee') action.mutate({ action: sp.route, body: { memberIds: members, scheduledAt: when || null } });
    else { // pure note transition (forward/return/reject)
      const def = ACTION_DEFS[key];
      action.mutate({ action: def.route, body: { ...(def.body || {}), ...(text ? { note: text } : {}) } });
    }
    setDialog(null);
  };
  const confirmDisabled = busy || drafting
    || (dialog?.kind === 'issue' && !text.trim())
    || (dialog?.kind === 'committee' && members.length !== 2);

  const submitResponse = () => respond.mutate({ responseText: respText, file: respFile }, {
    onSuccess: () => { setRespText(''); setRespFile(null); },
  });

  const submitReview = (verdictValue) => {
    if (verdictValue === 'requires_revision') {
      requestRevisionMut.mutate({ remarks: reviewRemarks }, {
        onSuccess: () => { setReviewRemarks(''); toast.success('Revision R1 requested from college.'); },
      });
    } else {
      reviewClarificationMut.mutate({ remarks: reviewRemarks, verdict: verdictValue }, {
        onSuccess: () => { setReviewRemarks(''); toast.success('Clarification reviewed and acknowledged.'); },
      });
    }
  };

  const dialogTitle = dialog ? (SPECIAL[dialog.key]?.label || ACTION_DEFS[dialog.key]?.label) : '';

  // Latest clarification round for review card
  const latestRound = rounds.length ? rounds[rounds.length - 1] : null;

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-5xl mx-auto">
      <Button variant="ghost" size="sm" onClick={() => navigate(listPath)}>
        <ArrowLeft className="h-4 w-4 mr-1" /> Back to cases
      </Button>

      <div className="flex items-start gap-4">
        <div className="p-3 bg-primary/10 rounded-lg text-primary shrink-0"><Building2 className="h-6 w-6" /></div>
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold tracking-tight break-words">{app.institution_name}</h1>
          <p className="text-muted-foreground mt-1 font-mono text-sm">
            {app.institute_id} · {SYSTEM_LABELS[app.system] || app.system} · {app.state}
            {app.session ? ` · ${app.session}` : ''}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Badge variant={meta.variant}>{meta.label}</Badge>
            {app.outcome && (
              <Badge variant="outline">
                {(OUTCOMES.find((o) => o.value === app.outcome) || {}).label || app.outcome}
                {app.outcome === 'reduce_intake' && app.approved_seats != null ? ` · ${app.approved_seats} seats` : ''}
              </Badge>
            )}
            {app.compliance_status && (
              <Badge variant={app.compliance_status === 'complied' ? 'default' : 'secondary'}>
                compliance: {app.compliance_status}
              </Badge>
            )}
          </div>
        </div>
        {canDelete && (
          <Button
            variant="ghost" size="icon"
            className="shrink-0 text-muted-foreground hover:text-destructive"
            title="Delete case" onClick={() => setConfirmDel(true)}>
            <Trash2 className="h-5 w-5" />
          </Button>
        )}
      </div>

      {app.status === 'failed' && app.error && (
        <p className="text-sm text-destructive rounded-lg border border-destructive/30 bg-destructive/5 p-3">
          Processing failed: {app.error}
        </p>
      )}

      {/* Bug 5 Warning Banner when compliance is not complied for approved case */}
      {app.status === 'approved' && app.compliance_status && app.compliance_status !== 'complied' && (
        <div className="rounded-lg border-2 border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-900 dark:text-amber-200 flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
          <div>
            <p className="font-semibold">Dispatch Final Order Blocked</p>
            <p className="text-xs opacity-90 mt-0.5">
              The Dispatch Final Order action remains disabled until all pending compliance penalties are marked as complied (Current status: {app.compliance_status}).
            </p>
          </div>
        </div>
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
            <div className="flex justify-end">
              <AiGenerateButton generate={() => genClarificationResponse(rounds)} onGenerated={setRespText} disabled={busy} audit={{ applicationId: id, field: 'clarification_response' }} />
            </div>
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

      {/* Bug 1: Clarification Review Interface for the Consultant */}
      {(app.status === 'clarification_responded' || actions.includes('review_clarification')) && latestRound && (
        <Card className="border-2 border-primary/40 bg-primary/5">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-primary" /> Clarification Review & Verdict (Consultant)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border bg-card p-4 space-y-2 text-sm">
              <p className="font-medium text-xs uppercase text-muted-foreground tracking-wider">Submitted Clarification (Round {latestRound.round})</p>
              {latestRound.response_text ? (
                <p className="whitespace-pre-wrap">{latestRound.response_text}</p>
              ) : (
                <p className="italic text-muted-foreground">No text response provided.</p>
              )}
              {latestRound.response_file && (
                <div className="flex items-center gap-2 pt-2 border-t text-xs text-primary font-medium">
                  📎 Attached document: <span>{latestRound.response_file}</span>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold">Consultant Review Remarks</Label>
                <AiGenerateButton generate={() => genClarificationReview(rounds)} onGenerated={setReviewRemarks} disabled={busy} audit={{ applicationId: id, field: 'clarification_review' }} />
              </div>
              <Textarea
                placeholder="Record structured observations on the college's submitted clarification..."
                rows={4}
                value={reviewRemarks}
                onChange={(e) => setReviewRemarks(e.target.value)}
              />
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Select value={reviewVerdict} onValueChange={setReviewVerdict}>
                <SelectTrigger className="w-56"><SelectValue placeholder="Select verdict" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="accepted">Accepted (Satisfactory)</SelectItem>
                  <SelectItem value="requires_revision">Requires Revision (R1)</SelectItem>
                </SelectContent>
              </Select>

              <Button
                variant={reviewVerdict === 'requires_revision' ? 'outline' : 'default'}
                disabled={busy}
                onClick={() => submitReview(reviewVerdict)}
              >
                {busy ? 'Processing…' : reviewVerdict === 'requires_revision' ? 'Request Revision (R1)' : 'Acknowledge & Accept Review'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="report">
        <TabsList>
          <TabsTrigger value="report">Assessment report</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          {app.job_id && <TabsTrigger value="structure">Extracted structure</TabsTrigger>}
          <TabsTrigger value="clarifications">Clarifications{rounds.length ? ` (${rounds.length})` : ''}</TabsTrigger>
          <TabsTrigger value="hearings">Hearings{hearings.length ? ` (${hearings.length})` : ''}</TabsTrigger>
          <TabsTrigger value="letters">Letters{letters.length ? ` (${letters.length})` : ''}</TabsTrigger>
          <TabsTrigger value="penalties">Penalties{penalties.length ? ` (${penalties.length})` : ''}</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
        </TabsList>

        <TabsContent value="report">
          <Card><CardContent className="pt-6">
            {app.report_markdown ? (
              <>
                <div className="flex justify-end mb-3">
                  <DownloadMenu filename={`${app.institute_id || app.id}-assessment-report`} markdown={app.report_markdown} label="Download report" />
                </div>
                <div className="prose prose-sm dark:prose-invert max-w-none"><MarkdownRenderer markdown={app.report_markdown} /></div>
              </>
            ) : <p className="text-sm text-muted-foreground">No report yet. Run <strong>Process</strong> to generate the assessment.</p>}
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="documents">
          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base flex items-center gap-2"><FileText className="h-4 w-4" /> Uploaded visitation report</CardTitle>
              <Button variant="outline" size="sm" onClick={() => getSourcePdf(id)
                .then((b) => downloadBlob(b, `${app.institute_id || app.id}-visitor-report.pdf`))
                .catch(() => toast.error('No uploaded report to download'))}>
                <Download className="h-4 w-4 mr-1" /> Download Visitor Report (PDF)
              </Button>
            </CardHeader>
            <CardContent className="p-3 md:p-4"><CasePdfViewer id={id} /></CardContent>
          </Card>
        </TabsContent>

        {app.job_id && (
          <TabsContent value="structure">
            <Card><CardContent className="p-0">
              <div className="h-[70vh] min-h-0">
                {jobPending ? (
                  <div className="flex h-full items-center justify-center text-muted-foreground">Loading extracted structure…</div>
                ) : job ? (
                  <StructureViewer job={job} />
                ) : (
                  <div className="flex h-full items-center justify-center px-6 text-center text-sm text-muted-foreground">
                    Extracted structure is no longer available (processing artifacts expired). Re-run <strong className="mx-1">Process</strong> to regenerate it.
                  </div>
                )}
              </div>
            </CardContent></Card>
          </TabsContent>
        )}

        <TabsContent value="clarifications">
          <Card><CardContent className="pt-6 space-y-4">
            {rounds.length ? rounds.map((r) => (
              <div key={r.id} className="rounded-lg border p-4 space-y-3">
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
                {r.review_remarks && (
                  <div className="border-t pt-2 bg-muted/20 p-2 rounded text-xs space-y-1">
                    <p className="font-semibold text-foreground">
                      consultant Review Remarks ({r.review_verdict || 'Reviewed'}){r.reviewed_by_name ? ` · ${r.reviewed_by_name}` : ''}
                    </p>
                    <p className="text-muted-foreground whitespace-pre-wrap">{r.review_remarks}</p>
                  </div>
                )}
              </div>
            )) : <p className="text-sm text-muted-foreground">No clarifications issued.</p>}
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="letters">
          <Card><CardContent className="pt-6 space-y-4">
            {letters.length ? letters.map((l) => (
              <details key={l.id} className="rounded-lg border p-4">
                <summary className="cursor-pointer text-sm font-medium flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  {LETTER_LABELS[l.kind] || l.kind}
                  {l.ref_no ? ` · ${l.ref_no}` : ''}
                  <span className="text-muted-foreground font-normal">· {new Date(l.created_at).toLocaleDateString()}</span>
                </summary>
                <div className="mt-4 border-t pt-4">
                  <div className="flex justify-end mb-3">
                    <DownloadMenu filename={`${app.institute_id || app.id}-${l.kind}${l.ref_no ? `-${l.ref_no}` : ''}`} markdown={l.content_markdown} />
                  </div>
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <MarkdownRenderer markdown={l.content_markdown} />
                  </div>
                </div>
              </details>
            )) : <p className="text-sm text-muted-foreground">No letters issued yet.</p>}
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

        <TabsContent value="penalties">
          <Card><CardContent className="pt-6 space-y-4">
            {penalties.length ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-muted-foreground uppercase border-b">
                    <tr><th className="py-2">Type</th><th className="py-2">Detail</th><th className="py-2">Seats/Amount</th><th className="py-2">Source</th><th className="py-2">Status</th>{canManagePenalties && <th className="py-2 w-10 sr-only">Actions</th>}</tr>
                  </thead>
                  <tbody>
                    {penalties.map((p) => (
                      <tr key={p.id} className="border-b last:border-0">
                        <td className="py-2 font-medium">{PENALTY_LABELS[p.type] || p.type}</td>
                        <td className="py-2 text-muted-foreground whitespace-normal break-words min-w-[320px] max-w-[520px]" title={p.description}>{p.description || '—'}</td>
                        <td className="py-2">{p.type === 'monetary' ? `₹${Number(p.amount).toLocaleString('en-IN')}` : (p.seats != null ? `${p.seats} seats` : '—')}</td>
                        <td className="py-2 text-muted-foreground">{p.source}</td>
                        <td className="py-2">
                          {canManagePenalties ? (
                            <Select value={p.status} onValueChange={(status) => updatePenalty.mutate({ penaltyId: p.id, status })}>
                              <SelectTrigger className="h-7 w-28"><SelectValue /></SelectTrigger>
                              <SelectContent>{PENALTY_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                            </Select>
                          ) : <Badge variant={p.status === 'paid' || p.status === 'waived' ? 'default' : 'secondary'}>{p.status}</Badge>}
                        </td>
                        {canManagePenalties && (
                          <td className="py-2 text-right">
                            <Button
                              variant="ghost" size="icon"
                              className="h-7 w-7 text-muted-foreground hover:text-destructive"
                              title="Delete penalty" onClick={() => setDelPenalty(p)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : <p className="text-sm text-muted-foreground">No penalties. Seat-reduction / denial penalties are derived automatically once the board decides.</p>}

            {/* Bug 4: Enhanced Penalty Calculation */}
            {canManagePenalties && (
              <div className="border-t pt-4 space-y-3">
                <p className="text-sm font-medium">Add a penalty (monetary / teacher-code revocation)</p>
                <div className="grid sm:grid-cols-2 gap-3">
                  <Select value={pType} onValueChange={onPenaltyType}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monetary">Monetary penalty (Ghost Faculty)</SelectItem>
                      <SelectItem value="teacher_code_revocation">Teacher-code revocation</SelectItem>
                    </SelectContent>
                  </Select>

                  {pType === 'monetary' && (
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Label htmlFor="ghostCount" className="text-xs text-muted-foreground shrink-0">Ghost Faculty Count:</Label>
                        <Input
                          id="ghostCount"
                          type="number"
                          min="1"
                          className="h-8 w-20"
                          value={ghostCount}
                          onChange={(e) => onGhostCountChange(e.target.value)}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {pType === 'monetary' && (
                  <div className="space-y-1">
                    <Label htmlFor="pAmount" className="text-xs font-semibold">Total Monetary Fine (₹)</Label>
                    <Input id="pAmount" type="number" value={pAmount} onChange={(e) => setPAmount(e.target.value)} />
                    <p className="text-xs text-muted-foreground">
                      Calculation: {parseInt(ghostCount, 10) || 1} Ghost Faculty × ₹{ghostRate.toLocaleString('en-IN')} = ₹{Number(pAmount || 0).toLocaleString('en-IN')}
                      <span className="ml-1 opacity-70">(rate from punitive policy)</span>
                    </p>
                  </div>
                )}

                <div className="flex justify-end">
                  <AiGenerateButton generate={() => genPenaltyDescription(app, pType, ghostCount, ghostRate)} onGenerated={setPDesc} disabled={addPenalty.isPending} audit={{ applicationId: id, field: 'penalty_description' }} />
                </div>
                <Textarea placeholder="Description (e.g. Ghost faculty — Dr. X)" value={pDesc} onChange={(e) => setPDesc(e.target.value)} />
                <Button
                  disabled={addPenalty.isPending || (pType === 'monetary' && !pAmount)}
                  onClick={() => addPenalty.mutate(
                    { type: pType, description: pDesc, amount: pType === 'monetary' ? Number(pAmount) : undefined },
                    { onSuccess: () => { setPDesc(''); setGhostCount('1'); setPAmount(pType === 'monetary' ? String(STANDARD_MONETARY_FINE) : ''); } },
                  )}>
                  {addPenalty.isPending ? 'Adding…' : 'Add penalty'}
                </Button>
              </div>
            )}
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
                    <div className="flex-1">
                      <p><span className="font-medium">{(STATUS_META[e.to_state] || {}).label || e.to_state}</span>
                        {e.actor_name && <span className="text-muted-foreground"> · {e.actor_name}</span>}
                        <span className="text-muted-foreground"> · {new Date(e.created_at).toLocaleString()}</span></p>
                      {/* Bug 6: Render Markdown in Timeline */}
                      {e.note && (
                        <div className="mt-1 prose prose-sm dark:prose-invert max-w-none text-muted-foreground">
                          <MarkdownRenderer markdown={e.note} />
                        </div>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Bug 2: AI Generate buttons in ALL dialogs */}
      <Dialog open={!!dialog} onOpenChange={(o) => !o && setDialog(null)}>
        <DialogContent className={dialog?.kind === 'issue' || dialog?.kind === 'text' ? 'sm:max-w-3xl' : undefined}>
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
              <div className="flex justify-end">
                <AiGenerateButton generate={() => genHearingMinutes(app)} onGenerated={setText} disabled={busy} audit={{ applicationId: id, field: 'hearing_minutes' }} />
              </div>
              <Textarea placeholder="Minutes — observations per shortcoming…" rows={5} value={text} onChange={(e) => setText(e.target.value)} />
              <Select value={verdict} onValueChange={setVerdict}>
                <SelectTrigger><SelectValue placeholder="Select verdict" /></SelectTrigger>
                <SelectContent>
                  {VERDICT_OPTIONS.map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          ) : dialog?.kind === 'approve' ? (
            <div className="space-y-3">
              <div className="space-y-2">
                <Label>Decision outcome</Label>
                <Select value={outcome} onValueChange={setOutcome}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {OUTCOMES.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">Pre-selected from the assessment's punitive summary; adjust if needed.</p>
              </div>
              {outcome === 'reduce_intake' && (
                <div className="space-y-2">
                  <Label htmlFor="seats">Approved seats</Label>
                  <Input id="seats" type="number" value={seats} onChange={(e) => setSeats(e.target.value)} />
                </div>
              )}
              <div className="flex justify-end">
                <AiGenerateButton generate={() => genDecisionNote(app, { outcome, seats })} onGenerated={setText} disabled={busy} audit={{ applicationId: id, field: 'decision_note' }} />
              </div>
              <Textarea placeholder="Decision note (optional)…" rows={3} value={text} onChange={(e) => setText(e.target.value)} />
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs text-muted-foreground">
                  {dialog?.kind === 'issue' || dialog?.kind === 'text'
                    ? (drafting ? 'Drafting the official letter…' : 'Auto-drafted from the assessment — review and edit before issuing.')
                    : 'Draft context-aware note before submitting.'}
                </p>
                <AiGenerateButton
                  generate={() => {
                    if (dialog?.kind === 'issue' || dialog?.kind === 'text') {
                      return previewLetter(id, dialog.kind === 'issue' ? 'clarification' : 'final_order');
                    }
                    if (dialog?.key === 'forward') return genForwardNote(app);
                    if (dialog?.key === 'return') return genReturnNote(app);
                    if (dialog?.key === 'reject') return genRejectNote(app);
                    if (dialog?.key === 'request_hearing') return genHearingRequest(app);
                    return Promise.resolve('');
                  }}
                  onGenerated={setText}
                  disabled={busy || drafting}
                  audit={{ applicationId: id, field: dialog?.key || dialog?.kind || 'note' }}
                />
              </div>
              <Textarea
                className={(dialog?.kind === 'issue' || dialog?.kind === 'text') ? 'font-mono text-xs' : undefined}
                placeholder={dialog?.kind === 'issue' ? 'Clarification letter…'
                  : dialog?.kind === 'text' ? 'Final order…'
                  : 'Add a note (optional)…'}
                rows={dialog?.kind === 'issue' || dialog?.kind === 'text' ? 16 : 4}
                value={text} onChange={(e) => setText(e.target.value)} />
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(null)}>Cancel</Button>
            <Button onClick={confirmDialog} disabled={confirmDisabled}>Confirm</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!delPenalty} onOpenChange={(o) => !o && setDelPenalty(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Remove this penalty?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">
            This removes the {PENALTY_LABELS[delPenalty?.type] || delPenalty?.type} penalty from the
            case ledger. This cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDelPenalty(null)} disabled={deletePenalty.isPending}>Cancel</Button>
            <Button variant="destructive" disabled={deletePenalty.isPending}
              onClick={() => deletePenalty.mutate(delPenalty.id, {
                onSuccess: () => { toast.success('Penalty removed.'); setDelPenalty(null); },
                onError: () => toast.error('Could not remove the penalty.'),
              })}>
              {deletePenalty.isPending ? 'Removing…' : 'Remove'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={confirmDel} onOpenChange={(o) => !o && setConfirmDel(false)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Delete this case?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">
            This permanently removes the case for {app.institution_name} and its uploaded file from
            the system. This cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDel(false)} disabled={del.isPending}>Cancel</Button>
            <Button variant="destructive" onClick={onDelete} disabled={del.isPending}>
              {del.isPending ? 'Deleting…' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
