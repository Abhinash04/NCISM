import { useMemo } from 'react';
import { 
  FileText, 
  Clock, 
  Cpu, 
  FileJson, 
  CheckCircle2, 
  AlertTriangle, 
  List, 
  BarChart4, 
  Download 
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DocumentOutline } from './DocumentOutline';
import { useArtifact } from '@/features/workspace/hooks/useArtifact';
import { useWorkspace } from '../context/WorkspaceContext';
import { formatBytes } from '@/lib/format';
import { downloadBlob } from '@/lib/download';

export function Inspector({ job }) {
  const { data: markdown } = useArtifact(job, 'markdown');
  const { data: pdfBlob } = useArtifact(job, 'pdf');
  const { activeHeadingId, setActiveHeadingId } = useWorkspace();

  const handleHeadingClick = (id) => {
    setActiveHeadingId(id);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const isCompleted = job?.status === 'completed';

  // Compute stats in background
  const stats = useMemo(() => {
    if (!markdown) return { words: 0, headings: 0, tables: 0 };
    
    const words = markdown.trim().split(/\s+/).filter(Boolean).length;
    const headings = (markdown.match(/^(#{1,6})\s+(.+)$/gm) || []).length;
    const tables = (markdown.match(/<table/g) || []).length;
    
    return { words, headings, tables };
  }, [markdown]);

  const handleDownloadMarkdown = () => {
    if (!markdown) return;
    downloadBlob(markdown, job.filename ? `${job.filename.replace(/\.[^/.]+$/, "")}.md` : 'document.md', 'text/markdown');
  };

  const handleDownloadJson = () => {
    if (!job) return;
    downloadBlob(JSON.stringify(job, null, 2), `job_${job.jobId}_raw.json`, 'application/json');
  };

  const handleDownloadPdf = () => {
    if (!pdfBlob) return;
    downloadBlob(pdfBlob, job.filename || 'document.pdf', 'application/pdf');
  };

  return (
    <div className="h-full flex flex-col bg-muted/10 min-h-0">
      <Tabs defaultValue="metadata" className="flex-1 flex flex-col min-h-0">
        <div className="h-10 border-b flex items-center px-4 shrink-0 justify-between bg-muted/5">
          <TabsList className="bg-transparent h-auto p-0 flex w-full justify-between gap-1 overflow-x-auto custom-scrollbar">
            <TabsTrigger 
              value="metadata" 
              className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-primary text-muted-foreground px-0 rounded-none border-b-2 border-transparent data-[state=active]:border-primary py-2 text-[10px] uppercase tracking-wider font-semibold flex-1 text-center"
            >
              <Cpu className="w-3 h-3 mr-1" /> Metadata
            </TabsTrigger>
            <TabsTrigger 
              value="outline" 
              className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-primary text-muted-foreground px-0 rounded-none border-b-2 border-transparent data-[state=active]:border-primary py-2 text-[10px] uppercase tracking-wider font-semibold flex-1 text-center"
            >
              <List className="w-3 h-3 mr-1" /> Outline
            </TabsTrigger>
            <TabsTrigger 
              value="stats" 
              className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-primary text-muted-foreground px-0 rounded-none border-b-2 border-transparent data-[state=active]:border-primary py-2 text-[10px] uppercase tracking-wider font-semibold flex-1 text-center"
            >
              <BarChart4 className="w-3 h-3 mr-1" /> Stats
            </TabsTrigger>
            <TabsTrigger 
              value="downloads" 
              className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-primary text-muted-foreground px-0 rounded-none border-b-2 border-transparent data-[state=active]:border-primary py-2 text-[10px] uppercase tracking-wider font-semibold flex-1 text-center"
            >
              <Download className="w-3 h-3 mr-1" /> Downloads
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Tab contents wrapped in strict min-h-0 flex-1 for independent scroll */}
        <div className="flex-1 min-h-0 relative">
          
          {/* Metadata Tab */}
          <TabsContent value="metadata" className="h-full w-full m-0 p-0 border-none outline-none absolute inset-0 flex flex-col">
            <ScrollArea className="flex-1 h-full w-full">
              <div className="space-y-6 p-4 pb-6">
                {/* File Info */}
                <div className="space-y-3">
                  <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">File Details</h4>
                  <div className="bg-background rounded-md border p-3 space-y-2 text-sm">
                    <div className="flex justify-between items-center gap-2">
                      <span className="text-muted-foreground shrink-0">Filename</span>
                      <span className="font-medium truncate max-w-[180px] text-right" title={job?.filename}>{job?.filename}</span>
                    </div>
                    <div className="flex justify-between items-center gap-2">
                      <span className="text-muted-foreground shrink-0">Size</span>
                      <span className="font-medium">{formatBytes(job?.filesize)}</span>
                    </div>
                    <div className="flex justify-between items-center gap-2">
                      <span className="text-muted-foreground shrink-0">Pages</span>
                      <span className="font-medium">{job?.pageCount || '?'}</span>
                    </div>
                  </div>
                </div>

                {/* Engine Info */}
                <div className="space-y-3">
                  <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Extraction Details</h4>
                  <div className="bg-background rounded-md border p-3 space-y-2 text-sm">
                    <div className="flex justify-between items-center gap-2">
                      <span className="text-muted-foreground shrink-0">Status</span>
                      {isCompleted ? (
                        <span className="font-medium text-green-600 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Completed
                        </span>
                      ) : (
                        <span className="font-medium text-amber-600 flex items-center gap-1 capitalize">
                          <AlertTriangle className="w-3 h-3" /> {job?.status}
                        </span>
                      )}
                    </div>
                    <div className="flex justify-between items-center gap-2">
                      <span className="text-muted-foreground shrink-0">Duration</span>
                      <span className="font-medium flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {((job?.processingTimeMs || 0) / 1000).toFixed(2)}s
                      </span>
                    </div>
                    <div className="flex justify-between items-center gap-2">
                      <span className="text-muted-foreground shrink-0">Pipeline</span>
                      <span className="font-medium text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded">opendataloader · docling-fast</span>
                    </div>
                  </div>
                </div>
              </div>
            </ScrollArea>
          </TabsContent>

          {/* Outline Tab */}
          <TabsContent value="outline" className="h-full w-full m-0 p-0 border-none outline-none absolute inset-0 flex flex-col">
            <DocumentOutline
              markdown={markdown}
              onHeadingClick={handleHeadingClick}
              activeId={activeHeadingId}
            />
          </TabsContent>

          {/* Statistics Tab */}
          <TabsContent value="stats" className="h-full w-full m-0 p-0 border-none outline-none absolute inset-0 flex flex-col">
            <ScrollArea className="flex-1 h-full w-full">
              <div className="space-y-6 p-4 pb-6">
                <div className="space-y-3">
                  <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Document Statistics</h4>
                  <div className="bg-background rounded-md border p-3 space-y-2.5 text-sm">
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Word Count</span>
                      <span className="font-semibold">{stats.words.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Headings</span>
                      <span className="font-semibold">{stats.headings}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Detected Tables</span>
                      <span className="font-semibold">{stats.tables}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Page Count</span>
                      <span className="font-semibold">{job?.pageCount || '?'}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Parse Rate</span>
                      <span className="font-semibold">
                        {job?.pageCount ? `${((job.processingTimeMs / 1000) / job.pageCount).toFixed(2)}s/page` : '?'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </ScrollArea>
          </TabsContent>

          {/* Downloads Tab */}
          <TabsContent value="downloads" className="h-full w-full m-0 p-0 border-none outline-none absolute inset-0 flex flex-col">
            <ScrollArea className="flex-1 h-full w-full">
              <div className="space-y-6 p-4 pb-6">
                <div className="space-y-3">
                  <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Available Assets</h4>
                  <div className="space-y-2">
                    <button
                      onClick={handleDownloadPdf}
                      disabled={!pdfBlob}
                      className="w-full flex items-center justify-between p-3 bg-background border rounded-md hover:bg-muted/50 transition-colors text-sm font-medium disabled:opacity-50"
                    >
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-rose-500" />
                        <span>Download Original PDF</span>
                      </div>
                      <Download className="w-4 h-4 text-muted-foreground" />
                    </button>

                    <button
                      onClick={handleDownloadMarkdown}
                      disabled={!markdown}
                      className="w-full flex items-center justify-between p-3 bg-background border rounded-md hover:bg-muted/50 transition-colors text-sm font-medium disabled:opacity-50"
                    >
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-blue-500" />
                        <span>Download Clean Markdown</span>
                      </div>
                      <Download className="w-4 h-4 text-muted-foreground" />
                    </button>

                    <button
                      onClick={handleDownloadJson}
                      className="w-full flex items-center justify-between p-3 bg-background border rounded-md hover:bg-muted/50 transition-colors text-sm font-medium"
                    >
                      <div className="flex items-center gap-2">
                        <FileJson className="w-4 h-4 text-yellow-500" />
                        <span>Download Job API Payload</span>
                      </div>
                      <Download className="w-4 h-4 text-muted-foreground" />
                    </button>
                  </div>
                </div>
              </div>
            </ScrollArea>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
