import { FileText, CircleCheck, CircleX } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

export function UploadQueue({ queue }) {
  if (!queue.length) return null;

  return (
    <div className="space-y-2">
      {queue.map((item) => (
        <div
          key={item.id}
          className="flex items-center gap-3 rounded-lg border bg-card px-4 py-3"
        >
          <FileText className="size-4 shrink-0 text-muted-foreground" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <p className="truncate text-sm font-medium">{item.filename}</p>
              {item.status === 'done' && (
                <CircleCheck className="size-4 shrink-0 text-emerald-500" />
              )}
              {item.status === 'error' && (
                <CircleX className="size-4 shrink-0 text-red-500" />
              )}
            </div>
            {item.status === 'uploading' && (
              <Progress value={item.progress} className="mt-1.5 h-1.5" />
            )}
            {item.status === 'error' && (
              <p className="mt-0.5 text-xs text-red-600">{item.error}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
