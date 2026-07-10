import { Link, useParams } from 'react-router-dom';
import {
  Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink,
  BreadcrumbPage, BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Skeleton } from '@/components/ui/skeleton';
import { useJob } from '@/features/workspace/hooks/useJob';
import { FileQuestion } from 'lucide-react';

/**
 * Shared shell for every document page: resolves the job by route param,
 * renders breadcrumb + title + actions, and hands the job DTO to children
 * via render prop. `title=null` (Details page) renders the breadcrumb only.
 */
export function DocumentPageLayout({ title, actions, children }) {
  const { documentId } = useParams();
  const { data: job, isPending, isError } = useJob(documentId);

  if (isPending) {
    return (
      <div className="p-6 md:p-8 space-y-6 max-w-6xl mx-auto">
        <Skeleton className="h-4 w-72" />
        <Skeleton className="h-8 w-96" />
        <div className="space-y-3 pt-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-4" style={{ width: `${90 - (i % 4) * 15}%` }} />
          ))}
        </div>
      </div>
    );
  }

  if (isError || !job) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center space-y-4">
        <FileQuestion className="w-12 h-12 text-muted-foreground opacity-40" />
        <h2 className="text-xl font-semibold">Document not found</h2>
        <p className="text-muted-foreground max-w-md">
          The document does not exist locally and the server copy may have expired.
        </p>
        <Link to="/documents" className="text-primary underline underline-offset-4">
          Back to Documents
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="px-6 md:px-8 pt-6 space-y-3 shrink-0 print-hide">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to="/documents">Documents</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            {title ? (
              <>
                <BreadcrumbItem>
                  <BreadcrumbLink asChild>
                    <Link to={`/documents/${job.jobId}`} className="max-w-[280px] truncate inline-block align-bottom">
                      {job.filename}
                    </Link>
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>{title}</BreadcrumbPage>
                </BreadcrumbItem>
              </>
            ) : (
              <BreadcrumbItem>
                <BreadcrumbPage className="max-w-[320px] truncate">{job.filename}</BreadcrumbPage>
              </BreadcrumbItem>
            )}
          </BreadcrumbList>
        </Breadcrumb>

        <div className="flex items-center justify-between gap-4">
          <h1 className="text-2xl font-bold tracking-tight truncate">
            {title || job.filename}
          </h1>
          {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
        </div>
      </div>

      {/* Pages own their scrolling inside this bounded box */}
      <div className="flex-1 min-h-0 overflow-hidden pt-4">
        {typeof children === 'function' ? children(job) : children}
      </div>
    </div>
  );
}
