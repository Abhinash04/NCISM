import { useMutation } from '@tanstack/react-query';
import { useLiveQuery } from 'dexie-react-hooks';
import { DocumentPageLayout } from '@/features/documents/components/DocumentPageLayout';
import { MarkdownRenderer } from '@/components/markdown/MarkdownRenderer';
import { generateAssessment } from '@/lib/api/endpoints';
import { saveAssessment } from '@/lib/db/documents.repository';
import { db } from '@/lib/db/db';
import { downloadBlob } from '@/lib/download';
import { Button } from '@/components/ui/button';
import { ClipboardList, Loader2, Download, Printer, RefreshCw } from 'lucide-react';

export function ReportPage() {
  return (
    <DocumentPageLayout title="Assessment Report">
      {(job) => <ReportContent job={job} />}
    </DocumentPageLayout>
  );
}

function ReportContent({ job }) {
  // Latest locally stored assessment (survives the backend purge).
  const stored = useLiveQuery(
    () => db.assessments.where('documentId').equals(job.jobId).last(),
    [job.jobId],
    null
  );

  const mutation = useMutation({
    mutationFn: () => generateAssessment({ jobId: job.jobId }),
    onSuccess: (data) => {
      saveAssessment(job.jobId, data.assessment).catch(() => {});
    },
  });

  const reportMarkdown = mutation.data?.assessment?.reportMarkdown ?? stored?.reportMarkdown ?? null;
  const canGenerate = job.source !== 'local';

  const handleDownload = () => {
    if (!reportMarkdown) return;
    downloadBlob(reportMarkdown, `assessment_${(job.filename || 'document').replace(/\.[^/.]+$/, '')}.md`, 'text/markdown');
  };

  return (
    <div className="flex flex-col h-full min-h-0 px-6 md:px-8 pb-6">
      <div className="h-11 border rounded-t-xl bg-background flex items-center justify-between px-3 gap-2 shrink-0 print-hide">
        <p className="text-xs text-muted-foreground truncate">
          Deterministic evaluation against the MESAR (UG) Ayurveda 2024 ruleset and the Board-approved punitive policy.
        </p>
        <div className="flex items-center gap-1 shrink-0">
          <Button size="sm" className="h-8" onClick={() => mutation.mutate()}
            disabled={mutation.isPending || !canGenerate}
            title={canGenerate ? undefined : 'Server copy expired — showing the locally stored report'}>
            {mutation.isPending ? (
              <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Generating...</>
            ) : reportMarkdown ? (
              <><RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Regenerate</>
            ) : (
              <><ClipboardList className="w-3.5 h-3.5 mr-1.5" /> Generate Report</>
            )}
          </Button>
          <Button variant="ghost" size="sm" className="text-xs text-muted-foreground hover:text-foreground h-8"
            disabled={!reportMarkdown} onClick={handleDownload}>
            <Download className="w-3.5 h-3.5 mr-1.5" /> Download
          </Button>
          <Button variant="ghost" size="sm" className="text-xs text-muted-foreground hover:text-foreground h-8"
            disabled={!reportMarkdown} onClick={() => window.print()}>
            <Printer className="w-3.5 h-3.5 mr-1.5" /> Print
          </Button>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto border border-t-0 rounded-b-xl bg-background print-area">
        {mutation.isError && (
          <div className="m-6 bg-destructive/10 text-destructive p-4 rounded-md text-sm">
            {mutation.error.response?.data?.error?.message
              || 'Failed to generate the assessment report. Ensure extraction completed successfully.'}
          </div>
        )}
        {reportMarkdown ? (
          <div className="max-w-4xl mx-auto px-6 py-10">
            <MarkdownRenderer markdown={reportMarkdown} />
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-muted-foreground p-8 text-center">
            <ClipboardList className="w-12 h-12 mb-4 opacity-20" />
            <p>Click "Generate Report" to evaluate the extracted parameters.</p>
          </div>
        )}
      </div>
    </div>
  );
}
