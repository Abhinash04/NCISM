import { Loader2, Play, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { DOCUMENT_STATUS } from '@/db/db';
import { documentService } from '@/services/documentService';

/** Manual pipeline trigger — POST /documents/:id/process equivalent. */
export function ProcessButton({ document: doc }) {
  const processing = doc.status === DOCUMENT_STATUS.PROCESSING;
  const hasRun = doc.status !== DOCUMENT_STATUS.UPLOADED;

  const handleClick = async () => {
    try {
      const extraction = await documentService.processDocument(doc.id);
      if (extraction.status === 'requires_ocr') {
        toast.warning('This PDF appears scanned — OCR is planned for Phase 2.');
      } else {
        toast.success(`Extraction completed for ${doc.filename}`);
      }
    } catch (error) {
      toast.error(error.message);
    }
  };

  return (
    <Button onClick={handleClick} disabled={processing} size="sm">
      {processing ? (
        <>
          <Loader2 className="animate-spin" /> Processing…
        </>
      ) : hasRun ? (
        <>
          <RotateCcw /> Re-process
        </>
      ) : (
        <>
          <Play /> Process document
        </>
      )}
    </Button>
  );
}
