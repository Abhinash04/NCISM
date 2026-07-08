import { Button } from "@/components/ui/button";
import { 
  Copy, 
  Download, 
  Search, 
  Maximize, 
  Type, 
  AlignLeft, 
  Moon, 
  Sun,
  LayoutTemplate
} from "lucide-react";
import { toast } from "sonner";
import { useTheme } from "next-themes";

export function StructuredToolbar({ 
  markdown, 
  onFontSizeChange, 
  onFontFamilyChange,
  onWidthChange 
}) {
  const { theme, setTheme } = useTheme();

  const handleCopy = () => {
    if (!markdown) return;
    navigator.clipboard.writeText(markdown);
    toast.success("Markdown copied to clipboard");
  };

  const handleDownload = () => {
    if (!markdown) return;
    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'document.md';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleToggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  // Very basic toggles for demo
  const toggleFontSize = () => {
    onFontSizeChange(prev => prev === 'text-base' ? 'text-lg' : prev === 'text-lg' ? 'text-sm' : 'text-base');
  };

  const toggleWidth = () => {
    onWidthChange(prev => prev === 'max-w-4xl' ? 'max-w-none' : 'max-w-4xl');
  };

  const toggleFontFamily = () => {
    onFontFamilyChange(prev => prev === 'font-sans' ? 'font-serif' : prev === 'font-serif' ? 'font-mono' : 'font-sans');
  };

  return (
    <div className="h-12 border-b flex items-center justify-between px-2 bg-background shrink-0 z-20">
      
      {/* Actions */}
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="sm" onClick={handleCopy} className="text-xs text-muted-foreground hover:text-foreground">
          <Copy className="w-3.5 h-3.5 mr-1.5" /> Copy
        </Button>
        <Button variant="ghost" size="sm" onClick={handleDownload} className="text-xs text-muted-foreground hover:text-foreground">
          <Download className="w-3.5 h-3.5 mr-1.5" /> Download
        </Button>
      </div>

      {/* Typography & View Controls */}
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" title="Search (Ctrl+F)" onClick={() => {
          // Trigger native search if possible or custom modal
          toast.info("Press Ctrl+F to search the document");
        }}>
          <Search className="w-4 h-4 text-muted-foreground" />
        </Button>

        <div className="w-px h-4 bg-border mx-1" />

        <Button variant="ghost" size="icon" title="Change Font Size" onClick={toggleFontSize}>
          <Type className="w-4 h-4 text-muted-foreground" />
        </Button>
        
        <Button variant="ghost" size="icon" title="Change Font Family" onClick={toggleFontFamily}>
          <AlignLeft className="w-4 h-4 text-muted-foreground" />
        </Button>

        <Button variant="ghost" size="icon" title="Toggle Reading Width" onClick={toggleWidth}>
          <LayoutTemplate className="w-4 h-4 text-muted-foreground" />
        </Button>

        <div className="w-px h-4 bg-border mx-1" />

        <Button variant="ghost" size="icon" title="Toggle Theme" onClick={handleToggleTheme}>
          {theme === 'dark' ? <Sun className="w-4 h-4 text-muted-foreground" /> : <Moon className="w-4 h-4 text-muted-foreground" />}
        </Button>

        <Button variant="ghost" size="icon" title="Fullscreen (Ctrl+Shift+F)">
          <Maximize className="w-4 h-4 text-muted-foreground" />
        </Button>
      </div>
    </div>
  );
}
