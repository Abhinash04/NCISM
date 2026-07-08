import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDuration } from '@/lib/format';

/**
 * Pipeline / Artifacts inspector.
 *
 * Renders every preserved pipeline-stage output in order — no intermediate
 * result is overwritten, so the full extraction history is inspectable:
 * classification, pdfplumber, pymupdf, normalized, merged, markitdown,
 * structurer, opendataloader (markdown + element JSON) and the final
 * validated structured markdown.
 */
const STAGE_LABELS = {
  classification: 'Classification',
  pdfplumber: 'PDFPlumber Extraction',
  pymupdf: 'PyMuPDF Extraction',
  normalized: 'Normalization',
  merged: 'Merge',
  markitdown: 'MarkItDown',
  structurer: 'Structurer',
  opendataloader: 'OpenDataLoader-PDF',
  final: 'Final Structured Markdown',
};

const STATUS_STYLES = {
  produced: 'bg-green-100 text-green-700 border-green-200',
  skipped: 'bg-muted text-muted-foreground border-border',
  failed: 'bg-red-100 text-red-700 border-red-200',
};

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
  code: (props) => (
    <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs" {...props} />
  ),
};

function StatusPill({ status }) {
  return (
    <span
      className={cn(
        'rounded-full border px-2 py-0.5 text-[11px] font-medium capitalize',
        STATUS_STYLES[status] ?? STATUS_STYLES.skipped,
      )}
    >
      {status}
    </span>
  );
}

function MarkdownArtifact({ content }) {
  const [view, setView] = useState('rendered');
  if (!content) {
    return <p className="text-sm text-muted-foreground">No markdown produced.</p>;
  }
  return (
    <div>
      <div className="mb-2 flex items-center gap-1">
        <button
          type="button"
          onClick={() => setView('rendered')}
          className={cn(
            'rounded px-2 py-0.5 text-xs',
            view === 'rendered' ? 'bg-accent text-accent-foreground' : 'text-muted-foreground',
          )}
        >
          Rendered
        </button>
        <button
          type="button"
          onClick={() => setView('source')}
          className={cn(
            'rounded px-2 py-0.5 text-xs',
            view === 'source' ? 'bg-accent text-accent-foreground' : 'text-muted-foreground',
          )}
        >
          Source
        </button>
      </div>
      {view === 'rendered' ? (
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          rehypePlugins={[rehypeRaw]}
          components={markdownComponents}
        >
          {content}
        </ReactMarkdown>
      ) : (
        <pre className="max-h-112 overflow-auto whitespace-pre-wrap rounded-md border bg-muted/40 p-3 font-mono text-xs leading-relaxed">
          {content}
        </pre>
      )}
    </div>
  );
}

function KeyValueBlock({ data }) {
  return (
    <dl className="divide-y rounded-md border bg-card">
      {Object.entries(data).map(([key, value]) => (
        <div key={key} className="flex items-center justify-between gap-4 px-3 py-2">
          <dt className="text-sm text-muted-foreground">{key}</dt>
          <dd className="text-sm font-medium">{String(value)}</dd>
        </div>
      ))}
    </dl>
  );
}

