import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import rehypeSlug from 'rehype-slug';
import { ScrollArea } from '@/components/ui/scroll-area';
import { StructuredToolbar } from './StructuredToolbar';
import { Loader2 } from 'lucide-react';
import { useArtifact } from '@/hooks/useArtifact';
import { useMarkdownComponents } from '@/components/markdown/MarkdownRenderer';
import { useWorkspace } from './WorkspaceContext';

export function MarkdownViewer({ job }) {
  const { data: markdown, isPending } = useArtifact(job, 'markdown');
  const { setActiveHeadingId } = useWorkspace();

  // View preferences
  const [fontSize, setFontSize] = useState('text-sm');
  const [fontFamily, setFontFamily] = useState('font-sans');
  const [contentWidth, setContentWidth] = useState('max-w-4xl');

  const markdownComponents = useMarkdownComponents();

  if (!job?.artifacts?.markdown) {
    return (
      <div className="flex flex-col items-center justify-center w-full h-full text-muted-foreground p-8 text-center">
        <p className="mb-2 font-medium text-foreground">Markdown Not Available</p>
        <p className="text-sm">The backend has not returned a Markdown representation for this document.</p>
      </div>
    );
  }

  if (isPending) {
    return (
      <div className="flex items-center justify-center w-full h-full">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex w-full h-full relative overflow-hidden bg-background">
      <div className="flex-1 flex flex-col min-w-0">
        <StructuredToolbar
          markdown={markdown}
          onFontSizeChange={setFontSize}
          onFontFamilyChange={setFontFamily}
          onWidthChange={setContentWidth}
        />

        <ScrollArea className="flex-1 w-full relative" onScroll={() => {
          // Highlight active section based on scroll
          const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6'));
          for (let i = headings.length - 1; i >= 0; i--) {
            const rect = headings[i].getBoundingClientRect();
            if (rect.top <= 100) {
              setActiveHeadingId(headings[i].id);
              break;
            }
          }
        }}>
          <div className={`p-8 mx-auto ${fontSize} ${fontFamily} ${contentWidth} transition-all duration-200`}>
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              rehypePlugins={[rehypeRaw, rehypeSlug]}
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
