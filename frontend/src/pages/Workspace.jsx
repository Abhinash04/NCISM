import { useEffect, useRef } from 'react';
import { useLocation, useParams, useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { WorkspaceShell } from '@/features/workspace/components/WorkspaceShell';
import { WorkspaceProvider } from '@/features/workspace/context/WorkspaceContext';
import { WorkspaceLayoutProvider } from '@/features/workspace/context/WorkspaceLayoutContext';
import { saveDocument, saveFailedUpload, persistJobArtifacts } from '@/lib/db/documents.repository';
import { extractDocument } from '@/lib/api/endpoints';
import { useJob } from '@/features/workspace/hooks/useJob';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

/** Placeholder shell mirroring the 3-panel workspace layout while the job loads. */
function WorkspaceSkeleton() {
  return (
    <div className="h-screen w-full bg-background flex flex-col overflow-hidden">
      <header className="h-16 border-b flex items-center justify-between px-6 shrink-0">
        <div className="flex items-center gap-4">
          <Skeleton className="w-9 h-9 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-56" />
            <Skeleton className="h-3 w-36" />
          </div>
        </div>
        <Skeleton className="h-6 w-24 rounded-full" />
      </header>
      <div className="flex-1 min-h-0 flex">
        {[['35%', 6], ['45%', 10], ['20%', 5]].map(([width, lines], panel) => (
          <div key={panel} className="h-full border-r last:border-r-0 flex flex-col" style={{ width }}>
            <div className="h-11 border-b flex items-center px-3 gap-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-12 ml-auto" />
            </div>
            <div className="flex-1 p-6 space-y-3">
              {Array.from({ length: lines }).map((_, i) => (
                <Skeleton key={i} className="h-4" style={{ width: `${90 - (i % 4) * 15}%` }} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

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

  if (isNewUpload) {
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

  if (documentId && isLoadingJob) {
    return <WorkspaceSkeleton />;
  }

  if (!job) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <h2 className="text-xl text-muted-foreground">Document not found</h2>
      </div>
    );
  }

  return (
    <WorkspaceLayoutProvider>
      <WorkspaceProvider>
        <WorkspaceShell job={job} />
      </WorkspaceProvider>
    </WorkspaceLayoutProvider>
  );
}
