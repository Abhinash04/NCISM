import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Gavel, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { useAuth } from '@/features/auth/AuthContext';
import { useMeetings, useCreateMeeting } from '@/features/meetings/hooks';

export function MeetingsList() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { hasPermission } = useAuth();
  const canManage = hasPermission('meeting:manage');
  const { data: meetings = [], isLoading, isError } = useMeetings();
  const create = useCreateMeeting();

  const [open, setOpen] = useState(false);
  const [number, setNumber] = useState('');
  const [when, setWhen] = useState('');

  const onCreate = () => create.mutate({ number, scheduledAt: when || null }, {
    onSuccess: (m) => { setOpen(false); setNumber(''); setWhen(''); navigate(`${pathname}/${m.id}`); },
  });

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-4xl mx-auto">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Board meetings</h1>
          <p className="text-muted-foreground mt-1">Numbered meetings + their case agendas.</p>
        </div>
        {canManage && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1" /> New meeting</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Schedule board meeting</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div className="space-y-2"><Label htmlFor="num">Meeting number</Label>
                  <Input id="num" placeholder="e.g. MARB/2026/07" value={number} onChange={(e) => setNumber(e.target.value)} /></div>
                <div className="space-y-2"><Label htmlFor="date">Date</Label>
                  <Input id="date" type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} /></div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button onClick={onCreate} disabled={!number.trim() || create.isPending}>Create</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="bg-background rounded-xl border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted-foreground uppercase bg-muted/50 border-b">
              <tr><th className="px-4 py-3 font-medium">Number</th><th className="px-4 py-3 font-medium">Date</th><th className="px-4 py-3 font-medium">Status</th></tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan="3" className="px-4 py-12 text-center text-muted-foreground">Loading…</td></tr>
              ) : isError ? (
                <tr><td colSpan="3" className="px-4 py-12 text-center text-destructive">Failed to load meetings.</td></tr>
              ) : meetings.length ? meetings.map((m) => (
                <tr key={m.id} className="border-b last:border-0 hover:bg-muted/30 cursor-pointer" onClick={() => navigate(`${pathname}/${m.id}`)}>
                  <td className="px-4 py-3 font-medium">{m.number}</td>
                  <td className="px-4 py-3 text-muted-foreground">{m.scheduled_at ? new Date(m.scheduled_at).toLocaleString() : '—'}</td>
                  <td className="px-4 py-3"><Badge variant={m.status === 'confirmed' ? 'default' : 'secondary'}>{m.status}</Badge></td>
                </tr>
              )) : (
                <tr><td colSpan="3" className="px-4 py-12 text-center text-muted-foreground">
                  <div className="flex flex-col items-center gap-2"><Gavel className="h-8 w-8 opacity-20" /><p>No meetings yet.</p></div>
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
