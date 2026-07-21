import { useEffect, useRef, useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getSourcePdf } from '@/features/applications/application.api';

import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

/** Paginated in-app viewer for a case's uploaded visitation report (20–50 pages). */
export function CasePdfViewer({ id }) {
  const [blob, setBlob] = useState(null);
  const [numPages, setNumPages] = useState(0);
  const [page, setPage] = useState(1);
  const [error, setError] = useState(false);
  const wrapRef = useRef(null);
  const [width, setWidth] = useState(760);

  useEffect(() => {
    let alive = true;
    getSourcePdf(id).then((b) => alive && setBlob(b)).catch(() => alive && setError(true));
    return () => { alive = false; };
  }, [id]);

  useEffect(() => {
    if (!wrapRef.current) return undefined;
    const ro = new ResizeObserver(([e]) => setWidth(Math.min(e.contentRect.width - 24, 1000)));
    ro.observe(wrapRef.current);
    return () => ro.disconnect();
  }, []);

  if (error) return <p className="text-sm text-muted-foreground">No uploaded report available to preview.</p>;
  if (!blob) {
    return (
      <div className="flex items-center gap-2 p-6 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading document…
      </div>
    );
  }

  return (
    <div ref={wrapRef} className="space-y-3">
      <div className="flex items-center gap-3">
        <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-sm text-muted-foreground">Page {page} / {numPages || '…'}</span>
        <Button variant="outline" size="sm" disabled={page >= numPages} onClick={() => setPage((p) => p + 1)}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
      <div className="flex justify-center overflow-auto rounded-lg border bg-muted/20 max-h-[75vh]">
        <Document
          file={blob}
          onLoadSuccess={({ numPages: n }) => setNumPages(n)}
          loading={<div className="p-8 text-sm text-muted-foreground">Rendering…</div>}
          error={<div className="p-8 text-sm text-destructive">Failed to render PDF.</div>}
        >
          <Page pageNumber={page} width={width} renderAnnotationLayer={false} renderTextLayer={false} />
        </Document>
      </div>
    </div>
  );
}
