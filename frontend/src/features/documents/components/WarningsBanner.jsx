import { AlertTriangle } from 'lucide-react';

/** Partial-extraction warnings block (moved from the old workspace shell). */
export function WarningsBanner({ job }) {
  if (job.status !== 'partial' && (!job.warnings || job.warnings.length === 0)) return null;

  return (
    <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4 text-sm flex flex-col gap-2">
      <div className="flex items-center gap-2 text-destructive font-semibold">
        <AlertTriangle className="w-4 h-4" />
        Extraction completed with warnings.
      </div>
      <div className="text-muted-foreground space-y-1">
        {job.failedPages?.length > 0 && (
          <p><span className="font-medium text-foreground">Failed pages:</span> {job.failedPages.join(', ')}</p>
        )}
        {job.warnings?.length > 0 && (
          <ul className="list-disc pl-5 space-y-1">
            {job.warnings.map((w, i) => <li key={i}>{w}</li>)}
          </ul>
        )}
      </div>
    </div>
  );
}
