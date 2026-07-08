import { ScrollArea } from "@/components/ui/scroll-area";
import { formatBytes, formatTime } from "@/utils/formatters";

export function MetadataPanel({ result, file }) {
  const meta = result?.metadata || {};

  return (
    <ScrollArea className="h-full w-full">
      <div className="p-6 space-y-8">
        <div>
          <h3 className="font-semibold mb-4 text-sm uppercase tracking-wider text-muted-foreground">
            Document Info
          </h3>
          <dl className="space-y-4 text-sm">
            <div>
              <dt className="text-muted-foreground mb-1">Filename</dt>
              <dd className="font-medium break-all">{meta.filename || file?.name}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground mb-1">File Size</dt>
              <dd className="font-medium">{formatBytes(meta.filesize || file?.size)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground mb-1">Pages</dt>
              <dd className="font-medium">{meta.pages || 'Unknown'}</dd>
            </div>
          </dl>
        </div>

        <div>
          <h3 className="font-semibold mb-4 text-sm uppercase tracking-wider text-muted-foreground">
            Processing Stats
          </h3>
          <dl className="space-y-4 text-sm">
            <div>
              <dt className="text-muted-foreground mb-1">Processing Time</dt>
              <dd className="font-medium text-green-600 dark:text-green-400">
                {formatTime(meta.processingTime)}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground mb-1">Backend Version</dt>
              <dd className="font-medium">{meta.version || '1.0.0'}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground mb-1">Extraction Status</dt>
              <dd className="font-medium text-green-600 dark:text-green-400">
                {result?.success ? 'Success' : 'Failed'}
              </dd>
            </div>
          </dl>
        </div>
      </div>
    </ScrollArea>
  );
}
