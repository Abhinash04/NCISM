import { ScrollArea } from '@/components/ui/scroll-area';

export function HtmlViewer({ data }) {
  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-8 text-center">
        <p className="mb-2 font-medium text-foreground">HTML Not Available</p>
        <p className="text-sm">The backend has not returned an HTML representation for this document.</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full w-full bg-white">
      <div 
        className="p-8 prose max-w-none text-black"
        dangerouslySetInnerHTML={{ __html: data }} 
      />
    </ScrollArea>
  );
}
