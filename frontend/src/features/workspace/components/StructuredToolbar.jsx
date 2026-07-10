import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { 
  Copy, 
  Download, 
  Search, 
  Maximize2, 
  Minimize2,
  Type, 
  Moon, 
  Sun,
  Layout,
  WrapText,
  Plus,
  Minus,
  X
} from "lucide-react";
import { toast } from "sonner";
import { useTheme } from "next-themes";
import { downloadBlob } from "@/lib/download";
import { useWorkspaceLayout } from "../context/WorkspaceLayoutContext";

const FONT_SIZES = ['text-xs', 'text-sm', 'text-base', 'text-lg', 'text-xl', 'text-2xl'];
const FONT_FAMILIES = [
  { label: 'Sans', value: 'font-sans' },
  { label: 'Serif', value: 'font-serif' },
  { label: 'Mono', value: 'font-mono' }
];

export function StructuredToolbar({ markdown }) {
  const { theme, setTheme } = useTheme();
  const {
    isFullscreen,
    setIsFullscreen,
    wordWrap,
    setWordWrap,
    readingMode,
    setReadingMode,
    fontSize,
    setFontSize,
    fontFamily,
    setFontFamily,
    searchQuery,
    setSearchQuery,
  } = useWorkspaceLayout();

  const [showSearch, setShowSearch] = useState(false);

  const handleCopy = () => {
    if (!markdown) return;
    navigator.clipboard.writeText(markdown);
    toast.success("Markdown copied to clipboard");
  };

  const handleDownload = () => {
    if (!markdown) return;
    downloadBlob(markdown, 'document.md', 'text/markdown');
  };

  const handleToggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  const handleIncreaseFont = () => {
    const idx = FONT_SIZES.indexOf(fontSize);
    if (idx < FONT_SIZES.length - 1) {
      setFontSize(FONT_SIZES[idx + 1]);
    }
  };

  const handleDecreaseFont = () => {
    const idx = FONT_SIZES.indexOf(fontSize);
    if (idx > 0) {
      setFontSize(FONT_SIZES[idx - 1]);
    }
  };

  const handleToggleFontFamily = () => {
    const idx = FONT_FAMILIES.findIndex(f => f.value === fontFamily);
    const nextIdx = (idx + 1) % FONT_FAMILIES.length;
    setFontFamily(FONT_FAMILIES[nextIdx].value);
  };

  const handleToggleReadingMode = () => {
    // PanelGroup reacts to readingMode and collapses/expands the side panels
    // through the imperative panel API.
    const nextReadingMode = !readingMode;
    setReadingMode(nextReadingMode);
    if (nextReadingMode) {
      toast.info("Reading mode active (sidebars collapsed)");
    }
  };

  const handleToggleFullscreen = () => {
    setIsFullscreen(isFullscreen === 'workspace' ? null : 'workspace');
  };

  return (
    <div className="h-12 border-b flex items-center justify-between px-3 bg-background shrink-0 z-20 gap-2">
      
      {/* Left: Search & Clipboard Actions */}
      <div className="flex items-center gap-1">
        {showSearch ? (
          <div className="flex items-center gap-1 bg-muted rounded-md px-2 py-0.5 border w-48 sm:w-64 transition-all duration-200">
            <Search className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            <input
              type="text"
              placeholder="Find in document..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent border-none text-xs outline-none w-full placeholder:text-muted-foreground"
              autoFocus
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="text-muted-foreground hover:text-foreground shrink-0"
              >
                <X className="w-3 h-3" />
              </button>
            )}
            <button 
              onClick={() => {
                setShowSearch(false);
                setSearchQuery('');
              }}
              className="text-muted-foreground hover:text-foreground font-semibold text-[10px] uppercase ml-1 shrink-0"
            >
              Done
            </button>
          </div>
        ) : (
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setShowSearch(true)} 
            className="text-xs text-muted-foreground hover:text-foreground h-8"
          >
            <Search className="w-3.5 h-3.5 mr-1.5" /> Find
          </Button>
        )}

        <div className="w-px h-4 bg-border mx-1" />

        <Button variant="ghost" size="sm" onClick={handleCopy} className="text-xs text-muted-foreground hover:text-foreground h-8">
          <Copy className="w-3.5 h-3.5 mr-1.5" /> Copy
        </Button>
        <Button variant="ghost" size="sm" onClick={handleDownload} className="text-xs text-muted-foreground hover:text-foreground h-8">
          <Download className="w-3.5 h-3.5 mr-1.5" /> Download
        </Button>
      </div>

      {/* Right: Layout, Typography & Theme Controls */}
      <div className="flex items-center gap-1">
        {/* Word Wrap Toggle */}
        <Button 
          variant="ghost" 
          size="icon" 
          className={`w-8 h-8 ${wordWrap ? 'text-primary bg-primary/5' : 'text-muted-foreground hover:text-foreground'}`}
          title="Toggle Word Wrap"
          onClick={() => setWordWrap(!wordWrap)}
        >
          <WrapText className="w-4 h-4" />
        </Button>

        {/* Reading Mode Toggle */}
        <Button 
          variant="ghost" 
          size="icon" 
          className={`w-8 h-8 ${readingMode ? 'text-primary bg-primary/5' : 'text-muted-foreground hover:text-foreground'}`}
          title="Toggle Reading Mode"
          onClick={handleToggleReadingMode}
        >
          <Layout className="w-4 h-4" />
        </Button>

        <div className="w-px h-4 bg-border mx-1" />

        {/* Font Controls */}
        <Button 
          variant="ghost" 
          size="icon" 
          className="w-8 h-8 text-muted-foreground hover:text-foreground"
          title="Decrease Font Size" 
          onClick={handleDecreaseFont}
          disabled={FONT_SIZES.indexOf(fontSize) === 0}
        >
          <Minus className="w-3 h-3" />
        </Button>
        
        <span className="text-[10px] font-mono w-10 text-center select-none text-muted-foreground">
          {fontSize.replace('text-', '')}
        </span>

        <Button 
          variant="ghost" 
          size="icon" 
          className="w-8 h-8 text-muted-foreground hover:text-foreground"
          title="Increase Font Size" 
          onClick={handleIncreaseFont}
          disabled={FONT_SIZES.indexOf(fontSize) === FONT_SIZES.length - 1}
        >
          <Plus className="w-3 h-3" />
        </Button>

        <Button 
          variant="ghost" 
          size="icon" 
          className="w-8 h-8 text-muted-foreground hover:text-foreground"
          title={`Font Family: ${fontFamily.replace('font-', '')}`} 
          onClick={handleToggleFontFamily}
        >
          <Type className="w-4 h-4" />
        </Button>

        <div className="w-px h-4 bg-border mx-1" />

        <Button 
          variant="ghost" 
          size="icon" 
          className="w-8 h-8 text-muted-foreground hover:text-foreground"
          title="Toggle Theme" 
          onClick={handleToggleTheme}
        >
          {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </Button>

        <Button 
          variant="ghost" 
          size="icon" 
          className="w-8 h-8 text-muted-foreground hover:text-foreground"
          title="Fullscreen"
          onClick={handleToggleFullscreen}
        >
          {isFullscreen === 'workspace' ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </Button>
      </div>
    </div>
  );
}
