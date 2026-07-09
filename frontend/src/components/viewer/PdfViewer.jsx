import { useState, useRef, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  ZoomIn, 
  ZoomOut, 
  RotateCw, 
  Maximize, 
  Minimize,
  FileText,
  ChevronLeft,
  ChevronRight,
  Download,
  Expand
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { resolveArtifactUrl } from '@/lib/api/client';

import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Initialize PDF.js worker using a local fallback or CDN
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

export function PdfViewer({ job }) {
  const [numPages, setNumPages] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [scale, setScale] = useState(1.0);
  const [rotation, setRotation] = useState(0);
  const [fitMode, setFitMode] = useState('width'); // 'width' or 'page'
  const [containerSize, setContainerSize] = useState({ width: 800, height: 800 });
  const containerRef = useRef(null);
  const scrollAreaRef = useRef(null);
  
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (let entry of entries) {
        setContainerSize({
          width: entry.contentRect.width,
          height: entry.contentRect.height
        });
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  function onDocumentLoadSuccess({ numPages }) {
    setNumPages(numPages);
  }

  const handleZoomIn = () => setScale(s => Math.min(s + 0.2, 3.0));
  const handleZoomOut = () => setScale(s => Math.max(s - 0.2, 0.5));
  const handleRotate = () => setRotation(r => (r + 90) % 360);
  
  const toggleFitMode = () => {
    setFitMode(prev => prev === 'width' ? 'page' : 'width');
    setScale(1.0);
  };

  const getPageWidth = () => {
    return fitMode === 'width' ? containerSize.width - 64 : undefined;
  };

  const getPageHeight = () => {
    return fitMode === 'page' ? containerSize.height - 64 : undefined;
  };

  const pdfUrl = resolveArtifactUrl(job?.artifacts?.pdf);

  const handlePrevPage = () => {
    setCurrentPage(p => Math.max(1, p - 1));
    scrollToPage(currentPage - 1);
  };

  const handleNextPage = () => {
    setCurrentPage(p => Math.min(numPages || 1, p + 1));
    scrollToPage(currentPage + 1);
  };

  const scrollToPage = (pageNumber) => {
    const pageElement = document.getElementById(`pdf-page-${pageNumber}`);
    if (pageElement) {
      pageElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleDownload = () => {
    if (!pdfUrl) return;
    const a = document.createElement('a');
    a.href = pdfUrl;
    a.download = job.filename || 'document.pdf';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  if (!job || !pdfUrl) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-12">
        <FileText className="w-12 h-12 mb-4 opacity-20" />
        <p>No PDF available to preview</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full w-full bg-muted/20 relative" ref={containerRef}>
      {/* Sticky PDF Toolbar (VS Code / Adobe Style) */}
      <div className="h-12 border-b flex items-center justify-between px-2 bg-background shrink-0 z-20">
        
        {/* Pagination */}
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={handlePrevPage} disabled={currentPage <= 1}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <div className="text-sm px-2 text-muted-foreground">
            <span className="font-medium text-foreground">{currentPage}</span> / {numPages || '?'}
          </div>
          <Button variant="ghost" size="icon" onClick={handleNextPage} disabled={currentPage >= (numPages || 1)}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        {/* Zoom Controls */}
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={handleZoomOut} title="Zoom Out">
            <ZoomOut className="w-4 h-4" />
          </Button>
          <span className="text-xs w-10 text-center font-medium">{Math.round(scale * 100)}%</span>
          <Button variant="ghost" size="icon" onClick={handleZoomIn} title="Zoom In">
            <ZoomIn className="w-4 h-4" />
          </Button>
          
          <div className="w-px h-4 bg-border mx-1" />
          
          <Button variant="ghost" size="icon" onClick={toggleFitMode} title={fitMode === 'width' ? "Fit Page" : "Fit Width"}>
            {fitMode === 'width' ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
          </Button>
          <Button variant="ghost" size="icon" onClick={handleRotate} title="Rotate">
            <RotateCw className="w-4 h-4" />
          </Button>
        </div>
        
        {/* Actions */}
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" title="Fullscreen">
            <Expand className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={handleDownload} title="Download Original">
            <Download className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="absolute top-12 w-full h-8 bg-gradient-to-b from-background/80 to-transparent z-10 pointer-events-none" />

      {/* PDF Scroll Area */}
      <ScrollArea className="flex-1 w-full h-full relative" ref={scrollAreaRef} onScroll={(e) => {
        // Very basic scroll tracking to update current page indicator
        const target = e.target;
        const pageElements = target.querySelectorAll('.pdf-page-container');
        for (let i = 0; i < pageElements.length; i++) {
          const rect = pageElements[i].getBoundingClientRect();
          if (rect.top >= 0 && rect.top <= window.innerHeight / 2) {
            setCurrentPage(i + 1);
            break;
          }
        }
      }}>
        <div className="p-8 flex flex-col items-center min-h-full">
          <Document
            file={pdfUrl}
            onLoadSuccess={onDocumentLoadSuccess}
            loading={
              <div className="flex flex-col items-center justify-center space-y-4 p-12 w-full max-w-2xl mx-auto">
                <Skeleton className="h-[800px] w-full rounded-md" />
              </div>
            }
            error={
              <div className="flex flex-col items-center justify-center text-muted-foreground p-12">
                <FileText className="w-8 h-8 mb-4 text-destructive" />
                <p>Failed to load PDF</p>
              </div>
            }
          >
            {Array.from(new Array(numPages), (el, index) => (
              <div 
                id={`pdf-page-${index + 1}`}
                key={`page_${index + 1}`} 
                className="pdf-page-container mb-6 shadow-md rounded border overflow-hidden bg-white transition-transform duration-200"
              >
                <Page 
                  pageNumber={index + 1} 
                  scale={scale}
                  rotate={rotation}
                  width={getPageWidth()}
                  height={getPageHeight()}
                  renderTextLayer={true} 
                  renderAnnotationLayer={true} 
                  loading={<Skeleton className="h-[800px] w-full" />}
                />
              </div>
            ))}
          </Document>
        </div>
      </ScrollArea>
    </div>
  );
}
