import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { extractDocument } from '@/lib/api/endpoints';
import { saveDocument, saveFailedUpload, persistJobArtifacts } from '@/lib/db/documents.repository';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

/**
 * Transient processing route: receives the picked File via router state,
 * runs extraction, persists locally and lands on the Document Details page.
 */
export function UploadProcessing() {
  const location = useLocation();
  const navigate = useNavigate();
  const uploadedFile = location.state?.file;

  const uploadMutation = useMutation({
    mutationFn: extractDocument,
    onSuccess: async (job) => {
      await saveDocument(job);
      toast.success('Extraction completed');
      navigate(`/documents/${job.jobId}`, { replace: true });
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
      navigate('/dashboard', { replace: true });
    },
  });

  const startedRef = useRef(false);
  useEffect(() => {
    if (startedRef.current) return;
    if (!uploadedFile) {
      navigate('/dashboard', { replace: true });
      return;
    }
    startedRef.current = true;
    uploadMutation.mutate(uploadedFile);
  }, [uploadedFile, navigate, uploadMutation]);

  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[60vh] space-y-6">
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
