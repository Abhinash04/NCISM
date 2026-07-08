import { ScrollArea } from '@/components/ui/scroll-area';

export function RawViewer({ data }) {
  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-8 text-center">
        <p className="mb-2 font-medium text-foreground">Raw Response Not Available</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full w-full bg-[#1e1e1e]">
      <pre className="p-6 text-sm text-[#d4d4d4] font-mono whitespace-pre-wrap break-words">
        {typeof data === 'string' ? data : JSON.stringify(data, null, 2)}
      </pre>
    </ScrollArea>
  );
}
