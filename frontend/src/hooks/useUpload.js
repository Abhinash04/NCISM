import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import { documentService } from '@/services/documentService';

let queueItemId = 0;

/**
 * Manages the upload queue: validates and stores each selected file,
 * exposing per-file progress for the UI.
 */
export function useUpload() {
  const [queue, setQueue] = useState([]);

  const uploadFiles = useCallback(async (fileList) => {
    const files = Array.from(fileList);

    for (const file of files) {
      const itemId = ++queueItemId;
      setQueue((prev) => [
        ...prev,
        { id: itemId, filename: file.name, progress: 0, status: 'uploading', error: null },
      ]);

      const setItem = (changes) =>
        setQueue((prev) =>
          prev.map((item) => (item.id === itemId ? { ...item, ...changes } : item)),
        );

      try {
        await documentService.uploadDocument(file, (progress) => setItem({ progress }));
        setItem({ status: 'done', progress: 100 });
        toast.success(`Uploaded ${file.name}`);
      } catch (error) {
        setItem({ status: 'error', error: error.message });
        toast.error(`${file.name}: ${error.message}`);
      }
    }

    // Clear finished items after a short delay so users see completion.
    setTimeout(() => {
      setQueue((prev) => prev.filter((item) => item.status === 'uploading'));
    }, 2500);
  }, []);

  return { queue, uploadFiles };
}
