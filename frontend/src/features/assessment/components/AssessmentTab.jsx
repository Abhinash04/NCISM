import { useMutation } from '@tanstack/react-query';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FileText, Loader2 } from 'lucide-react';
import { generateAssessment } from '@/lib/api/endpoints';
import { saveAssessment } from '@/lib/db/documents.repository';
import { MarkdownRenderer } from '@/components/markdown/MarkdownRenderer';

export function AssessmentTab({ job }) {
  const mutation = useMutation({
    mutationFn: () => generateAssessment({ jobId: job.jobId }),
    onSuccess: (data) => {
      saveAssessment(job.jobId, data.assessment).catch(() => {});
    },
  });

  const reportMarkdown = mutation.data?.assessment?.reportMarkdown ?? null;

  return (
    <div className="flex flex-col h-full w-full bg-background p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Assessment Report</h2>
          <p className="text-muted-foreground mt-1">
            Generate the official NCISM Assessment Report based on the extracted data from this document.
          </p>
        </div>
        <button
          onClick={() => mutation.mutate()}
          disabled={mutation.isPending || !job?.jobId}
          className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {mutation.isPending ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <FileText className="w-4 h-4" />
              Generate Report
            </>
          )}
        </button>
      </div>

      {mutation.isError && (
        <div className="bg-destructive/10 text-destructive p-4 rounded-md mb-6">
          {mutation.error.response?.data?.error?.message
            || 'Failed to generate assessment report. Please ensure extraction completed successfully.'}
        </div>
      )}

      {reportMarkdown ? (
        <div className="flex-1 border rounded-md overflow-hidden bg-background">
          <ScrollArea className="h-full w-full">
            <div className="max-w-5xl mx-auto px-4 py-12">
              <MarkdownRenderer markdown={reportMarkdown} />
            </div>
          </ScrollArea>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground border border-dashed rounded-md bg-muted/5">
          <FileText className="w-12 h-12 mb-4 opacity-20" />
          <p>Click "Generate Report" to evaluate the extracted data.</p>
        </div>
      )}
    </div>
  );
}
