import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Search, FileCheck2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { DragDropZone } from '@/features/documents/components/DragDropZone';
import { useInstitutions } from '@/features/institutions/hooks';
import { useUploadApplication } from '@/features/applications/hooks';

export function ApplicationUpload() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const listPath = pathname.replace(/\/new$/, '');

  const [q, setQ] = useState('');
  const [institutionId, setInstitutionId] = useState('');
  const [session, setSession] = useState('');
  const [file, setFile] = useState(null);

  const { data: instData } = useInstitutions({ q, limit: 25 });
  const institutions = instData?.rows || [];
  const { mutate, isPending, isError, error } = useUploadApplication();

  const canSubmit = institutionId && file && !isPending;

  const onSubmit = (e) => {
    e.preventDefault();
    if (!canSubmit) return;
    mutate({ institutionId, session, file }, {
      onSuccess: (app) => navigate(`${listPath}/${app.id}`),
    });
  };

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-2xl mx-auto">
      <Button variant="ghost" size="sm" onClick={() => navigate(listPath)}>
        <ArrowLeft className="h-4 w-4 mr-1" /> Back to uploads
      </Button>

      <div>
        <h1 className="text-3xl font-bold tracking-tight">New assessment upload</h1>
        <p className="text-muted-foreground mt-1">
          Upload a visitation report and select its institution. The case routes to the allotted
          dealing staff.
        </p>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Case details</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label>Institution</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search by name / ID / state…" className="pl-9"
                  value={q} onChange={(e) => setQ(e.target.value)} />
              </div>
              <Select value={institutionId} onValueChange={setInstitutionId}>
                <SelectTrigger><SelectValue placeholder="Select an institution" /></SelectTrigger>
                <SelectContent>
                  {institutions.map((i) => (
                    <SelectItem key={i.id} value={i.id}>
                      {i.institute_id} · {i.name.slice(0, 60)} ({i.state})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="session">Session / year</Label>
              <Input id="session" placeholder="e.g. 2026-27" value={session}
                onChange={(e) => setSession(e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label>Report PDF</Label>
              {file ? (
                <div className="flex items-center gap-2 rounded-lg border p-3 text-sm">
                  <FileCheck2 className="h-4 w-4 text-emerald-500" />
                  <span className="truncate">{file.name}</span>
                  <Button type="button" variant="ghost" size="sm" className="ml-auto"
                    onClick={() => setFile(null)}>Change</Button>
                </div>
              ) : (
                <DragDropZone onFileSelect={setFile} />
              )}
            </div>

            {isError && (
              <p className="text-sm text-destructive">
                {error?.response?.data?.error?.message || 'Upload failed.'}
              </p>
            )}

            <Button type="submit" disabled={!canSubmit}>
              {isPending ? 'Uploading…' : 'Create case'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
