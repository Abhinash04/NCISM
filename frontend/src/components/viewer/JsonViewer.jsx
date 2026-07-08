import JsonView from '@uiw/react-json-view';
import { darkTheme } from '@uiw/react-json-view/dark';
import { lightTheme } from '@uiw/react-json-view/light';
import { useTheme } from 'next-themes';
import { ScrollArea } from '@/components/ui/scroll-area';

export function JsonViewer({ data }) {
  const { resolvedTheme } = useTheme();

  if (!data) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        No JSON data available
      </div>
    );
  }

  return (
    <ScrollArea className="h-full w-full">
      <div className="p-6">
        <JsonView 
          value={data} 
          style={resolvedTheme === 'dark' ? darkTheme : lightTheme} 
          displayDataTypes={false}
          collapsed={1} 
        />
      </div>
    </ScrollArea>
  );
}
