import { DocumentPageLayout } from '@/features/documents/components/DocumentPageLayout';
import { JsonViewer } from '@/features/workspace/components/JsonViewer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatBytes } from '@/lib/format';
import { format } from 'date-fns';

export function MetadataPage() {
  return (
    <DocumentPageLayout title="Metadata">
      {(job) => (
        <div className="flex flex-col h-full min-h-0 px-6 md:px-8 pb-6 gap-4">
          <Card className="shadow-sm shrink-0">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium font-sans">File</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <div className="text-xs text-muted-foreground">Filename</div>
                <div className="font-medium truncate" title={job.filename}>{job.filename}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Size</div>
                <div className="font-medium">{formatBytes(job.filesize)}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Pages</div>
                <div className="font-medium">{job.pageCount || '—'}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Uploaded</div>
                <div className="font-medium">
                  {job.createdAt ? format(new Date(job.createdAt), 'MMM d, yyyy h:mm a') : '—'}
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex-1 min-h-0 border rounded-xl overflow-hidden bg-background flex flex-col">
            <div className="px-4 py-2 border-b text-[10px] font-bold text-muted-foreground uppercase tracking-wider shrink-0">
              Element JSON (extraction engine output)
            </div>
            <div className="flex-1 min-h-0 flex flex-col">
              <JsonViewer job={job} />
            </div>
          </div>
        </div>
      )}
    </DocumentPageLayout>
  );
}
