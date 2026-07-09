import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Copy, Maximize, Download } from 'lucide-react';
import { toast } from 'sonner';
import { downloadBlob } from '@/lib/download';

export function RawViewer({ job }) {
  if (!job) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-8 text-center">
        <p className="mb-2 font-medium text-foreground">Raw Response Not Available</p>
      </div>
    );
  }

  const payload = JSON.stringify(job, null, 2);

  const handleCopy = () => {
    navigator.clipboard.writeText(payload);
    toast.success('Raw payload copied');
  };

  const handleDownload = () => {
    downloadBlob(payload, `job_${job.jobId}_raw.json`, 'application/json');
  };

  return (
    <div className="flex flex-col h-full w-full bg-[#1e1e1e] relative overflow-hidden">
      {/* Raw Toolbar */}
      <div className="h-12 border-b border-white/10 flex items-center justify-between px-2 shrink-0 z-20">
        <div className="flex items-center gap-1 text-sm font-medium px-2 text-white/50">
          Job API Response
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={handleCopy} title="Copy" className="text-white/70 hover:text-white hover:bg-white/10">
            <Copy className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={handleDownload} title="Download" className="text-white/70 hover:text-white hover:bg-white/10">
            <Download className="w-4 h-4" />
          </Button>
          <div className="w-px h-4 bg-white/20 mx-1" />
          <Button variant="ghost" size="icon" title="Fullscreen" className="text-white/70 hover:text-white hover:bg-white/10">
            <Maximize className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1 w-full relative">
        <pre className="p-6 text-sm text-[#d4d4d4] font-mono whitespace-pre-wrap break-words">
          {payload}
        </pre>
      </ScrollArea>
    </div>
  );
}
