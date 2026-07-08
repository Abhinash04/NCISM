import { Button } from '@/components/ui/button';
import { Download, RefreshCw, X } from 'lucide-react';
import { openDataLoaderService } from '@/services/opendataloader.service';

export function Toolbar({ result, onReset, file }) {
  const { capabilities, document } = result;
  
  const handleDownloadJson = () => {
    openDataLoaderService.downloadJson(document.json, file.name);
  };

  const handleDownloadMarkdown = () => {
    openDataLoaderService.downloadMarkdown(document.markdown, file.name);
  };

  const handleDownloadHtml = () => {
    openDataLoaderService.downloadHtml(document.html, file.name);
  };

  return (
    <div className="flex items-center gap-2">
      {capabilities.json && (
        <Button variant="outline" size="sm" onClick={handleDownloadJson} className="h-8">
          <Download className="w-3.5 h-3.5 mr-2" />
          JSON
        </Button>
      )}
      
      {capabilities.markdown && (
        <Button variant="outline" size="sm" onClick={handleDownloadMarkdown} className="h-8">
          <Download className="w-3.5 h-3.5 mr-2" />
          Markdown
        </Button>
      )}

      {capabilities.html && (
        <Button variant="outline" size="sm" onClick={handleDownloadHtml} className="h-8">
          <Download className="w-3.5 h-3.5 mr-2" />
          HTML
        </Button>
      )}

      <div className="w-px h-4 bg-border mx-1" />

      <Button variant="ghost" size="icon" onClick={onReset} className="h-8 w-8 text-muted-foreground hover:text-foreground">
        <RefreshCw className="w-4 h-4" />
      </Button>
      <Button variant="ghost" size="icon" onClick={onReset} className="h-8 w-8 text-muted-foreground hover:text-foreground">
        <X className="w-4 h-4" />
      </Button>
    </div>
  );
}
