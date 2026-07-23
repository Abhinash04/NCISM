import { useEffect, useRef, useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Maximize, Minimize, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
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
  const [isFs, setIsFs] = useState(false);
  const wrapRef = useRef(null);
  const [width, setWidth] = useState(760);

  useEffect(() => {
    let alive = true;
    getSourcePdf(id).then((b) => alive && setBlob(b)).catch(() => alive && setError(true));
    return () => { alive = false; };
  }, [id]);

  useEffect(() => {
    if (!wrapRef.current) return undefined;
    const ro = new ResizeObserver(([e]) => setWidth(Math.min(e.contentRect.width - 24, 1400)));
    ro.observe(wrapRef.current);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const onFs = () => setIsFs(document.fullscreenElement === wrapRef.current);
    document.addEventListener('fullscreenchange', onFs);
    return () => document.removeEventListener('fullscreenchange', onFs);
  }, []);

  const toggleFullscreen = () => {
    if (document.fullscreenElement) document.exitFullscreen?.();
    else wrapRef.current?.requestFullscreen?.();
  };

  const go = (n) => setPage(() => Math.min(Math.max(1, n), numPages || 1));

  if (error) return <p className="text-sm text-muted-foreground">No uploaded report available to preview.</p>;
  if (!blob) {
    return (
      <div className="flex items-center gap-2 p-6 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading document…
      </div>
    );
  }

  return (
    <div ref={wrapRef} className={cn('bg-background', isFs ? 'flex h-screen flex-col p-4' : 'space-y-3')}>
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-1 rounded-md border-2 border-foreground bg-card p-1 neo-shadow-sm">
          <Button variant="ghost" size="icon-sm" disabled={page <= 1} onClick={() => go(1)} title="First page">
            <ChevronsLeft className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon-sm" disabled={page <= 1} onClick={() => go(page - 1)} title="Previous page">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-1 px-1 text-sm">
            <input
              type="number"
              min={1}
              max={numPages || 1}
              value={page}
              onChange={(e) => go(Number(e.target.value))}
              aria-label="Go to page"
              className="w-12 h-7 rounded-md border-2 border-foreground bg-background text-center text-sm font-medium outline-none focus:ring-2 focus:ring-ring [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
            />
            <span className="text-muted-foreground">/ {numPages || '…'}</span>
          </div>
          <Button variant="ghost" size="icon-sm" disabled={page >= numPages} onClick={() => go(page + 1)} title="Next page">
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon-sm" disabled={page >= numPages} onClick={() => go(numPages)} title="Last page">
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>

        <Button variant="outline" size="sm" onClick={toggleFullscreen} title={isFs ? 'Exit full screen' : 'Full screen'}>
          {isFs ? <Minimize className="h-4 w-4 mr-1.5" /> : <Maximize className="h-4 w-4 mr-1.5" />}
          {isFs ? 'Exit' : 'Full screen'}
        </Button>
      </div>

      {/* Page area */}
      <div className={cn(
        'flex justify-center overflow-auto rounded-lg border-2 border-foreground bg-muted/20 p-4',
        isFs ? 'flex-1' : 'max-h-[75vh]',
      )}>
        <Document
          file={blob}
          onLoadSuccess={({ numPages: n }) => setNumPages(n)}
          loading={<div className="p-8 text-sm text-muted-foreground">Rendering…</div>}
          error={<div className="p-8 text-sm text-destructive">Failed to render PDF.</div>}
        >
          <div className="shadow-lg h-fit">
            <Page pageNumber={page} width={width} renderAnnotationLayer={false} renderTextLayer={false} />
          </div>
        </Document>
      </div>
    </div>
  );
}
