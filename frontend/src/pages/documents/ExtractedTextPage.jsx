import { useState } from 'react';
import { DocumentPageLayout } from '@/features/documents/components/DocumentPageLayout';
import { useArtifact } from '@/features/workspace/hooks/useArtifact';
import { downloadBlob } from '@/lib/download';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Copy, Download, WrapText, Loader2 } from 'lucide-react';

export function ExtractedTextPage() {
  return (
    <DocumentPageLayout title="Extracted Text">
      {(job) => <TextContent job={job} />}
    </DocumentPageLayout>
  );
}

function TextContent({ job }) {
  const { data: markdown, isPending } = useArtifact(job, 'markdown');
  const [wrap, setWrap] = useState(true);

  if (isPending) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!markdown) {
    return <div className="flex items-center justify-center h-full text-muted-foreground">Extracted text not available for this document.</div>;
  }

  return (
    <div className="flex flex-col h-full min-h-0 px-6 md:px-8 pb-6">
      <div className="h-11 border rounded-t-xl bg-background flex items-center justify-end px-3 gap-1 shrink-0">
        <Button variant="ghost" size="icon"
          className={`w-7 h-7 ${wrap ? 'text-primary bg-primary/5' : 'text-muted-foreground hover:text-foreground'}`}
          title="Toggle word wrap" onClick={() => setWrap((v) => !v)}>
          <WrapText className="w-3.5 h-3.5" />
        </Button>
        <Button variant="ghost" size="sm" className="text-xs text-muted-foreground hover:text-foreground h-8"
          onClick={() => { navigator.clipboard.writeText(markdown); toast.success('Text copied'); }}>
          <Copy className="w-3.5 h-3.5 mr-1.5" /> Copy
        </Button>
        <Button variant="ghost" size="sm" className="text-xs text-muted-foreground hover:text-foreground h-8"
          onClick={() => downloadBlob(markdown, `${(job.filename || 'document').replace(/\.[^/.]+$/, '')}.md`, 'text/markdown')}>
          <Download className="w-3.5 h-3.5 mr-1.5" /> Download
        </Button>
      </div>
      <div className="flex-1 min-h-0 overflow-auto border border-t-0 rounded-b-xl bg-background">
        <pre className={`p-6 text-xs font-mono text-muted-foreground ${wrap ? 'whitespace-pre-wrap break-words' : 'whitespace-pre'}`}>
          {markdown}
        </pre>
      </div>
    </div>
  );
}
