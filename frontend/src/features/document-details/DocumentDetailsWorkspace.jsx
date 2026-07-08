import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AppHeader } from '@/components/layout/AppHeader';
import { useDocument } from '@/hooks/useDocument';
import { useExtraction } from '@/hooks/useExtraction';
import { documentService } from '@/services/documentService';
import { StatusBadge } from '@/features/upload/components/StatusBadge';
import { PdfViewer } from '@/features/document-details/components/PdfViewer';
import { OfficePreview } from '@/features/document-details/components/OfficePreview';
import { ExtractionTabs } from '@/features/document-details/components/ExtractionTabs';
import { ProcessButton } from '@/features/document-details/components/ProcessButton';

export default function DocumentDetailsWorkspace() {
  const { id } = useParams();
  const doc = useDocument(id);
  const extraction = useExtraction(id);
  const [blob, setBlob] = useState(null);

  useEffect(() => {
    let cancelled = false;
    documentService.getFileBlob(id).then((file) => {
      if (!cancelled) setBlob(file);
    });
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (doc === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted-foreground">
        <Loader2 className="size-6 animate-spin" />
      </div>
    );
  }

  if (doc === null) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader />
        <main className="mx-auto max-w-xl px-4 py-16 text-center">
          <p className="mb-4 text-muted-foreground">Document not found.</p>
          <Button asChild variant="outline">
            <Link to="/">Back to documents</Link>
          </Button>
        </main>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-background">
      <AppHeader>
        <div className="flex min-w-0 items-center gap-3">
          <Button asChild variant="ghost" size="icon" aria-label="Back to documents">
            <Link to="/">
              <ArrowLeft />
            </Link>
          </Button>
          <span className="truncate text-sm font-medium">{doc.filename}</span>
          <StatusBadge status={doc.status} />
          <div className="flex-1" />
          <ProcessButton document={doc} />
        </div>
      </AppHeader>

      <main className="flex min-h-0 flex-1">
        <section className="min-w-0 basis-[65%] border-r">
          {!blob ? (
            <div className="flex h-full items-center justify-center text-muted-foreground">
              <Loader2 className="size-6 animate-spin" />
            </div>
          ) : (doc.type ?? 'pdf') === 'pdf' ? (
            <PdfViewer blob={blob} filename={doc.filename} />
          ) : (
            <OfficePreview document={doc} blob={blob} extraction={extraction ?? null} />
          )}
        </section>
        <aside className="min-w-0 basis-[35%] bg-card">
          <ExtractionTabs document={doc} extraction={extraction ?? null} />
        </aside>
      </main>
    </div>
  );
}
