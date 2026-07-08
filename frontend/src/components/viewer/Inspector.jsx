import { FileText, Clock, Cpu, FileJson, CheckCircle2, List } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DocumentOutline } from './DocumentOutline';
import { useState, useEffect } from 'react';
import axios from 'axios';

export function Inspector({ job }) {
  const meta = job?.metadata || {};
  const artifacts = meta.artifacts || {};
  const [markdown, setMarkdown] = useState('');
  const [activeId, setActiveId] = useState(null);
  const [assessmentReport, setAssessmentReport] = useState(null);

  useEffect(() => {
    if (artifacts.markdown) {
      axios.get(artifacts.markdown).then(res => setMarkdown(res.data)).catch(console.error);
    }
  }, [artifacts.markdown]);

  useEffect(() => {
    const handleScroll = (e) => setActiveId(e.detail);
    window.addEventListener('markdown-scroll', handleScroll);
    return () => window.removeEventListener('markdown-scroll', handleScroll);
  }, []);

  const handleHeadingClick = (id) => {
    setActiveId(id);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const formatSize = (bytes) => {
    if (!bytes) return 'Unknown';
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

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
                    <span className="font-medium truncate" title={meta.filename}>{meta.filename}</span>
                  </div>
                  <div className="flex justify-between items-center gap-2">
                    <span className="text-muted-foreground shrink-0">Size</span>
                    <span className="font-medium">{formatSize(meta.filesize)}</span>
                  </div>
                  <div className="flex justify-between items-center gap-2">
                    <span className="text-muted-foreground shrink-0">Pages</span>
                    <span className="font-medium">{meta.pageCount || '?'}</span>
                  </div>
                </div>
              </div>

              {/* Engine Info */}
              <div className="space-y-3">
                <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Extraction details</h4>
                <div className="bg-background rounded-md border p-3 space-y-2 text-sm">
                  <div className="flex justify-between items-center gap-2">
                    <span className="text-muted-foreground shrink-0">Status</span>
                    <span className="font-medium text-green-600 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Success
                    </span>
                  </div>
                  <div className="flex justify-between items-center gap-2">
                    <span className="text-muted-foreground shrink-0">Duration</span>
                    <span className="font-medium flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {meta.processingTime}s
                    </span>
                  </div>
                  <div className="flex justify-between items-center gap-2">
                    <span className="text-muted-foreground shrink-0">Pipeline</span>
                    <span className="font-medium text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded">docling-fast</span>
                  </div>
                </div>
              </div>

              {/* Artifacts Info */}
              <div className="space-y-3">
                <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Assets Generated</h4>
                <div className="bg-background rounded-md border p-3 space-y-3 text-sm">
                  {artifacts.markdown && (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-blue-500" />
                        <span>Markdown</span>
                      </div>
                    </div>
                  )}
                  {artifacts.json && (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FileJson className="w-4 h-4 text-yellow-500" />
                        <span>JSON</span>
                      </div>
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
            activeId={activeId}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
