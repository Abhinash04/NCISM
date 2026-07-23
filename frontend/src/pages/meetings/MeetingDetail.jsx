import { useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { ArrowLeft, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@/features/auth/AuthContext';
import { DownloadMenu } from '@/components/common/DownloadMenu';
import { useMeeting, useAddMeetingItem, useConfirmMeeting } from '@/features/meetings/hooks';
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
  const confirm = useConfirmMeeting(id);

  const [pick, setPick] = useState('');
  const [minutes, setMinutes] = useState('');

  if (isLoading) return <div className="p-8 text-muted-foreground">Loading…</div>;
  if (isError || !meeting) return <div className="p-8 text-destructive">Meeting not found.</div>;

  const onAgenda = new Set((meeting.items || []).map((i) => i.application_id));
  // Cases at (or just past) the board — the secretariat records them in the meeting
  // agenda, which may happen after the board has already decided.
  const BOARD_READY = new Set(['board_review', 'hearing_requested', 'hearing_scheduled', 'approved']);
  const boardReady = cases.filter((c) => BOARD_READY.has(c.status) && !onAgenda.has(c.id));
  const confirmed = meeting.status === 'confirmed';

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-4xl mx-auto">
      <Button variant="ghost" size="sm" onClick={() => navigate(listPath)}>
        <ArrowLeft className="h-4 w-4 mr-1" /> Back to meetings
      </Button>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Meeting {meeting.number}</h1>
          <p className="text-muted-foreground mt-1">
            {meeting.scheduled_at ? new Date(meeting.scheduled_at).toLocaleString() : 'No date'}
            {meeting.created_by_name ? ` · ${meeting.created_by_name}` : ''}
          </p>
        </div>
        <Badge variant={confirmed ? 'default' : 'secondary'}>{meeting.status}</Badge>
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

      <Card>
        <CardHeader><CardTitle className="text-base">Agenda ({(meeting.items || []).length})</CardTitle></CardHeader>
        <CardContent>
          {(meeting.items || []).length ? (
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted-foreground uppercase border-b">
                <tr><th className="py-2">Institution</th><th className="py-2">Status</th><th className="py-2">Decision</th></tr>
              </thead>
              <tbody>
                {meeting.items.map((i) => {
                  const meta = STATUS_META[i.status] || { label: i.status, variant: 'secondary' };
                  return (
                    <tr key={i.id} className="border-b last:border-0 cursor-pointer hover:bg-muted/30"
                      onClick={() => navigate(`${listPath.replace(/meetings$/, 'applications')}/${i.application_id}`)}>
                      <td className="py-2"><span className="font-mono text-xs text-muted-foreground mr-2">{i.institute_id}</span>{i.institution_name}</td>
                      <td className="py-2"><Badge variant={meta.variant}>{meta.label}</Badge></td>
                      <td className="py-2 text-muted-foreground">{i.decision || '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : <p className="text-sm text-muted-foreground">No agenda items.</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Minutes</CardTitle></CardHeader>
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
              <div className="flex justify-end">
                <AiGenerateButton generate={() => genMeetingMinutes(meeting)} onGenerated={setMinutes} disabled={confirm.isPending} />
              </div>
              <Textarea placeholder="Minutes of the meeting…" value={minutes} onChange={(e) => setMinutes(e.target.value)} />
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
