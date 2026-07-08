import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { formatBytes } from '@/utils/formatters';
import { FileText, X, Play } from 'lucide-react';
import { motion } from 'framer-motion';
import { Document, Page, pdfjs } from 'react-pdf';

// Initialize PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.mjs`;

export function UploadQueue({ file, onCancel, onProcess }) {
  const [numPages, setNumPages] = useState(null);

  function onDocumentLoadSuccess({ numPages }) {
    setNumPages(numPages);
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="w-full max-w-2xl mx-auto"
    >
      <Card className="overflow-hidden border-2 border-primary/20 bg-card/50 backdrop-blur-sm">
        <div className="flex flex-col md:flex-row h-[300px]">
          {/* Preview Side */}
          <div className="w-full md:w-1/2 bg-muted/30 border-r flex items-center justify-center overflow-hidden relative group">
            {file ? (
              <Document
                file={file}
                onLoadSuccess={onDocumentLoadSuccess}
                loading={
                  <div className="animate-pulse flex items-center gap-2 text-muted-foreground">
                    <FileText className="w-4 h-4" /> Loading preview...
                  </div>
                }
                error={
                  <div className="text-muted-foreground text-sm flex items-center gap-2">
                    <FileText className="w-4 h-4" /> Preview not available
                  </div>
                }
              >
                <Page 
                  pageNumber={1} 
                  width={250} 
                  className="shadow-md rounded overflow-hidden transition-transform duration-500 group-hover:scale-105" 
                  renderTextLayer={false} 
                  renderAnnotationLayer={false} 
                />
              </Document>
            ) : null}
            <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent pointer-events-none" />
          </div>

          {/* Details Side */}
          <div className="w-full md:w-1/2 p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-start justify-between gap-4 mb-4">
                <div className="p-3 bg-primary/10 rounded-xl text-primary shrink-0">
                  <FileText className="w-6 h-6" />
                </div>
                <Button variant="ghost" size="icon" onClick={onCancel} className="shrink-0 -mt-2 -mr-2 text-muted-foreground hover:text-foreground">
                  <X className="w-4 h-4" />
                </Button>
              </div>
              
              <h4 className="font-medium text-lg leading-tight truncate mb-1" title={file?.name}>
                {file?.name}
              </h4>
              
              <div className="flex flex-col gap-1 text-sm text-muted-foreground mb-6">
                <span>{formatBytes(file?.size)}</span>
                {numPages && <span>{numPages} Pages</span>}
                <span className="text-green-600 dark:text-green-400 mt-1 flex items-center gap-1 text-xs font-medium">
                  Ready for extraction
                </span>
              </div>
            </div>

            <div className="flex gap-3 mt-auto">
              <Button variant="outline" className="w-full" onClick={onCancel}>
                Replace
              </Button>
              <Button className="w-full" onClick={onProcess}>
                <Play className="w-4 h-4 mr-2" fill="currentColor" />
                Process PDF
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}
