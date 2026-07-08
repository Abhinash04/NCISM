import { AppHeader } from '@/components/layout/AppHeader';
import { useDocuments } from '@/hooks/useDocuments';
import { useUpload } from '@/hooks/useUpload';
import { FileDropZone } from '@/features/upload/components/FileDropZone';
import { UploadQueue } from '@/features/upload/components/UploadQueue';
import { DocumentList } from '@/features/upload/components/DocumentList';

export default function UploadWorkspace() {
  const documents = useDocuments();
  const { queue, uploadFiles } = useUpload();

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="mx-auto max-w-4xl space-y-6 px-4 py-8">
        <div>
          <h1 className="text-xl font-semibold">Document Upload Workspace</h1>
          <p className="text-sm text-muted-foreground">
            Upload NCISM visitation PDFs, then open a document to run extraction.
          </p>
        </div>

        <FileDropZone onFilesSelected={uploadFiles} />
        <UploadQueue queue={queue} />

        <section className="space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground">
            Uploaded documents {documents?.length ? `(${documents.length})` : ''}
          </h2>
          <DocumentList documents={documents} />
        </section>
      </main>
    </div>
  );
}
