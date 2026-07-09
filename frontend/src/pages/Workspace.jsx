import { useEffect, useRef } from 'react';
import { useLocation, useParams, useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { SplitScreenViewer } from '@/components/viewer/SplitScreenViewer';
import { WorkspaceProvider } from '@/components/viewer/WorkspaceContext';
import { saveDocument, saveFailedUpload, persistJobArtifacts } from '@/lib/db/documents.repository';
import { extractDocument } from '@/lib/api/endpoints';
import { useJob } from '@/hooks/useJob';
import { toast } from 'sonner';
import { Loader2, ArrowLeft } from 'lucide-react';
import { StatusBadge } from '@/components/common/StatusBadge';
import { ThemeToggle } from '@/components/common/ThemeToggle';

export function Workspace() {
  const { documentId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const isNewUpload = location.pathname === '/workspace/new';
  const uploadedFile = location.state?.file;

  const uploadMutation = useMutation({
    mutationFn: extractDocument,
    onSuccess: async (job) => {
      await saveDocument(job);
      toast.success('Extraction completed');
      navigate(`/workspace/${job.jobId}`, { replace: true });
      // Persist artifacts in the background so the document survives the
      // backend's retention purge.
      persistJobArtifacts(job).then(({ pdfSkipped }) => {
        if (pdfSkipped) {
          toast.info('PDF too large to store locally — viewable until the server copy expires.');
        }
      });
    },
    onError: (error, file) => {
      toast.error('Extraction failed: ' + (error.response?.data?.error?.message || error.message || 'Unknown error'));
      saveFailedUpload(file);
      navigate('/dashboard');
    },
  });

  const startedRef = useRef(false);
  useEffect(() => {
    if (!isNewUpload || startedRef.current) return;
    if (!uploadedFile) {
      navigate('/dashboard');
      return;
    }
    startedRef.current = true;
    uploadMutation.mutate(uploadedFile);
  }, [isNewUpload, uploadedFile, navigate, uploadMutation]);

  const { data: job, isPending: isLoadingJob, isError } = useJob(isNewUpload ? null : documentId);

  useEffect(() => {
    if (isError) {
      toast.error('Failed to load document. It may have expired.');
      navigate('/dashboard');
    }
  }, [isError, navigate]);

  const isProcessing = isNewUpload || (!!documentId && isLoadingJob);

  if (isProcessing) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-background space-y-6">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold tracking-tight">Processing Document</h2>
          <p className="text-muted-foreground max-w-md mx-auto">
            OpenDataLoader is extracting structure, reading order, and semantics...
          </p>
        </div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <h2 className="text-xl text-muted-foreground">Document not found</h2>
      </div>
    );
  }

  return (
    <div className="h-screen w-full bg-background flex flex-col overflow-hidden">
      <header className="h-16 border-b bg-background flex items-center justify-between px-6 shrink-0 z-10">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/dashboard')}
            className="p-2 hover:bg-muted rounded-full transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-muted-foreground" />
          </button>
          <div className="flex flex-col">
            <h2 className="text-lg font-semibold tracking-tight">{job.filename || 'Document'}</h2>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>Processing Time: {(job.processingTimeMs / 1000).toFixed(2)}s</span>
              <span>•</span>
              <span>{job.pageCount || 0} Pages</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <StatusBadge />
          <ThemeToggle />
        </div>
      </header>

      {(job.status === 'partial' || job.warnings.length > 0) && (
        <div className="bg-destructive/10 border-b border-destructive/20 p-4 text-sm text-foreground shrink-0 z-10 shadow-sm flex flex-col gap-2 overflow-y-auto max-h-48">
          <div className="flex items-center gap-2 text-destructive font-semibold">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-alert-triangle"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
            Extraction completed with warnings.
          </div>
          <div className="text-muted-foreground grid grid-cols-[100px_1fr] gap-x-4">
            {job.failedPages.length > 0 && (
              <>
                <span className="font-medium text-foreground">Successfully processed:</span>
                <span>Pages 1–{Math.max(1, Math.min(...job.failedPages) - 1)}</span>
                <span className="font-medium text-foreground">Failed:</span>
                <span>Pages {job.failedPages.join(', ')}</span>
              </>
            )}
            {job.warnings.length > 0 && (
              <>
                <span className="font-medium text-foreground">Reason:</span>
                <ul className="list-disc pl-4 space-y-1">
                  {job.warnings.map((w, i) => <li key={i}>{w}</li>)}
                </ul>
              </>
            )}
          </div>
        </div>
      )}

      <div className="flex-1 overflow-hidden relative">
        <WorkspaceProvider>
          <SplitScreenViewer job={job} />
        </WorkspaceProvider>
      </div>
    </div>
  );
}
