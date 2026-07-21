import { useCallback, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import { motion } from 'framer-motion';
import {
  ArrowLeft, FileCheck2, UploadCloud, FileType2, X, Loader2, MapPin, FilePlus2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { formatBytes } from '@/lib/format';
import { InstitutionCombobox } from '@/features/institutions/components/InstitutionCombobox';
import { useAllInstitutions } from '@/features/institutions/hooks';
import { useUploadApplication } from '@/features/applications/hooks';

const SYSTEM_LABELS = { ayurveda: 'Ayurveda', unani: 'Unani', siddha: 'Siddha', sowa_rigpa: 'Sowa-Rigpa' };

/** Required-field marker. */
function Req() {
  return <span className="text-primary" aria-hidden>*</span>;
}

/** Compact PDF dropzone sized for the form (distinct from the full-page DragDropZone). */
function ReportDropzone({ file, onSelect, onClear }) {
  const onDrop = useCallback((accepted) => { if (accepted?.length) onSelect(accepted[0]); }, [onSelect]);
  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop, accept: { 'application/pdf': ['.pdf'] }, maxFiles: 1,
  });

  if (file) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-3 rounded-lg border bg-muted/30 p-3"
      >
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-emerald-500/10 text-emerald-600">
          <FileCheck2 className="h-5 w-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium">{file.name}</span>
          <span className="block text-xs text-muted-foreground">{formatBytes(file.size)}</span>
        </span>
        <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={onClear} title="Remove file">
          <X className="h-4 w-4" />
        </Button>
      </motion.div>
    );
  }

  return (
    <div
      {...getRootProps()}
      className={cn(
        'group flex h-40 cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed bg-muted/20 px-6 text-center transition-colors',
        isDragActive ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50 hover:bg-muted/40',
        isDragReject && 'border-destructive bg-destructive/5',
      )}
    >
      <input {...getInputProps()} />
      <span className={cn('grid h-11 w-11 place-items-center rounded-full bg-primary/10 text-primary transition-transform group-hover:-translate-y-0.5',
        isDragReject && 'bg-destructive/10 text-destructive')}>
        {isDragReject ? <FileType2 className="h-5 w-5" /> : <UploadCloud className="h-5 w-5" />}
      </span>
      <span className="text-sm font-medium">
        {isDragActive ? 'Drop the PDF here' : isDragReject ? 'Only PDF files are supported' : 'Drag & drop the report, or click to browse'}
      </span>
      <span className="text-xs text-muted-foreground">PDF only · a single visitation report</span>
    </div>
  );
}

export function ApplicationUpload() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const listPath = pathname.replace(/\/new$/, '');

  const [institutionId, setInstitutionId] = useState('');
  const [session, setSession] = useState('');
  const [intake, setIntake] = useState('');
  const [permissionType, setPermissionType] = useState('');
  const [visitationFrom, setVisitationFrom] = useState('');
  const [visitationTo, setVisitationTo] = useState('');
  const [file, setFile] = useState(null);

  const { data: institutions = [], isLoading: instLoading } = useAllInstitutions();
  const { mutate, isPending, isError, error } = useUploadApplication();

  const selected = institutions.find((i) => i.id === institutionId) || null;
  const canSubmit = institutionId && file && !isPending;

  const onSubmit = (e) => {
    e.preventDefault();
    if (!canSubmit) return;
    mutate({ institutionId, session, file, intake, permissionType, visitationFrom, visitationTo }, {
      onSuccess: (app) => navigate(`${listPath}/${app.id}`),
    });
  };

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-2xl mx-auto">
      <Button variant="ghost" size="sm" className="-ml-2 text-muted-foreground" onClick={() => navigate(listPath)}>
        <ArrowLeft className="h-4 w-4 mr-1" /> Back to uploads
      </Button>

      <div className="flex items-start gap-4">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
          <FilePlus2 className="h-6 w-6" />
        </span>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">New assessment upload</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Upload a visitation report and choose its institution. The case routes automatically to the
            allotted dealing staff.
          </p>
        </div>
      </div>

      <form onSubmit={onSubmit} className="space-y-6">
        {/* Institution */}
        <Card>
          <CardContent className="p-5 space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold">Institution <Req /></Label>
              {!instLoading && <span className="text-xs text-muted-foreground">{institutions.length} in registry</span>}
            </div>
            <InstitutionCombobox
              institutions={institutions}
              value={institutionId}
              onChange={setInstitutionId}
              loading={instLoading}
            />
            {selected ? (
              <motion.div
                initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2 rounded-lg border bg-muted/30 px-3 py-2 text-sm"
              >
                <MapPin className="h-4 w-4 shrink-0 text-primary" />
                <span className="text-muted-foreground">
                  <span className="font-medium text-foreground">{selected.state}</span>
                  {' · '}{SYSTEM_LABELS[selected.system] || selected.system}
                </span>
              </motion.div>
            ) : (
              <p className="text-xs text-muted-foreground">Search by institution name, ID (e.g. AYU0659), or state.</p>
            )}
          </CardContent>
        </Card>

        {/* Optional case details */}
        <Card>
          <CardContent className="p-5 space-y-4">
            <div>
              <h2 className="text-sm font-semibold">Case details</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Optional — these populate the generated letters/orders; leave blank to fill later.</p>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="session" className="text-xs text-muted-foreground">Session / year</Label>
                <Input id="session" placeholder="e.g. 2026-27" value={session} onChange={(e) => setSession(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="intake" className="text-xs text-muted-foreground">Intake capacity (seats)</Label>
                <Input id="intake" type="number" min="0" placeholder="e.g. 100" value={intake} onChange={(e) => setIntake(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="perm" className="text-xs text-muted-foreground">Permission type</Label>
                <Input id="perm" placeholder="e.g. yearly / 2nd renewal" value={permissionType} onChange={(e) => setPermissionType(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Visitation dates</Label>
                <div className="flex items-center gap-2">
                  <Input type="date" aria-label="Visitation from" value={visitationFrom} onChange={(e) => setVisitationFrom(e.target.value)} />
                  <span className="text-muted-foreground text-xs">to</span>
                  <Input type="date" aria-label="Visitation to" value={visitationTo} onChange={(e) => setVisitationTo(e.target.value)} />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Report PDF */}
        <Card>
          <CardContent className="p-5 space-y-3">
            <Label className="text-sm font-semibold">Report PDF <Req /></Label>
            <ReportDropzone file={file} onSelect={setFile} onClear={() => setFile(null)} />
          </CardContent>
        </Card>

        {isError && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            {error?.response?.data?.error?.message || 'Upload failed. Please try again.'}
          </div>
        )}

        <div className="flex items-center justify-end gap-2">
          <Button type="button" variant="ghost" onClick={() => navigate(listPath)} disabled={isPending}>
            Cancel
          </Button>
          <Button type="submit" disabled={!canSubmit} className="min-w-[9rem]">
            {isPending ? <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> Uploading…</> : 'Create case'}
          </Button>
        </div>
        {!canSubmit && !isPending && (
          <p className="text-right text-xs text-muted-foreground -mt-3">
            {!institutionId ? 'Select an institution' : !file ? 'Attach the report PDF' : ''} to continue.
          </p>
        )}
      </form>
    </div>
  );
}
