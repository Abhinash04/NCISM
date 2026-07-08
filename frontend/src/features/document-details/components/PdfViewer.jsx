import { useEffect, useMemo, useRef, useState } from 'react';
import { Document, Page } from 'react-pdf';
import { Loader2 } from 'lucide-react';
import '@/lib/pdf'; // configures the pdf.js worker
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import { PdfToolbar } from '@/features/document-details/components/PdfToolbar';

const ZOOM_STEP = 0.25;
const ZOOM_MIN = 0.5;
const ZOOM_MAX = 3;

export function PdfViewer({ blob, filename }) {
  const containerRef = useRef(null);
  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [zoom, setZoom] = useState(1);
  const [fitWidth, setFitWidth] = useState(true);
  const [containerWidth, setContainerWidth] = useState(null);

  // react-pdf reloads the document when the `file` prop identity changes.
  const file = useMemo(() => blob, [blob]);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => {
      setContainerWidth(entry.contentRect.width);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const handleDownload = () => {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const pageWidth =
    fitWidth && containerWidth ? Math.max(containerWidth - 32, 200) : undefined;

  return (
    <div className="flex h-full flex-col">
      <PdfToolbar
        pageNumber={pageNumber}
        numPages={numPages}
        onPageChange={setPageNumber}
        zoom={zoom}
        onZoomIn={() => setZoom((z) => Math.min(z + ZOOM_STEP, ZOOM_MAX))}
        onZoomOut={() => setZoom((z) => Math.max(z - ZOOM_STEP, ZOOM_MIN))}
        fitWidth={fitWidth}
        onToggleFitWidth={() => setFitWidth((f) => !f)}
        onDownload={handleDownload}
      />
      <div ref={containerRef} className="flex-1 overflow-auto bg-slate-200/70 p-4">
        <Document
          file={file}
          onLoadSuccess={({ numPages: total }) => {
            setNumPages(total);
            setPageNumber((page) => Math.min(page, total));
          }}
          loading={
            <div className="flex justify-center py-20 text-muted-foreground">
              <Loader2 className="size-6 animate-spin" />
            </div>
          }
          error={
            <p className="py-20 text-center text-sm text-destructive">
              Failed to load the PDF.
            </p>
          }
        >
          <div className="flex justify-center">
            <Page
              pageNumber={pageNumber}
              width={pageWidth}
              scale={fitWidth ? undefined : zoom}
              className="shadow-md"
            />
          </div>
        </Document>
      </div>
    </div>
  );
}
