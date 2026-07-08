import { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation, useParams, useNavigate } from 'react-router-dom';
import { SplitScreenViewer } from '@/components/viewer/SplitScreenViewer';
import { StorageService } from '@/services/storage.service';
import { openDataLoaderService } from '@/services/opendataloader.service';
import { toast } from 'sonner';
import { Loader2, ArrowLeft } from 'lucide-react';
import { StatusBadge } from '@/components/common/StatusBadge';
import { ThemeToggle } from '@/components/common/ThemeToggle';

export function Workspace() {
  const { documentId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  
  const [job, setJob] = useState(null);
  
  // Initialize to true if we are processing a new file or fetching an existing job
  const [isProcessing, setIsProcessing] = useState(true);

  const processedRef = useRef(false);

  const processFile = useCallback(async (fileToProcess) => {
    try {
      const response = await openDataLoaderService.uploadPdf(fileToProcess);
      
      // Save to history to maintain dashboard list
      StorageService.saveDocument({
        id: response.jobId,
        filename: fileToProcess.name,
        size: fileToProcess.size,
        status: response.success ? 'completed' : 'failed',
        processingTime: response.metadata?.processingTime || 0
      });

      toast.success("Extraction completed");
      
      // Navigate to the saved document ID so the URL reflects the resource
      navigate(`/workspace/${response.jobId}`, { replace: true });
    } catch (error) {
      console.error(error);
      toast.error("Extraction failed: " + (error.message || "Unknown error"));
      
      StorageService.saveDocument({
        filename: fileToProcess.name,
        size: fileToProcess.size,
        status: 'failed',
        processingTime: 0
      });
      setIsProcessing(false);
    }
  }, [navigate]);

  const fetchJob = useCallback(async (jobId) => {
    try {
      setIsProcessing(true);
      const jobData = await openDataLoaderService.getJob(jobId);
      setJob(jobData);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load document. It may have expired.");
      navigate('/dashboard');
    } finally {
      setIsProcessing(false);
    }
  }, [navigate]);

  useEffect(() => {
    if (processedRef.current) return;
    
    // Handling new upload
    if (location.pathname === '/workspace/new') {
      const uploadedFile = location.state?.file;
      if (!uploadedFile) {
        navigate('/dashboard');
        return;
      }
      processedRef.current = true;
      // Start processing asynchronously
      setTimeout(() => {
        processFile(uploadedFile);
      }, 0);
    } 
    // Handling historical/existing document
    else if (documentId) {
      processedRef.current = true;
      setTimeout(() => {
        fetchJob(documentId);
      }, 0);
    }
  }, [documentId, location.pathname, location.state?.file, navigate, processFile, fetchJob]);

  // If documentId changes (e.g. user navigated to a new job), reset ref
  useEffect(() => {
    if (documentId && job && job.jobId !== documentId) {
       processedRef.current = false;
    }
  }, [documentId, job]);

  const handleReset = () => {
    navigate('/dashboard');
  };

  if (isProcessing) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-background space-y-6">
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
      <div className="flex flex-col items-center justify-center h-full">
        <h2 className="text-xl text-muted-foreground">Document not found</h2>
      </div>
    );
  }

  return (
    <div className="h-full w-full bg-background flex flex-col overflow-hidden">
      <header className="h-16 border-b bg-background flex items-center justify-between px-6 shrink-0 z-10">
        <div className="flex items-center gap-4">
          <button 
            onClick={handleReset}
            className="p-2 hover:bg-muted rounded-full transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-muted-foreground" />
          </button>
          <div className="flex flex-col">
            <h2 className="text-lg font-semibold tracking-tight">{job.metadata?.filename || 'Document'}</h2>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>Processing Time: {job.metadata?.processingTime || 0}s</span>
              <span>•</span>
              <span>{job.metadata?.pageCount || 0} Pages</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <StatusBadge />
          <ThemeToggle />
        </div>
      </header>

      {(job.metadata?.status === 'partial_success' || (job.metadata?.warnings && job.metadata.warnings.length > 0)) && (
        <div className="bg-destructive/10 border-b border-destructive/20 p-4 text-sm text-foreground shrink-0 z-10 shadow-sm flex flex-col gap-2 overflow-y-auto max-h-48">
          <div className="flex items-center gap-2 text-destructive font-semibold">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-alert-triangle"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
            Extraction completed with warnings.
          </div>
          <div className="text-muted-foreground grid grid-cols-[100px_1fr] gap-x-4">
             {job.metadata.pageCount && job.metadata.failedPages && job.metadata.failedPages.length > 0 && (
               <>
                 <span className="font-medium text-foreground">Successfully processed:</span>
                 <span>Pages 1–{Math.max(1, Math.min(...job.metadata.failedPages) - 1)}</span>
               </>
             )}
             {job.metadata.failedPages && job.metadata.failedPages.length > 0 && (
               <>
                 <span className="font-medium text-foreground">Failed:</span>
                 <span>Pages {job.metadata.failedPages.join(', ')}</span>
               </>
             )}
             {job.metadata.warnings && job.metadata.warnings.length > 0 && (
               <>
                 <span className="font-medium text-foreground">Reason:</span>
                 <ul className="list-disc pl-4 space-y-1">
                   {job.metadata.warnings.map((w, i) => <li key={i}>{w}</li>)}
                 </ul>
               </>
             )}
          </div>
        </div>
      )}
      
      <div className="flex-1 overflow-hidden relative">
        <SplitScreenViewer job={job} />
      </div>
    </div>
  );
}
