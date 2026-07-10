import { useMemo } from 'react';
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

export function MarkdownViewer({ job }) {
  const { data: markdown, isPending } = useArtifact(job, 'markdown');
  const { setActiveHeadingId } = useWorkspace();
  const { 
    fontSize, 
    fontFamily, 
    wordWrap, 
    readingMode, 
    searchQuery 
  } = useWorkspaceLayout();

  const contentWidth = readingMode ? 'max-w-3xl' : 'max-w-5xl';
  const markdownComponents = useMarkdownComponents();

  // Extend base markdown components with inline search highlights
  const components = useMemo(() => {
    if (!searchQuery) return markdownComponents;

    return {
      ...markdownComponents,
      text: ({ children }) => {
        const textStr = String(children);
        if (!textStr.trim()) return textStr;

        try {
          // Escape special regex characters to prevent syntax errors
          const escapedQuery = searchQuery.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
          const regex = new RegExp(`(${escapedQuery})`, 'gi');
          const parts = textStr.split(regex);

          return (
            <>
              {parts.map((part, i) => 
                part.toLowerCase() === searchQuery.toLowerCase() ? (
                  <mark key={i} className="bg-yellow-200 dark:bg-yellow-800 text-foreground px-0.5 rounded">
                    {part}
                  </mark>
                ) : (
                  part
                )
              )}
            </>
          );
        } catch {
          return textStr;
        }
      }
    };
  }, [markdownComponents, searchQuery]);

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

        <ScrollArea className="flex-1 w-full h-full relative" onScroll={(e) => {
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
          <div className={`p-8 mx-auto ${fontSize} ${fontFamily} ${contentWidth} ${
            wordWrap ? 'break-words whitespace-normal' : 'overflow-x-auto'
          } transition-all duration-200`}>
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              rehypePlugins={[rehypeRaw, rehypeSlug]}
              components={components}
            >
              {markdown || ''}
            </ReactMarkdown>
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
