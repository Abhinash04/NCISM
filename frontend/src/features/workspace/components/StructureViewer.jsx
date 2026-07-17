import { useState, useMemo, useDeferredValue, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import rehypeSlug from 'rehype-slug';
import { DocumentOutline } from '@/features/workspace/components/DocumentOutline';
import { useArtifact } from '@/features/workspace/hooks/useArtifact';
import { useMarkdownComponents } from '@/components/markdown/MarkdownRenderer';
import { rehypeSearchHighlight } from '@/features/workspace/lib/rehypeSearchHighlight';
import { downloadBlob } from '@/lib/download';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import {
  Search, Copy, Download, File, List, ChevronUp, ChevronDown, X, Plus, Minus, Loader2,
} from 'lucide-react';

const FONT_SIZES = ['text-xs', 'text-sm', 'text-base', 'text-lg', 'text-xl'];

/**
 * Renders a job's extracted document markdown with a table of contents, in-page
 * find, font sizing, and copy / markdown / PDF export. Fed by a job DTO
 * (`{ jobId, filename, artifacts }`) — reused by the legacy Structure View page
 * and the case-detail "Extracted structure" tab.
 */
export function StructureViewer({ job }) {
  const { data: markdown, isPending } = useArtifact(job, 'markdown');
  const { data: pdfBlob } = useArtifact(job, 'pdf');
  const markdownComponents = useMarkdownComponents();

  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [matchCount, setMatchCount] = useState(0);
  const [activeMatchIndex, setActiveMatchIndex] = useState(0);
  const [fontSize, setFontSize] = useState('text-sm');
  const [showToc, setShowToc] = useState(true);
  const [activeHeadingId, setActiveHeadingId] = useState(null);

  const deferredQuery = useDeferredValue(searchQuery);
  const handleCount = useCallback((count) => queueMicrotask(() => setMatchCount(count)), []);
  const rehypePlugins = useMemo(
    () => [rehypeRaw, rehypeSlug, [rehypeSearchHighlight, { query: deferredQuery, onCount: handleCount }]],
    [deferredQuery, handleCount]
  );

  const focusMatch = (index) => {
    const marks = document.querySelectorAll('#structure-content [data-search-hit]');
    if (marks.length === 0) return;
    const target = marks[((index % marks.length) + marks.length) % marks.length];
    marks.forEach((m) => m.classList.remove('ring-2', 'ring-primary'));
    target.classList.add('ring-2', 'ring-primary');
    target.scrollIntoView({ block: 'center', behavior: 'smooth' });
  };

  const gotoMatch = (delta) => {
    if (matchCount === 0) return;
    const next = (activeMatchIndex + delta + matchCount) % matchCount;
    setActiveMatchIndex(next);
    focusMatch(next);
  };

  const handleHeadingClick = (id) => {
    setActiveHeadingId(id);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  if (isPending) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!markdown) {
    return <div className="flex items-center justify-center h-full text-muted-foreground">Markdown not available for this document.</div>;
  }

  return (
    <div className="flex flex-col h-full min-h-0 px-6 md:px-8 pb-6">
      {/* Toolbar */}
      <div className="h-11 border rounded-t-xl bg-background flex items-center justify-between px-3 gap-2 shrink-0 print-hide">
        <div className="flex items-center gap-1">
          {showSearch ? (
            <div className="flex items-center gap-1 bg-muted rounded-md px-2 py-0.5 border w-64 sm:w-80">
              <Search className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <input
                type="text"
                placeholder="Find in document..."
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setActiveMatchIndex(0); }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') gotoMatch(e.shiftKey ? -1 : 1);
                  if (e.key === 'Escape') { setShowSearch(false); setSearchQuery(''); }
                }}
                className="bg-transparent border-none text-xs outline-none w-full placeholder:text-muted-foreground"
                autoFocus
              />
              {searchQuery && (
                <span className="text-[10px] text-muted-foreground whitespace-nowrap shrink-0 tabular-nums">
                  {matchCount === 0 ? '0 / 0' : `${activeMatchIndex + 1} / ${matchCount}`}
                </span>
              )}
              <button onClick={() => gotoMatch(-1)} disabled={matchCount === 0} className="text-muted-foreground hover:text-foreground disabled:opacity-30" title="Previous match">
                <ChevronUp className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => gotoMatch(1)} disabled={matchCount === 0} className="text-muted-foreground hover:text-foreground disabled:opacity-30" title="Next match">
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => { setShowSearch(false); setSearchQuery(''); }} className="text-muted-foreground hover:text-foreground" title="Close search">
                <X className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <Button variant="ghost" size="sm" onClick={() => setShowSearch(true)} className="text-xs text-muted-foreground hover:text-foreground h-8">
              <Search className="w-3.5 h-3.5 mr-1.5" /> Find
            </Button>
          )}
        </div>

        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="w-7 h-7 text-muted-foreground hover:text-foreground" title="Decrease font size"
            disabled={FONT_SIZES.indexOf(fontSize) === 0}
            onClick={() => setFontSize(FONT_SIZES[FONT_SIZES.indexOf(fontSize) - 1])}>
            <Minus className="w-3 h-3" />
          </Button>
          <Button variant="ghost" size="icon" className="w-7 h-7 text-muted-foreground hover:text-foreground" title="Increase font size"
            disabled={FONT_SIZES.indexOf(fontSize) === FONT_SIZES.length - 1}
            onClick={() => setFontSize(FONT_SIZES[FONT_SIZES.indexOf(fontSize) + 1])}>
            <Plus className="w-3 h-3" />
          </Button>
          <div className="w-px h-4 bg-border mx-1" />
          <Button variant="ghost" size="sm" className="text-xs text-muted-foreground hover:text-foreground h-8"
            onClick={() => { navigator.clipboard.writeText(markdown); toast.success('Markdown copied'); }}>
            <Copy className="w-3.5 h-3.5 mr-1.5" /> Copy
          </Button>
          <Button variant="ghost" size="sm" className="text-xs text-muted-foreground hover:text-foreground h-8"
            onClick={() => downloadBlob(markdown, `${(job.filename || 'document').replace(/\.[^/.]+$/, '')}.md`, 'text/markdown')}>
            <Download className="w-3.5 h-3.5 mr-1.5" /> Markdown
          </Button>
          <Button variant="ghost" size="sm" className="text-xs text-muted-foreground hover:text-foreground h-8"
            disabled={!pdfBlob}
            onClick={() => downloadBlob(pdfBlob, job.filename || 'document.pdf', 'application/pdf')}>
            <File className="w-3.5 h-3.5 mr-1.5" /> PDF
          </Button>
          <div className="w-px h-4 bg-border mx-1" />
          <Button variant="ghost" size="icon"
            className={`w-7 h-7 ${showToc ? 'text-primary bg-primary/5' : 'text-muted-foreground hover:text-foreground'}`}
            title="Toggle table of contents" onClick={() => setShowToc((v) => !v)}>
            <List className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* Content + optional TOC */}
      <div className="flex-1 min-h-0 flex border border-t-0 rounded-b-xl bg-background overflow-hidden">
        <div
          className="flex-1 min-w-0 min-h-0 overflow-y-auto"
          onScroll={(e) => {
            const headings = Array.from(e.currentTarget.querySelectorAll('h1, h2, h3, h4, h5, h6'));
            for (let i = headings.length - 1; i >= 0; i--) {
              if (headings[i].getBoundingClientRect().top <= 140) {
                setActiveHeadingId(headings[i].id);
                break;
              }
            }
          }}
        >
          <div id="structure-content" className={`p-8 mx-auto max-w-4xl ${fontSize} break-words`}>
            <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={rehypePlugins} components={markdownComponents}>
              {markdown}
            </ReactMarkdown>
          </div>
        </div>

        {showToc && (
          <aside className="w-64 shrink-0 border-l bg-muted/10 overflow-y-auto hidden lg:block print-hide">
            <div className="px-3 py-2 text-[10px] font-bold text-muted-foreground uppercase tracking-wider border-b">
              Table of contents
            </div>
            <DocumentOutline markdown={markdown} onHeadingClick={handleHeadingClick} activeId={activeHeadingId} />
          </aside>
        )}
      </div>
    </div>
  );
}
