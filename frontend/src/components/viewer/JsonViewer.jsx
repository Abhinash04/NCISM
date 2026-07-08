import { useState, useEffect } from 'react';
import JsonView from '@uiw/react-json-view';
import { darkTheme } from '@uiw/react-json-view/dark';
import { lightTheme } from '@uiw/react-json-view/light';
import { useTheme } from 'next-themes';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Copy, Maximize, FoldVertical, UnfoldVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import axios from 'axios';

export function JsonViewer({ url }) {
  const { resolvedTheme } = useTheme();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [collapsed, setCollapsed] = useState(1);

  useEffect(() => {
    if (!url) return;
    const fetchJson = async () => {
      setLoading(true);
      try {
        const response = await axios.get(url);
        setData(response.data);
      } catch (err) {
        console.error('Failed to fetch JSON', err);
      } finally {
        setLoading(false);
      }
    };
    fetchJson();
  }, [url]);

  const handleCopy = () => {
    if (!data) return;
    navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    toast.success('JSON copied to clipboard');
  };

  if (!url) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        No JSON data available
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center w-full h-full">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Handle undefined, null, or empty data
  if (data === null || data === undefined) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        No JSON data available.
      </div>
    );
  }

  // Handle strings or non-objects
  if (typeof data !== 'object') {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-6 text-center space-y-4">
        <p>Invalid JSON received.</p>
        <pre className="text-xs bg-muted p-4 rounded-md max-w-full overflow-auto">
          {String(data).slice(0, 500)}
        </pre>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full w-full bg-background relative overflow-hidden">
      {/* JSON Toolbar */}
      <div className="h-12 border-b flex items-center justify-between px-2 bg-background shrink-0 z-20">
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={handleCopy} className="text-xs text-muted-foreground hover:text-foreground">
            <Copy className="w-3.5 h-3.5 mr-1.5" /> Copy
          </Button>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" title="Expand All" onClick={() => setCollapsed(false)}>
            <UnfoldVertical className="w-4 h-4 text-muted-foreground" />
          </Button>
          <Button variant="ghost" size="icon" title="Collapse All" onClick={() => setCollapsed(1)}>
            <FoldVertical className="w-4 h-4 text-muted-foreground" />
          </Button>
          <div className="w-px h-4 bg-border mx-1" />
          <Button variant="ghost" size="icon" title="Fullscreen">
            <Maximize className="w-4 h-4 text-muted-foreground" />
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1 w-full relative">
        <div className="p-6">
          <JsonView 
            value={data} 
            style={resolvedTheme === 'dark' ? darkTheme : lightTheme} 
            displayDataTypes={false}
            collapsed={collapsed} 
          />
        </div>
      </ScrollArea>
    </div>
  );
}
