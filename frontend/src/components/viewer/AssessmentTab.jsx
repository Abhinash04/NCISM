import { useState, useMemo } from 'react';
import axios from 'axios';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FileText, Loader2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import rehypeSlug from 'rehype-slug';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

export function AssessmentTab({ job }) {
  const [assessmentReport, setAssessmentReport] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState(null);

  const generateReport = async () => {
    if (!job?.jobId) return;
    setIsGenerating(true);
    setError(null);
    try {
      const res = await axios.post('http://localhost:3000/api/v1/assessment/generate', { jobId: job.jobId });
      if (res.data?.reportContent) {
        setAssessmentReport(res.data.reportContent);
      }
    } catch (e) {
      console.error('Failed to generate report', e);
      setError('Failed to generate assessment report. Please ensure extraction completed successfully.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Memoize markdown components to avoid re-rendering performance hits on huge documents
  const markdownComponents = useMemo(() => ({
    // Headings
    h1: ({ node, ...props }) => {
      void node;
      // Detect if this is a major section like "# 1. Student Admission..."
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
    
    // Typography
    p: ({ node, ...props }) => { void node; return <p className="leading-relaxed mb-4 text-muted-foreground" {...props} />; },
    blockquote: ({ node, ...props }) => {
      void node;
      return (
        <blockquote className="border-l-4 border-primary pl-4 py-1 my-4 bg-muted/30 italic text-muted-foreground rounded-r-md" {...props} />
      );
    },
    ul: ({ node, ...props }) => { void node; return <ul className="list-disc pl-6 mb-4 space-y-1 text-muted-foreground" {...props} />; },
    ol: ({ node, ...props }) => { void node; return <ol className="list-decimal pl-6 mb-4 space-y-1 text-muted-foreground" {...props} />; },
    
    // Tables
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
    
    // Media
    img: ({ node, ...props }) => {
      void node;
      return (
        <div className="my-6 flex justify-center">
          <img className="max-w-full rounded-lg shadow-md border" loading="lazy" {...props} alt={props.alt || 'Report image'} />
        </div>
      );
    },
    
    // Code
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
    pre: ({ node, ...props }) => { void node; return <pre className="p-0 m-0 bg-transparent" {...props} />; } // The SyntaxHighlighter handles the pre tag style
  }), []);

  return (
    <div className="flex flex-col h-full w-full bg-background p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Assessment Report</h2>
          <p className="text-muted-foreground mt-1">
            Generate the official NCISM Assessment Report based on the extracted data from this document.
          </p>
        </div>
        <button
          onClick={generateReport}
          disabled={isGenerating}
          className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <FileText className="w-4 h-4" />
              Generate Report
            </>
          )}
        </button>
      </div>

      {error && (
        <div className="bg-destructive/10 text-destructive p-4 rounded-md mb-6">
          {error}
        </div>
      )}

      {assessmentReport ? (
        <div className="flex-1 border rounded-md overflow-hidden bg-background">
          <ScrollArea className="h-full w-full">
            <div className="max-w-5xl mx-auto px-4 py-12">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[
                  rehypeRaw, 
                  rehypeSlug,
                  [rehypeAutolinkHeadings, { behavior: 'wrap' }]
                ]}
                components={markdownComponents}
              >
                {assessmentReport}
              </ReactMarkdown>
            </div>
          </ScrollArea>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground border border-dashed rounded-md bg-muted/5">
          <FileText className="w-12 h-12 mb-4 opacity-20" />
          <p>Click "Generate Report" to evaluate the extracted data.</p>
        </div>
      )}
    </div>
  );
}