function ValidationReport({ report }) {
  if (!report?.candidates) return null;
  return (
    <div className="mt-4">
      <p className="mb-2 text-sm">
        <span className="text-muted-foreground">Chosen engine: </span>
        <span className="font-medium">{report.chosen}</span>
        {report.reason ? (
          <span className="text-muted-foreground"> — {report.reason}</span>
        ) : null}
      </p>
      <div className="overflow-x-auto rounded-md border">
        <table className="w-full border-collapse text-xs">
          <thead className="bg-muted">
            <tr>
              {['Engine', 'Chars', 'Headings', 'Tables', 'Valid', 'Chosen', 'Reason'].map((h) => (
                <th key={h} className="border-b px-2 py-1.5 text-left font-semibold">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {report.candidates.map((c) => (
              <tr key={c.engine} className={c.chosen ? 'bg-green-50' : undefined}>
                <td className="border-b px-2 py-1.5 font-medium">{c.engine}</td>
                <td className="border-b px-2 py-1.5">{c.characters?.toLocaleString()}</td>
                <td className="border-b px-2 py-1.5">{c.headings}</td>
                <td className="border-b px-2 py-1.5">{c.tables}</td>
                <td className="border-b px-2 py-1.5">{c.valid ? 'yes' : 'no'}</td>
                <td className="border-b px-2 py-1.5">{c.chosen ? 'yes' : ''}</td>
                <td className="border-b px-2 py-1.5 text-muted-foreground">{c.reason}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ElementJson({ data }) {
  const [open, setOpen] = useState(false);
  const count = Array.isArray(data?.kids) ? data.kids.length : null;
  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
      >
        {open ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
        OpenDataLoader element JSON (bounding boxes + semantic types
        {count != null ? `, ${count} top-level nodes` : ''})
      </button>
      {open && (
        <pre className="mt-2 max-h-112 overflow-auto whitespace-pre-wrap rounded-md border bg-muted/40 p-3 font-mono text-[11px] leading-relaxed">
          {JSON.stringify(data, null, 2)}
        </pre>
      )}
    </div>
  );
}

function ArtifactBody({ artifact }) {
  if (artifact.error && artifact.status === 'failed') {
    return (
      <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
        {artifact.error}
      </div>
    );
  }

  if (artifact.format === 'classification' && artifact.data) {
    return <KeyValueBlock data={artifact.data} />;
  }

  if (artifact.format === 'markdown') {
    return (
      <div>
        <MarkdownArtifact content={artifact.content} />
        {artifact.stage === 'final' && <ValidationReport report={artifact.data} />}
        {artifact.stage === 'opendataloader' && artifact.data && (
          <ElementJson data={artifact.data} />
        )}
      </div>
    );
  }

  // text (and any other content-bearing) artifacts render verbatim.
  return (
    <pre className="max-h-112 overflow-auto whitespace-pre-wrap rounded-md border bg-muted/40 p-3 font-mono text-xs leading-relaxed">
      {artifact.content || 'No content produced.'}
    </pre>
  );
}

function ArtifactCard({ artifact, index, defaultOpen }) {
  const [open, setOpen] = useState(defaultOpen);
  const metrics = [];
  if (artifact.charCount != null) metrics.push(`${artifact.charCount.toLocaleString()} chars`);
  if (artifact.tableCount != null) metrics.push(`${artifact.tableCount} tables`);
  if (artifact.timingMs != null) metrics.push(formatDuration(artifact.timingMs));

  return (
    <div className="rounded-md border bg-card">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-3 px-3 py-2.5 text-left"
      >
        {open ? (
          <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
        )}
        <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-muted text-[11px] font-medium text-muted-foreground">
          {index + 1}
        </span>
        <span className="text-sm font-medium">
          {STAGE_LABELS[artifact.stage] ?? artifact.stage}
        </span>
        {artifact.engine && (
          <span className="font-mono text-[11px] text-muted-foreground">{artifact.engine}</span>
        )}
        <div className="ml-auto flex items-center gap-3">
          {metrics.length > 0 && (
            <span className="hidden text-xs text-muted-foreground sm:inline">
              {metrics.join(' · ')}
            </span>
          )}
          <StatusPill status={artifact.status} />
        </div>
      </button>
      {open && (
        <div className="border-t px-3 py-3">
          <ArtifactBody artifact={artifact} />
        </div>
      )}
    </div>
  );
}

export function PipelineArtifactsTab({ extraction }) {
  const artifacts = extraction.artifacts ?? [];

  if (artifacts.length === 0) {
    return (
      <p className="p-4 text-sm text-muted-foreground">
        No pipeline artifacts recorded. Re-process this document to capture the
        per-stage outputs.
      </p>
    );
  }

  return (
    <div className="h-full space-y-2 overflow-auto p-3">
      {artifacts.map((artifact, index) => (
        <ArtifactCard
          key={`${artifact.stage}-${index}`}
          artifact={artifact}
          index={index}
          defaultOpen={artifact.stage === 'final'}
        />
      ))}
    </div>
  );
}
