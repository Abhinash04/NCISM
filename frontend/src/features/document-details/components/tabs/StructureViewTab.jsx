import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { Code, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/**
 * Renders the MarkItDown structured markdown: headings, hierarchy,
 * numbered sections, lists, tables and paragraphs.
 */
const markdownComponents = {
  h1: (props) => <h1 className="mb-3 mt-5 text-lg font-bold first:mt-0" {...props} />,
  h2: (props) => <h2 className="mb-2 mt-5 text-base font-bold first:mt-0" {...props} />,
  h3: (props) => <h3 className="mb-2 mt-4 text-sm font-bold first:mt-0" {...props} />,
  h4: (props) => <h4 className="mb-1.5 mt-3 text-sm font-semibold first:mt-0" {...props} />,
  p: (props) => <p className="mb-3 text-sm leading-relaxed" {...props} />,
  ul: (props) => <ul className="mb-3 list-disc space-y-1 pl-5 text-sm" {...props} />,
  ol: (props) => <ol className="mb-3 list-decimal space-y-1 pl-5 text-sm" {...props} />,
  li: (props) => <li className="leading-relaxed" {...props} />,
  table: (props) => (
    <div className="mb-4 overflow-x-auto rounded-md border">
      <table className="w-full border-collapse text-xs" {...props} />
    </div>
  ),
  thead: (props) => <thead className="bg-muted" {...props} />,
  th: (props) => (
    <th className="border-b border-r px-2 py-1.5 text-left font-semibold last:border-r-0" {...props} />
  ),
  td: (props) => (
    <td className="border-b border-r px-2 py-1.5 align-top last:border-r-0" {...props} />
  ),
  blockquote: (props) => (
    <blockquote className="mb-3 border-l-2 pl-3 text-sm italic text-muted-foreground" {...props} />
  ),
  code: (props) => (
    <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs" {...props} />
  ),
  hr: (props) => <hr className="my-4" {...props} />,
};

export function StructureViewTab({ extraction }) {
  const [view, setView] = useState('rendered');

  if (!extraction.markdown) {
    return (
      <p className="p-4 text-sm text-muted-foreground">
        No structured markdown available.
      </p>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-1 border-b px-3 py-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setView('rendered')}
          className={cn('h-7', view === 'rendered' && 'bg-accent text-accent-foreground')}
        >
          <Eye /> Rendered
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setView('source')}
          className={cn('h-7', view === 'source' && 'bg-accent text-accent-foreground')}
        >
          <Code /> Markdown source
        </Button>
      </div>

      {view === 'rendered' ? (
        <div className="min-h-0 flex-1 overflow-auto p-4">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[rehypeRaw]}
            components={markdownComponents}
          >
            {extraction.markdown}
          </ReactMarkdown>
        </div>
      ) : (
        <pre className="min-h-0 flex-1 overflow-auto whitespace-pre-wrap p-4 font-mono text-xs leading-relaxed">
          {extraction.markdown}
        </pre>
      )}
    </div>
  );
}
