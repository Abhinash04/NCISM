import { DocumentPageLayout } from '@/features/documents/components/DocumentPageLayout';
import { PdfViewer } from '@/features/workspace/components/PdfViewer';

export function PdfPage() {
  return (
    <DocumentPageLayout title="Original PDF">
      {(job) => (
        <div className="h-full min-h-0 px-6 md:px-8 pb-6">
          <div className="h-full min-h-0 border rounded-xl overflow-hidden bg-background flex flex-col">
            <PdfViewer job={job} />
          </div>
        </div>
      )}
    </DocumentPageLayout>
  );
}
