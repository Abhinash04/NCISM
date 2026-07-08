import { formatDate, formatDuration } from '@/lib/format';

const PDF_TYPE_LABELS = {
  digital: 'Digital PDF',
  scanned: 'Scanned PDF',
  mixed: 'Mixed (digital + scanned pages)',
  docx: 'Word document (DOCX)',
  xlsx: 'Excel workbook (XLSX)',
};

const STRUCTURED_BY_LABELS = {
  structurer: 'Hybrid structurer (pdfplumber tables + headings)',
  markitdown: 'MarkItDown',
};

/**
 * Extraction/OCR metadata panel. OCR engines are not implemented in
 * Phase 1 — this panel renders from extraction.metadata so future
 * engines extend it by adding fields, not by rewriting the UI.
 */
export function OcrMetadataTab({ extraction }) {
  const metadata = extraction.metadata ?? {};

  const rows = [
    ['Extraction Method', metadata.extractionMethod ?? '—'],
    ['PDF Type', PDF_TYPE_LABELS[metadata.pdfType] ?? metadata.pdfType ?? '—'],
    ['Pages', metadata.pages ?? '—'],
    ['Processing Time', formatDuration(extraction.processingTime)],
    ['Characters', metadata.characters?.toLocaleString() ?? '—'],
    ['Words', metadata.words?.toLocaleString() ?? '—'],
    ['Language', metadata.language ?? '—'],
    ['Extraction Status', extraction.status ?? '—'],
    ['Generated At', formatDate(extraction.generatedAt)],
  ];
  if (metadata.structuredBy) {
    rows.splice(1, 0, [
      'Structured By',
      STRUCTURED_BY_LABELS[metadata.structuredBy] ?? metadata.structuredBy,
    ]);
  }

  const stageTimings = metadata.stageTimings ?? null;
  const engines = metadata.engines ?? null;
  const validation = metadata.validation ?? null;

  return (
    <div className="h-full space-y-6 overflow-auto p-4">
      <dl className="divide-y rounded-md border bg-card">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-center justify-between gap-4 px-3 py-2.5">
            <dt className="text-sm text-muted-foreground">{label}</dt>
            <dd className="text-sm font-medium">{value}</dd>
          </div>
        ))}
      </dl>

      {extraction.error && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {extraction.error}
        </div>
      )}

      {validation && (
        <section>
          <h3 className="mb-2 text-sm font-medium text-muted-foreground">
            Structured-markdown validation
          </h3>
          <p className="text-sm">
            <span className="text-muted-foreground">Chosen: </span>
            <span className="font-medium">{validation.chosen}</span>
            {validation.reason ? (
              <span className="text-muted-foreground"> — {validation.reason}</span>
            ) : null}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Full per-candidate comparison is in the Pipeline tab.
          </p>
        </section>
      )}

      {stageTimings && (
        <section>
          <h3 className="mb-2 text-sm font-medium text-muted-foreground">
            Pipeline stage timings
          </h3>
          <dl className="divide-y rounded-md border bg-card">
            {Object.entries(stageTimings).map(([stage, ms]) => (
              <div key={stage} className="flex items-center justify-between gap-4 px-3 py-2">
                <dt className="text-sm capitalize text-muted-foreground">{stage}</dt>
                <dd className="text-sm font-medium">{formatDuration(ms)}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      {engines && (
        <section>
          <h3 className="mb-2 text-sm font-medium text-muted-foreground">
            Extraction engines
          </h3>
          <dl className="divide-y rounded-md border bg-card">
            {Object.entries(engines).map(([engine, version]) => (
              <div key={engine} className="flex items-center justify-between gap-4 px-3 py-2">
                <dt className="text-sm text-muted-foreground">{engine}</dt>
                <dd className="font-mono text-sm">{version}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}
    </div>
  );
}
