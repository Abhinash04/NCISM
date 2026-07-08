import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { DOCUMENT_STATUS } from '@/db/db';

const STATUS_CONFIG = {
  [DOCUMENT_STATUS.UPLOADED]: {
    label: 'Uploaded',
    className: 'bg-slate-100 text-slate-700 border-slate-200',
  },
  [DOCUMENT_STATUS.PROCESSING]: {
    label: 'Processing…',
    className: 'bg-blue-100 text-blue-700 border-blue-200 animate-pulse',
  },
  [DOCUMENT_STATUS.PROCESSED]: {
    label: 'Processed',
    className: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  },
  [DOCUMENT_STATUS.FAILED]: {
    label: 'Failed',
    className: 'bg-red-100 text-red-700 border-red-200',
  },
  [DOCUMENT_STATUS.REQUIRES_OCR]: {
    label: 'Requires OCR',
    className: 'bg-amber-100 text-amber-700 border-amber-200',
  },
};

export function StatusBadge({ status }) {
  const config = STATUS_CONFIG[status] ?? { label: status, className: '' };
  return (
    <Badge variant="outline" className={cn('font-medium', config.className)}>
      {config.label}
    </Badge>
  );
}
