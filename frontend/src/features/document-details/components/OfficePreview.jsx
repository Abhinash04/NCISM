import { Download, FileSpreadsheet, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatBytes } from '@/lib/format';

/**
 * Left-pane preview for DOCX/XLSX documents (no page-based viewer):
 * shows the extracted raw text once processed, a placeholder before that.
 */
export function OfficePreview({ document: doc, blob, extraction }) {
  const Icon = doc.type === 'xlsx' ? FileSpreadsheet : FileText;

  const handleDownload = () => {
    const url = URL.createObjectURL(blob);
    const anchor = window.document.createElement('a');
    anchor.href = url;
    anchor.download = doc.filename;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 border-b bg-card px-4 py-2">
        <Icon className="size-4 text-muted-foreground" />
        <span className="text-sm font-medium uppercase text-muted-foreground">
          {doc.type} document · {formatBytes(doc.size)}
        </span>
        <div className="flex-1" />
        <Button variant="ghost" size="icon" onClick={handleDownload} aria-label="Download file">
          <Download />
        </Button>
      </div>

      {extraction?.rawText ? (
        <pre className="flex-1 overflow-auto whitespace-pre-wrap bg-background p-4 font-mono text-xs leading-relaxed">
          {extraction.rawText}
        </pre>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center text-muted-foreground">
          <Icon className="size-10" />
          <p className="text-sm">
            No page preview for {doc.type?.toUpperCase()} files.
            <br />
            Process the document to see its extracted content here.
          </p>
        </div>
      )}
    </div>
  );
}
