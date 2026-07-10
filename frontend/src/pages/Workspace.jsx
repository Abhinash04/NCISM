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
    <WorkspaceLayoutProvider>
      <WorkspaceProvider>
        <WorkspaceShell job={job} />
      </WorkspaceProvider>
    </WorkspaceLayoutProvider>
  );
}
