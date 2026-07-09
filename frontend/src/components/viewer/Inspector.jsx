import { FileText, Clock, Cpu, FileJson, CheckCircle2, AlertTriangle, List } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DocumentOutline } from './DocumentOutline';
import { useArtifact } from '@/hooks/useArtifact';
import { useWorkspace } from './WorkspaceContext';
import { formatBytes } from '@/lib/format';

export function Inspector({ job }) {
  const { data: markdown } = useArtifact(job, 'markdown');
  const { activeHeadingId, setActiveHeadingId } = useWorkspace();

  const handleHeadingClick = (id) => {
    setActiveHeadingId(id);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const artifacts = job?.artifacts || {};
  const isCompleted = job?.status === 'completed';

  return (
    <div className="h-full flex flex-col bg-muted/10">
      <Tabs defaultValue="metadata" className="flex-1 flex flex-col">
        <div className="h-14 border-b flex items-center px-4 shrink-0 justify-between">
          <TabsList className="bg-transparent h-auto p-0 space-x-4">
            <TabsTrigger value="metadata" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-primary text-muted-foreground px-0 rounded-none border-b-2 border-transparent data-[state=active]:border-primary py-2 text-xs uppercase tracking-wider font-semibold">
              <Cpu className="w-3.5 h-3.5 mr-1.5" /> Metadata
            </TabsTrigger>
            <TabsTrigger value="outline" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-primary text-muted-foreground px-0 rounded-none border-b-2 border-transparent data-[state=active]:border-primary py-2 text-xs uppercase tracking-wider font-semibold">
              <List className="w-3.5 h-3.5 mr-1.5" /> Outline
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="metadata" className="flex-1 overflow-hidden m-0 data-[state=active]:flex flex-col">
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-6 pb-6">
              {/* File Info */}
              <div className="space-y-3">
                <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">File Header</h4>
                <div className="bg-background rounded-md border p-3 space-y-2 text-sm">
                  <div className="flex justify-between items-center gap-2">
                    <span className="text-muted-foreground shrink-0">Filename</span>
                    <span className="font-medium truncate" title={job?.filename}>{job?.filename}</span>
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
                <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Extraction details</h4>
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

              {/* Artifacts Info */}
              <div className="space-y-3">
                <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Assets Generated</h4>
                <div className="bg-background rounded-md border p-3 space-y-3 text-sm">
                  {artifacts.markdown && (
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-blue-500" />
                      <span>Markdown</span>
                    </div>
                  )}
                  {artifacts.json && (
                    <div className="flex items-center gap-2">
                      <FileJson className="w-4 h-4 text-yellow-500" />
                      <span>JSON</span>
                    </div>
                  )}
                  {artifacts.report && (
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-emerald-500" />
                      <span>Assessment Report</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="outline" className="flex-1 overflow-hidden m-0 data-[state=active]:flex flex-col">
          <DocumentOutline
            markdown={markdown}
            onHeadingClick={handleHeadingClick}
            activeId={activeHeadingId}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
