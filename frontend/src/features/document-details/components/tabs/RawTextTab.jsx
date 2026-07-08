import { useState } from 'react';

/**
 * Raw text exactly as extracted — rendered verbatim in a <pre>, no formatting.
 * Offers an all-pages view and a per-page view from pageWiseExtraction.
 */
export function RawTextTab({ extraction }) {
  const [view, setView] = useState('all');
  const pages = extraction.pageWiseExtraction ?? [];

  const text =
    view === 'all'
      ? extraction.rawText
      : (pages.find((p) => p.page === Number(view))?.text ?? '');

  return (
    <div className="flex h-full flex-col">
      {pages.length > 0 && (
        <div className="border-b px-3 py-2">
          <select
            value={view}
            onChange={(e) => setView(e.target.value)}
            className="h-8 rounded-md border bg-background px-2 text-sm"
            aria-label="Select page"
          >
            <option value="all">All pages</option>
            {pages.map((p) => (
              <option key={p.page} value={p.page}>
                Page {p.page}
              </option>
            ))}
          </select>
        </div>
      )}
      <pre className="flex-1 overflow-auto whitespace-pre-wrap p-4 font-mono text-xs leading-relaxed">
        {text || 'No text extracted.'}
      </pre>
    </div>
  );
}
