import { useState, useCallback } from 'react';
import { openDataLoaderService } from '@/services/opendataloader.service';
import { toast } from 'sonner';

export function useUpload() {
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState('idle'); // idle, processing, success, error
  const [timelineStep, setTimelineStep] = useState(0); 
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const reset = useCallback(() => {
    setFile(null);
    setStatus('idle');
    setTimelineStep(0);
    setResult(null);
    setError(null);
  }, []);

  const selectFile = useCallback((selectedFile) => {
    if (selectedFile?.type !== 'application/pdf') {
      toast.error("Only PDF files are supported");
      return;
    }
    setFile(selectedFile);
    setStatus('preview'); // Selected, waiting to process
  }, []);

  const processFile = useCallback(async () => {
    if (!file) return;

    try {
      setStatus('processing');
      setError(null);
      
      // Mocking timeline steps for better UX since upload is fast locally
      setTimelineStep(1); // Uploading
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setTimelineStep(2); // Sending to Hybrid Server
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setTimelineStep(3); // Extracting Content
      const data = await openDataLoaderService.uploadPdf(file);
      
      setTimelineStep(4); // Preparing Results
      await new Promise(resolve => setTimeout(resolve, 400));
      
      if (data.success) {
        setResult(data);
        setStatus('success');
        setTimelineStep(5); // Rendering Viewer
        toast.success("Extraction complete");
      } else {
        throw new Error(data.error?.detail?.[0]?.msg || "Failed to process PDF");
      }

    } catch (err) {
      console.error(err);
      setStatus('error');
      setError(err.message || 'An error occurred during extraction');
      toast.error("Extraction failed", { description: err.message });
    }
  }, [file]);

  return {
    file,
    status,
    timelineStep,
    result,
    error,
    selectFile,
    processFile,
    reset,
  };
}
