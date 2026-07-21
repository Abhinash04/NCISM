import { useState } from 'react';
import { Upload, CheckCircle2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useImportInstitutions } from '@/features/institutions/hooks';

export function InstitutionImport() {
  const [file, setFile] = useState(null);
  const { mutate, data: result, isPending, isError, error, reset } = useImportInstitutions();

  const onSubmit = (e) => {
    e.preventDefault();
    if (file) mutate(file);
  };

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Import institutions</h1>
        <p className="text-muted-foreground mt-1">
          Upload the master-data markdown (or CSV) table. Existing institutes are updated by ID; the
          import is safe to re-run.
        </p>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Upload file</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <input
              type="file"
              accept=".md,.markdown,.csv,.txt"
              onChange={(e) => { setFile(e.target.files?.[0] || null); reset(); }}
              className="block w-full text-sm file:mr-4 file:rounded-md file:border-0 file:bg-primary file:px-4 file:py-2 file:text-primary-foreground hover:file:bg-primary/90"
            />
            <Button type="submit" disabled={!file || isPending}>
              <Upload className="h-4 w-4 mr-1" />
              {isPending ? 'Importing…' : 'Import'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {isError && (
        <p className="text-sm text-destructive">
          {error?.response?.data?.error?.message || 'Import failed.'}
        </p>
      )}

      {result && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-500" /> Import complete
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="rounded-lg border p-3">
                <p className="text-2xl font-bold">{result.parsed}</p>
                <p className="text-xs text-muted-foreground">Parsed</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-2xl font-bold text-emerald-500">{result.inserted}</p>
                <p className="text-xs text-muted-foreground">Inserted</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-2xl font-bold text-amber-500">{result.updated}</p>
                <p className="text-xs text-muted-foreground">Updated</p>
              </div>
            </div>

            {result.exceptions?.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium flex items-center gap-2 text-amber-600">
                  <AlertTriangle className="h-4 w-4" />
                  {result.exceptions.length} row(s) skipped
                </p>
                <div className="max-h-64 overflow-auto rounded-lg border">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-muted/50 text-muted-foreground">
                      <tr><th className="px-3 py-2">Line</th><th className="px-3 py-2">Reason</th><th className="px-3 py-2">Row</th></tr>
                    </thead>
                    <tbody>
                      {result.exceptions.map((ex, i) => (
                        <tr key={i} className="border-t">
                          <td className="px-3 py-2">{ex.line}</td>
                          <td className="px-3 py-2 text-amber-600">{ex.reason}</td>
                          <td className="px-3 py-2 font-mono truncate max-w-[300px]" title={ex.raw}>{ex.raw}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
