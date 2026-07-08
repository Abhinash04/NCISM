import { cn } from "@/lib/utils";

export function DocumentOutline({ markdown, onHeadingClick, activeId }) {
  if (!markdown) return null;

  // Very simple markdown heading parser
  const headings = [];
  const regex = /^(#{1,6})\s+(.+)$/gm;
  let match;
  let index = 0;
  
  while ((match = regex.exec(markdown)) !== null) {
    const level = match[1].length;
    const text = match[2].replace(/[#*`_]/g, '').trim();
    // Create an ID that matches what remark-slug or standard github uses
    const id = text.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-');
    headings.push({ level, text, id, index: index++ });
  }

  if (headings.length === 0) {
    return (
      <div className="text-xs text-muted-foreground p-4 italic">
        No outline available
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto py-2 px-2 custom-scrollbar">
      <div className="space-y-1">
        {headings.map((h) => (
          <button
            key={`${h.id}-${h.index}`}
            onClick={() => onHeadingClick(h.id)}
            className={cn(
              "w-full text-left px-2 py-1 text-sm rounded-md hover:bg-muted/50 transition-colors truncate",
              activeId === h.id ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:text-foreground",
              h.level === 1 ? "ml-0 font-semibold mt-2" : 
              h.level === 2 ? "ml-3" : 
              h.level === 3 ? "ml-6" : "ml-9"
            )}
            title={h.text}
          >
            {h.text}
          </button>
        ))}
      </div>
    </div>
  );
}
