import { useLiveQuery } from 'dexie-react-hooks';
import { format } from 'date-fns';
import { db } from '@/lib/db/db';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DocumentPageLayout } from '@/features/documents/components/DocumentPageLayout';
import { ArtifactsTable } from '@/features/documents/components/ArtifactsTable';
import { WarningsBanner } from '@/features/documents/components/WarningsBanner';
import { formatBytes } from '@/lib/format';
import {
  FileText, CalendarDays, Activity, BookOpen, Cog, Timer, ShieldCheck, ClipboardList,
} from 'lucide-react';

function statusBadge(status) {
  const styles = {
    completed: 'bg-emerald-500/10 text-emerald-600 border-emerald-200',
    partial: 'bg-amber-500/10 text-amber-600 border-amber-200',
    failed: 'bg-destructive/10 text-destructive border-destructive/20',
  };
  return <Badge variant="outline" className={`capitalize ${styles[status] || ''}`}>{status}</Badge>;
}

function SummaryCard({ icon: Icon, title, children }) {
  return (
    <Card className="shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium font-sans">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent className="text-sm">{children}</CardContent>
    </Card>
  );
}

export function DocumentDetails() {
  return (
    <DocumentPageLayout title={null}>
      {(job) => <Details job={job} />}
    </DocumentPageLayout>
  );
}

function Details({ job }) {
  const assessmentCount = useLiveQuery(
    () => db.assessments.where('documentId').equals(job.jobId).count(),
    [job.jobId],
    0
  );

  const recoveredNote = (job.warnings || []).find((w) => /base engine/i.test(w));
  const engine = recoveredNote
    ? 'OpenDataLoader · hybrid + base-engine recovery'
    : 'OpenDataLoader · Docling hybrid';
  const reportGenerated = Boolean(job.artifacts?.report) || assessmentCount > 0;

  return (
    <div className="h-full overflow-y-auto">
      <div className="px-6 md:px-8 pb-8 space-y-6 max-w-6xl">
      <WarningsBanner job={job} />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard icon={FileText} title="Document">
          <div className="font-medium truncate" title={job.filename}>{job.filename}</div>
          <div className="text-xs text-muted-foreground mt-1">{formatBytes(job.filesize)}</div>
        </SummaryCard>
        <SummaryCard icon={CalendarDays} title="Uploaded">
          <div className="font-medium">{job.createdAt ? format(new Date(job.createdAt), 'MMM d, yyyy') : '—'}</div>
          <div className="text-xs text-muted-foreground mt-1">
            {job.createdAt ? format(new Date(job.createdAt), 'h:mm a') : ''}
          </div>
        </SummaryCard>
        <SummaryCard icon={Activity} title="Processing Status">
          {statusBadge(job.status)}
          {job.source === 'local' && (
            <div className="text-xs text-muted-foreground mt-2">Served from local store (server copy expired)</div>
          )}
        </SummaryCard>
        <SummaryCard icon={BookOpen} title="Total Pages">
          <div className="text-2xl font-bold">{job.pageCount || '—'}</div>
        </SummaryCard>
        <SummaryCard icon={Cog} title="Extraction Engine">
          <div className="font-medium text-xs leading-relaxed">{engine}</div>
        </SummaryCard>
        <SummaryCard icon={Timer} title="Processing Time">
          <div className="text-2xl font-bold">{((job.processingTimeMs || 0) / 1000).toFixed(2)}s</div>
        </SummaryCard>
        <SummaryCard icon={ShieldCheck} title="Validation">
          {(job.warnings?.length || 0) === 0 && (job.failedPages?.length || 0) === 0 ? (
            <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-200">No warnings</Badge>
          ) : (
            <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-200">
              {job.warnings?.length || 0} warning{(job.warnings?.length || 0) === 1 ? '' : 's'}
            </Badge>
          )}
        </SummaryCard>
        <SummaryCard icon={ClipboardList} title="Assessment">
          <Badge
            variant="outline"
            className={reportGenerated
              ? 'bg-emerald-500/10 text-emerald-600 border-emerald-200'
              : 'bg-muted text-muted-foreground'}
          >
            {reportGenerated ? 'Generated' : 'Not generated'}
          </Badge>
        </SummaryCard>
      </div>

      <div className="space-y-3">
        <h2 className="text-lg font-semibold font-sans">Extraction Artifacts</h2>
        <ArtifactsTable job={job} />
      </div>
      </div>
    </div>
  );
}
