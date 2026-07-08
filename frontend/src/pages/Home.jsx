import { useRef } from 'react';
import { useUpload } from '@/hooks/useUpload';
import { DragDropZone } from '@/components/upload/DragDropZone';
import { UploadQueue } from '@/components/upload/UploadQueue';
import { ProcessingTimeline } from '@/components/upload/ProcessingTimeline';
import { SplitScreenViewer } from '@/components/viewer/SplitScreenViewer';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { ArrowDown, Zap, FileJson, Layers } from 'lucide-react';
import { motion } from 'framer-motion';

export function Home() {
  const { 
    file, 
    status, 
    timelineStep, 
    result, 
    selectFile, 
    processFile, 
    reset 
  } = useUpload();
  
  const demoRef = useRef(null);

  const scrollToDemo = () => {
    demoRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // If we have a result, take over the screen
  if (status === 'success' && result) {
    return (
      <MainLayout>
        <div className="h-[calc(100vh-3.5rem)]">
          <SplitScreenViewer file={file} result={result} onReset={reset} />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="flex flex-col min-h-[calc(100vh-3.5rem)]">
        
        {/* Hero Section */}
        <section className="flex-1 flex flex-col items-center justify-center text-center px-4 py-20 md:py-32 relative overflow-hidden">
          {/* Background Glow */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/5 rounded-full blur-3xl pointer-events-none" />
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="z-10"
          >
            <div className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80 mb-6">
              ✨ Introducing OpenDataLoader PDF
            </div>
            <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-6 max-w-3xl mx-auto text-balance leading-tight">
              Extract structured content from PDFs instantly
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 text-balance">
              Powered by advanced hybrid parsing, OpenDataLoader converts complex documents into clean JSON and Markdown while preserving semantic structure.
            </p>
            <Button size="lg" className="rounded-full px-8" onClick={scrollToDemo}>
              Try the Demo
              <ArrowDown className="ml-2 w-4 h-4" />
            </Button>
          </motion.div>
        </section>

        {/* Features Section */}
        <section className="py-20 bg-muted/30 border-y">
          <div className="container max-w-5xl mx-auto px-4">
            <div className="grid md:grid-cols-3 gap-8">
              <div className="flex flex-col items-center text-center p-6">
                <div className="w-12 h-12 bg-primary/10 text-primary rounded-xl flex items-center justify-center mb-4">
                  <Zap className="w-6 h-6" />
                </div>
                <h3 className="font-semibold text-lg mb-2">High-Speed Parsing</h3>
                <p className="text-muted-foreground text-sm">Extract data from massive documents in seconds using optimized hybrid pipelines.</p>
              </div>
              <div className="flex flex-col items-center text-center p-6">
                <div className="w-12 h-12 bg-primary/10 text-primary rounded-xl flex items-center justify-center mb-4">
                  <Layers className="w-6 h-6" />
                </div>
                <h3 className="font-semibold text-lg mb-2">Semantic Structure</h3>
                <p className="text-muted-foreground text-sm">Preserves document hierarchy, tables, and reading order perfectly.</p>
              </div>
              <div className="flex flex-col items-center text-center p-6">
                <div className="w-12 h-12 bg-primary/10 text-primary rounded-xl flex items-center justify-center mb-4">
                  <FileJson className="w-6 h-6" />
                </div>
                <h3 className="font-semibold text-lg mb-2">Developer Ready</h3>
                <p className="text-muted-foreground text-sm">Outputs clean, normalized JSON and Markdown ready for LLMs and databases.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Demo Section */}
        <section ref={demoRef} className="py-24 px-4 container max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Experience the Parser</h2>
            <p className="text-muted-foreground max-w-lg mx-auto">
              Upload a document below to see OpenDataLoader extract structure in real-time.
            </p>
          </div>

          <div className="w-full">
            {status === 'idle' && (
              <DragDropZone onFileSelect={selectFile} />
            )}
            
            {status === 'preview' && (
              <UploadQueue 
                file={file} 
                onCancel={reset} 
                onProcess={processFile} 
              />
            )}
            
            {status === 'processing' && (
              <ProcessingTimeline currentStep={timelineStep} />
            )}

            {status === 'error' && (
              <div className="text-center">
                <p className="text-destructive mb-4">Extraction failed. Please try again.</p>
                <Button variant="outline" onClick={reset}>Try Another File</Button>
              </div>
            )}
          </div>
        </section>
      </div>
    </MainLayout>
  );
}
