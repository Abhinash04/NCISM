import { useNavigate } from 'react-router-dom';
import { FileText, Inbox } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { formatBytes, formatDate } from '@/lib/format';
import { StatusBadge } from '@/features/upload/components/StatusBadge';

export function DocumentList({ documents }) {
  const navigate = useNavigate();

  if (documents === undefined) {
    return (
      <div className="space-y-2">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  if (!documents.length) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed py-12 text-muted-foreground">
        <Inbox className="size-8" />
        <p className="text-sm">No documents uploaded yet</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Document</TableHead>
            <TableHead className="w-24 text-right">Size</TableHead>
            <TableHead className="w-20 text-right">Pages</TableHead>
            <TableHead className="w-36">Status</TableHead>
            <TableHead className="w-44">Uploaded</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {documents.map((doc) => (
            <TableRow
              key={doc.id}
              className="cursor-pointer"
              onClick={() => navigate(`/documents/${doc.id}`)}
            >
              <TableCell>
                <div className="flex items-center gap-2 font-medium">
                  <FileText className="size-4 shrink-0 text-muted-foreground" />
                  <span className="truncate">{doc.filename}</span>
                  <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-semibold uppercase text-muted-foreground">
                    {doc.type ?? 'pdf'}
                  </span>
                </div>
              </TableCell>
              <TableCell className="text-right text-muted-foreground">
                {formatBytes(doc.size)}
              </TableCell>
              <TableCell className="text-right text-muted-foreground">
                {doc.pages ?? '—'}
              </TableCell>
              <TableCell>
                <StatusBadge status={doc.status} />
              </TableCell>
              <TableCell className="text-muted-foreground">
                {formatDate(doc.uploadedAt)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
