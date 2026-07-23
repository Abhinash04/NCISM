import { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { ArrowLeft, Plus, Users, Calendar, FileText, CheckCircle2, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@/features/auth/AuthContext';
import { DownloadMenu } from '@/components/common/DownloadMenu';
import { useMeeting, useAddMeetingItem, useUpdateMeeting, useUpdateMeetingItem, useConfirmMeeting } from '@/features/meetings/hooks';
import { useApplications } from '@/features/applications/hooks';
import { AiGenerateButton } from '@/components/common/AiGenerateButton';
import { genMeetingMinutes } from '@/features/applications/generate';
import { STATUS_META } from '@/pages/applications/ApplicationsList';

export function MeetingDetail() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { pathname } = useLocation();
  const listPath = pathname.replace(/\/[^/]+$/, '');
  const { hasPermission } = useAuth();
  const canManage = hasPermission('meeting:manage');

  const { data: meeting, isLoading, isError } = useMeeting(id);
  const { data: cases = [] } = useApplications();
  const addItem = useAddMeetingItem(id);
  const updateMeetingMut = useUpdateMeeting(id);
  const updateItemMut = useUpdateMeetingItem(id);
  const confirm = useConfirmMeeting(id);

  const [pick, setPick] = useState('');
  const [minutes, setMinutes] = useState('');

  // Structured meeting fields
  const [agendaText, setAgendaText] = useState('');
  const [participants, setParticipants] = useState('');
  const [observations, setObservations] = useState('');
  const [actionItems, setActionItems] = useState('');
  const [recommendations, setRecommendations] = useState('');

  // Per-item expanded and edit states
  const [expandedItems, setExpandedItems] = useState({});
  const [itemEdits, setItemEdits] = useState({});

  useEffect(() => {
    if (meeting) {
      setAgendaText(meeting.agenda_text || '');
      setParticipants(meeting.participants || '');
      setObservations(meeting.observations || '');
      setActionItems(meeting.action_items || '');
      setRecommendations(meeting.recommendations || '');
      if (meeting.minutes_text) setMinutes(meeting.minutes_text);

      const edits = {};
      (meeting.items || []).forEach((item) => {
        edits[item.id] = {
          discussionNotes: item.discussion_notes || '',
          itemDecision: item.item_decision || '',
          itemObservations: item.item_observations || '',
        };
      });
      setItemEdits(edits);
    }
  }, [meeting]);

  if (isLoading) return <div className="p-8 text-muted-foreground">Loading…</div>;
  if (isError || !meeting) return <div className="p-8 text-destructive">Meeting not found.</div>;

  const onAgenda = new Set((meeting.items || []).map((i) => i.application_id));
  const BOARD_READY = new Set(['board_review', 'hearing_requested', 'hearing_scheduled', 'approved']);
  const boardReady = cases.filter((c) => BOARD_READY.has(c.status) && !onAgenda.has(c.id));
  const confirmed = meeting.status === 'confirmed';

  const handleSaveMeetingDetails = () => {
    updateMeetingMut.mutate({
      agendaText,
      participants,
      observations,
      actionItems,
      recommendations,
    }, {
      onSuccess: () => toast.success('Meeting details updated.'),
      onError: () => toast.error('Failed to update meeting details.'),
    });
  };

  const handleSaveItem = (itemId) => {
    const editData = itemEdits[itemId] || {};
    updateItemMut.mutate({
      itemId,
      payload: editData,
    }, {
      onSuccess: () => toast.success('Item details updated.'),
      onError: () => toast.error('Failed to update item.'),
    });
  };

  const toggleExpand = (itemId) => {
    setExpandedItems((prev) => ({ ...prev, [itemId]: !prev[itemId] }));
  };

  const updateItemEdit = (itemId, field, value) => {
    setItemEdits((prev) => ({
      ...prev,
      [itemId]: { ...(prev[itemId] || {}), [field]: value },
    }));
  };

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-5xl mx-auto">
      <Button variant="ghost" size="sm" onClick={() => navigate(listPath)}>
        <ArrowLeft className="h-4 w-4 mr-1" /> Back to meetings
      </Button>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Board Meeting {meeting.number}</h1>
          <p className="text-muted-foreground mt-1 text-sm flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            {meeting.scheduled_at ? new Date(meeting.scheduled_at).toLocaleString() : 'Date not set'}
            {meeting.created_by_name ? ` · Organized by ${meeting.created_by_name}` : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={confirmed ? 'default' : 'secondary'} className="text-sm py-1 px-3">
            {confirmed ? 'Confirmed' : 'Scheduled / In Progress'}
          </Badge>
          {canManage && !confirmed && (
            <Button size="sm" onClick={handleSaveMeetingDetails} disabled={updateMeetingMut.isPending}>
              {updateMeetingMut.isPending ? 'Saving...' : 'Save Meeting Details'}
            </Button>
          )}
        </div>
      </div>

      {canManage && !confirmed && (
        <Card>
          <CardHeader><CardTitle className="text-base">Add a board-ready case</CardTitle></CardHeader>
          <CardContent className="flex gap-2">
            <Select value={pick} onValueChange={setPick}>
              <SelectTrigger className="flex-1"><SelectValue placeholder="Pick a board case…" /></SelectTrigger>
              <SelectContent>
                {boardReady.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.institute_id} · {c.institution_name?.slice(0, 50)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button disabled={!pick || addItem.isPending} onClick={() => addItem.mutate(pick, { onSuccess: () => setPick('') })}>
              <Plus className="h-4 w-4 mr-1" /> Add
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Participants & Overall Agenda Card */}
      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Users className="h-4 w-4" /> Meeting Setup & Participants</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold">Participants</Label>
              {canManage && !confirmed && (
                <AiGenerateButton
                  generate={() => Promise.resolve('Chairperson NCISM; President MARB-ISM; Board Members; Secretary NCISM; Consultants.')}
                  onGenerated={setParticipants}
                />
              )}
            </div>
            <Input
              placeholder="e.g. Dr. A (Chairperson), Dr. B (President MARB), Secretary NCISM"
              value={participants}
              onChange={(e) => setParticipants(e.target.value)}
              disabled={confirmed || !canManage}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold">Meeting Agenda</Label>
              {canManage && !confirmed && (
                <AiGenerateButton
                  generate={() => Promise.resolve('1. Confirmation of previous meeting minutes.\n2. Review of pending Section-28/29 visitation reports.\n3. Consideration of hearing committee recommendations.\n4. Decisions on permission renewal proposals.')}
                  onGenerated={setAgendaText}
                />
              )}
            </div>
            <Textarea
              placeholder="Record overall meeting agenda points..."
              rows={3}
              value={agendaText}
              onChange={(e) => setAgendaText(e.target.value)}
              disabled={confirmed || !canManage}
            />
          </div>
        </CardContent>
      </Card>

      {/* Applications Discussed & Per-Item Details */}
      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><FileText className="h-4 w-4" /> Applications Discussed ({(meeting.items || []).length})</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {(meeting.items || []).length ? (
            <div className="space-y-3">
              {meeting.items.map((i) => {
                const meta = STATUS_META[i.status] || { label: i.status, variant: 'secondary' };
                const isExpanded = !!expandedItems[i.id];
                const edits = itemEdits[i.id] || {};

                return (
                  <div key={i.id} className="border rounded-lg p-4 space-y-3 bg-card hover:border-primary/50 transition-colors">
                    <div className="flex items-center justify-between cursor-pointer" onClick={() => toggleExpand(i.id)}>
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-xs text-muted-foreground font-bold">{i.institute_id}</span>
                        <span className="font-medium text-sm">{i.institution_name}</span>
                        <Badge variant={meta.variant}>{meta.label}</Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        {i.decision && <span className="text-xs text-muted-foreground hidden sm:inline">Decision: {i.decision}</span>}
                        <Button variant="ghost" size="icon" className="h-7 w-7">
                          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="pt-3 border-t space-y-3 text-sm">
                        <div className="grid sm:grid-cols-2 gap-3">
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                              <Label className="text-xs font-semibold">Discussion Points</Label>
                              {canManage && !confirmed && (
                                <AiGenerateButton
                                  generate={() => Promise.resolve(`Board deliberated on assessment findings and college clarification for ${i.institution_name}.`)}
                                  onGenerated={(txt) => updateItemEdit(i.id, 'discussionNotes', txt)}
                                />
                              )}
                            </div>
                            <Textarea
                              placeholder="Discussion notes for this case..."
                              rows={2}
                              value={edits.discussionNotes || ''}
                              onChange={(e) => updateItemEdit(i.id, 'discussionNotes', e.target.value)}
                              disabled={confirmed || !canManage}
                            />
                          </div>

                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                              <Label className="text-xs font-semibold">Item Decision</Label>
                              {canManage && !confirmed && (
                                <AiGenerateButton
                                  generate={() => Promise.resolve(`Resolved to ${i.decision || 'grant permission with standard intake'}.`)}
                                  onGenerated={(txt) => updateItemEdit(i.id, 'itemDecision', txt)}
                                />
                              )}
                            </div>
                            <Textarea
                              placeholder="Decision taken for this item..."
                              rows={2}
                              value={edits.itemDecision || ''}
                              onChange={(e) => updateItemEdit(i.id, 'itemDecision', e.target.value)}
                              disabled={confirmed || !canManage}
                            />
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <Label className="text-xs font-semibold">Board Observations</Label>
                            {canManage && !confirmed && (
                              <AiGenerateButton
                                generate={() => Promise.resolve('Observations on faculty availability and hospital infrastructure compliance recorded.')}
                                onGenerated={(txt) => updateItemEdit(i.id, 'itemObservations', txt)}
                              />
                            )}
                          </div>
                          <Input
                            placeholder="Item-level observations..."
                            value={edits.itemObservations || ''}
                            onChange={(e) => updateItemEdit(i.id, 'itemObservations', e.target.value)}
                            disabled={confirmed || !canManage}
                          />
                        </div>

                        <div className="flex justify-end gap-2 pt-1">
                          <Button variant="outline" size="sm" onClick={() => navigate(`${listPath.replace(/meetings$/, 'applications')}/${i.application_id}`)}>
                            View Case
                          </Button>
                          {canManage && !confirmed && (
                            <Button size="sm" onClick={() => handleSaveItem(i.id)} disabled={updateItemMut.isPending}>
                              Save Item
                            </Button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : <p className="text-sm text-muted-foreground">No agenda items added yet.</p>}
        </CardContent>
      </Card>

      {/* Board Observations, Action Items & Recommendations */}
      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><CheckCircle2 className="h-4 w-4" /> Board Findings & Action Items</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold">Overall Board Observations</Label>
              {canManage && !confirmed && (
                <AiGenerateButton
                  generate={() => Promise.resolve('Board observed general improvement in biometric AEBAS compliance across institutions, but directed strict enforcement of ghost faculty penalties.')}
                  onGenerated={setObservations}
                />
              )}
            </div>
            <Textarea
              placeholder="Record general observations of the Board..."
              rows={3}
              value={observations}
              onChange={(e) => setObservations(e.target.value)}
              disabled={confirmed || !canManage}
            />
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold">Action Items</Label>
                {canManage && !confirmed && (
                  <AiGenerateButton
                    generate={() => Promise.resolve('1. Issue clarification letters for cases with pending deficiencies.\n2. Schedule hearings for cases where seat reduction is proposed.')}
                    onGenerated={setActionItems}
                  />
                )}
              </div>
              <Textarea
                placeholder="List action items to follow up..."
                rows={3}
                value={actionItems}
                onChange={(e) => setActionItems(e.target.value)}
                disabled={confirmed || !canManage}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold">Final Recommendations</Label>
                {canManage && !confirmed && (
                  <AiGenerateButton
                    generate={() => Promise.resolve('Communicate decisions to state counselling authorities before counseling deadline.')}
                    onGenerated={setRecommendations}
                  />
                )}
              </div>
              <Textarea
                placeholder="Final recommendations..."
                rows={3}
                value={recommendations}
                onChange={(e) => setRecommendations(e.target.value)}
                disabled={confirmed || !canManage}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Official Meeting Minutes */}
      <Card>
        <CardHeader><CardTitle className="text-base">Official Meeting Minutes</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {confirmed ? (
            <>
              {meeting.minutes_text && (
                <div className="flex justify-end">
                  <DownloadMenu filename={`${meeting.number}-minutes`.replace(/\//g, '-')} markdown={meeting.minutes_text} label="Download minutes" />
                </div>
              )}
              <p className="text-sm whitespace-pre-wrap">{meeting.minutes_text || 'Confirmed (no minutes text).'}</p>
            </>
          ) : canManage ? (
            <>
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">Click AI Generate to compile structured agenda, decisions, observations, action items into final minutes draft.</p>
                <AiGenerateButton generate={() => genMeetingMinutes({ ...meeting, agenda_text: agendaText, participants, observations, action_items: actionItems, recommendations })} onGenerated={setMinutes} disabled={confirm.isPending} />
              </div>
              <Textarea placeholder="Minutes of the meeting…" rows={6} value={minutes} onChange={(e) => setMinutes(e.target.value)} />
              <Button onClick={() => confirm.mutate(minutes)} disabled={confirm.isPending}>
                {confirm.isPending ? 'Confirming…' : 'Confirm minutes'}
              </Button>
            </>
          ) : <p className="text-sm text-muted-foreground">Minutes not yet confirmed.</p>}
        </CardContent>
      </Card>
    </div>
  );
}
