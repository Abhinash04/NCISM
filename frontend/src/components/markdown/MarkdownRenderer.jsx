import { useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import rehypeSlug from 'rehype-slug';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

/**
 * THE one markdown render map for the app (extracted documents, assessment
 * reports). Previously copy-pasted between MarkdownViewer and AssessmentTab.
 */
export function useMarkdownComponents() {
  return useMemo(() => ({
    h1: ({ node, ...props }) => {
      void node;
      const isMajorSection = props.children && typeof props.children[0] === 'string' && /^\d+\./.test(props.children[0]);
      if (isMajorSection) {
        return (
          <div className="mt-12 mb-6 border bg-card rounded-xl shadow-sm p-6 sm:p-8">
            <h1 className="text-2xl font-bold border-b pb-4 mb-6 text-foreground" {...props} />
          </div>
        );
      }
      return <h1 className="text-2xl font-bold mt-8 mb-4 text-foreground" {...props} />;
    },
    h2: ({ node, ...props }) => { void node; return <h2 className="text-xl font-semibold mt-8 mb-4 text-foreground border-b pb-2" {...props} />; },
    h3: ({ node, ...props }) => { void node; return <h3 className="text-lg font-medium mt-6 mb-3 text-foreground" {...props} />; },
    h4: ({ node, ...props }) => { void node; return <h4 className="text-base font-medium mt-6 mb-2 text-foreground" {...props} />; },

    p: ({ node, ...props }) => { void node; return <p className="leading-relaxed mb-4 text-muted-foreground" {...props} />; },
    blockquote: ({ node, ...props }) => {
      void node;
      return (
        <blockquote className="border-l-4 border-primary pl-4 py-1 my-4 bg-muted/30 italic text-muted-foreground rounded-r-md" {...props} />
      );
    },
    ul: ({ node, ...props }) => { void node; return <ul className="list-disc pl-6 mb-4 space-y-1 text-muted-foreground" {...props} />; },
    ol: ({ node, ...props }) => { void node; return <ol className="list-decimal pl-6 mb-4 space-y-1 text-muted-foreground" {...props} />; },

    table: ({ node, ...props }) => {
      void node;
      return (
        <div className="w-full overflow-x-auto rounded-xl border border-border shadow-sm my-6 bg-card">
          <table className="w-full text-left border-collapse text-sm" {...props} />
        </div>
      );
    },
    thead: ({ node, ...props }) => { void node; return <thead className="bg-muted/50 sticky top-0 z-10" {...props} />; },
    tbody: ({ node, ...props }) => { void node; return <tbody className="divide-y divide-border" {...props} />; },
    tr: ({ node, ...props }) => { void node; return <tr className="hover:bg-muted/30 transition-colors" {...props} />; },
    th: ({ node, ...props }) => { void node; return <th className="p-3 font-semibold text-foreground align-middle" {...props} />; },
    td: ({ node, ...props }) => { void node; return <td className="p-3 text-muted-foreground align-top" {...props} />; },

    img: ({ node, ...props }) => {
      void node;
      return (
        <div className="my-6 flex justify-center">
          <img className="max-w-full rounded-lg shadow-md border" loading="lazy" {...props} alt={props.alt || 'Report image'} />
        </div>
      );
    },

    code({ inline, className, children, ...props }) {
      const match = /language-(\w+)/.exec(className || '');
      return !inline && match ? (
        <SyntaxHighlighter
          style={vscDarkPlus}
          language={match[1]}
          PreTag="div"
          className="rounded-xl shadow-sm my-6 text-sm"
          {...props}
        >
          {String(children).replace(/\n$/, '')}
        </SyntaxHighlighter>
      ) : (
        <code className="bg-muted px-1.5 py-0.5 rounded-md font-mono text-sm text-foreground" {...props}>
          {children}
        </code>
      );
    },
    pre: ({ node, ...props }) => { void node; return <pre className="p-0 m-0 bg-transparent" {...props} />; },
  }), []);
}

export function MarkdownRenderer({ markdown }) {
  const components = useMarkdownComponents();
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[rehypeRaw, rehypeSlug]}
      components={components}
    >
      {markdown}
    </ReactMarkdown>
  );
}
