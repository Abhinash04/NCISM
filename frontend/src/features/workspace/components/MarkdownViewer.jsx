import { useMemo, useDeferredValue, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import rehypeSlug from 'rehype-slug';
import { ScrollArea } from '@/components/ui/scroll-area';
import { StructuredToolbar } from './StructuredToolbar';
import { Loader2 } from 'lucide-react';
import { useArtifact } from '@/features/workspace/hooks/useArtifact';
import { useMarkdownComponents } from '@/components/markdown/MarkdownRenderer';
import { useWorkspace } from '../context/WorkspaceContext';
import { useWorkspaceLayout } from '../context/WorkspaceLayoutContext';
import { rehypeSearchHighlight } from '../lib/rehypeSearchHighlight';

export function MarkdownViewer({ job }) {
  const { data: markdown, isPending } = useArtifact(job, 'markdown');
  const { setActiveHeadingId } = useWorkspace();
  const {
    fontSize,
    fontFamily,
    wordWrap,
    readingMode,
    searchQuery,
    setMatchCount,
  } = useWorkspaceLayout();

  const contentWidth = readingMode ? 'max-w-3xl' : 'max-w-5xl';
  const markdownComponents = useMarkdownComponents();

  // Defer the query so typing stays responsive on large documents (each
  // keystroke re-renders the whole markdown tree).
  const deferredQuery = useDeferredValue(searchQuery);

  const handleCount = useCallback(
    // The plugin runs during render — defer the state update.
    (count) => queueMicrotask(() => setMatchCount(count)),
    [setMatchCount]
  );

  const rehypePlugins = useMemo(
    () => [rehypeRaw, rehypeSlug, [rehypeSearchHighlight, { query: deferredQuery, onCount: handleCount }]],
    [deferredQuery, handleCount]
  );

  if (!job?.artifacts?.markdown) {
    return (
      <div className="flex flex-col items-center justify-center w-full h-full text-muted-foreground p-8 text-center min-h-0">
        <p className="mb-2 font-medium text-foreground">Markdown Not Available</p>
        <p className="text-sm">The backend has not returned a Markdown representation for this document.</p>
      </div>
    );
  }

  if (isPending) {
    return (
      <div className="flex items-center justify-center w-full h-full min-h-0">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex w-full h-full relative overflow-hidden bg-background min-h-0">
      <div className="flex-1 flex flex-col min-w-0 min-h-0">
        <StructuredToolbar markdown={markdown} />

        <ScrollArea className="flex-1 min-h-0 w-full relative" onScroll={(e) => {
          // Highlight active outline section based on scroll
          const target = e.target;
          const headings = Array.from(target.querySelectorAll('h1, h2, h3, h4, h5, h6'));
          for (let i = headings.length - 1; i >= 0; i--) {
            const rect = headings[i].getBoundingClientRect();
            if (rect.top <= 120) {
              setActiveHeadingId(headings[i].id);
              break;
            }
          }
        }}>
          <div id="markdown-search-root" className={`p-8 mx-auto ${fontSize} ${fontFamily} ${contentWidth} ${
            wordWrap ? 'break-words whitespace-normal' : 'overflow-x-auto'
          } transition-all duration-200`}>
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              rehypePlugins={rehypePlugins}
              components={markdownComponents}
            >
              {markdown || ''}
            </ReactMarkdown>
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
