import { useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DynamicTabs } from './DynamicTabs';
import { MetadataPanel } from './MetadataPanel';
import { Toolbar } from './Toolbar';
import { FileText, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

// Initialize PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.mjs`;

export function SplitScreenViewer({ file, result, onReset }) {
  const [numPages, setNumPages] = useState(null);

  function onDocumentLoadSuccess({ numPages }) {
    setNumPages(numPages);
  }

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex h-full w-full overflow-hidden"
    >
      {/* Left Panel: PDF Viewer */}
      <div className="w-1/2 border-r bg-muted/20 flex flex-col h-full relative">
        <div className="absolute top-0 w-full h-12 bg-gradient-to-b from-background/80 to-transparent z-10 pointer-events-none" />
        
        <ScrollArea className="flex-1 w-full h-full">
          <div className="p-8 flex flex-col items-center min-h-full">
            {file ? (
              <Document
                file={file}
                onLoadSuccess={onDocumentLoadSuccess}
                loading={
                  <div className="flex flex-col items-center justify-center text-muted-foreground p-12">
                    <Loader2 className="w-8 h-8 animate-spin mb-4" />
                    <p>Rendering PDF...</p>
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
                  <div key={`page_${index + 1}`} className="mb-6 shadow-md rounded border overflow-hidden">
                     <Page 
                      pageNumber={index + 1} 
                      width={800} 
                      className="bg-white"
                      renderTextLayer={true} 
                      renderAnnotationLayer={true} 
                    />
                  </div>
                ))}
              </Document>
            ) : null}
          </div>
        </ScrollArea>
      </div>

      {/* Right Panel: Data & Metadata */}
      <div className="w-1/2 flex flex-col h-full bg-background relative">
        {/* Toolbar */}
        <div className="h-14 border-b flex items-center px-4 justify-between shrink-0 bg-background z-20">
          <h2 className="font-semibold text-sm truncate max-w-[50%]">{file?.name}</h2>
          <Toolbar result={result} onReset={onReset} file={file} />
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* Main Viewer Area */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <DynamicTabs result={result} />
          </div>

          {/* Sticky Metadata Panel */}
          <div className="w-64 border-l bg-muted/10 hidden lg:block shrink-0">
            <MetadataPanel result={result} file={file} />
          </div>
        </div>
      </div>
    </motion.div>
  );
}
