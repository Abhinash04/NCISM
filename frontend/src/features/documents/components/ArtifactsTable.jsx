import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db/db';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  FileText, FileCode, FileJson, Workflow, ClipboardList, File, ArrowRight,
} from 'lucide-react';

/**
 * Details-page artifact table. Availability = artifact URL on the job DTO
 * (server copy) OR a locally persisted Dexie copy (survives the backend's
 * retention purge).
 */
export function ArtifactsTable({ job }) {
  const navigate = useNavigate();

  const localTypes = useLiveQuery(
    async () => new Set((await db.artifacts.where('documentId').equals(job.jobId).toArray()).map((a) => a.type)),
    [job.jobId],
    new Set()
  );
  const assessmentCount = useLiveQuery(
    () => db.assessments.where('documentId').equals(job.jobId).count(),
    [job.jobId],
    0
  );

  const has = (type) => Boolean(job.artifacts?.[type]) || localTypes.has(type);
  const reportGenerated = has('report') || assessmentCount > 0;

  const rows = [
    { icon: File, name: 'Original PDF', description: 'The uploaded document', available: has('pdf'), path: 'pdf' },
    { icon: FileText, name: 'Extracted Text', description: 'Raw extracted markdown source', available: has('markdown'), path: 'text' },
    { icon: FileCode, name: 'Structure View', description: 'Rendered document with search and outline', available: has('markdown'), path: 'structure' },
    { icon: FileJson, name: 'Metadata', description: 'Element JSON produced by the extraction engine', available: has('json'), path: 'metadata' },
    { icon: Workflow, name: 'Pipeline', description: 'Processing stages, statistics and downloads', available: true, path: 'pipeline' },
    {
      icon: ClipboardList, name: 'Assessment Report', description: 'Deterministic MARB-format compliance assessment',
      available: has('markdown'), path: 'report',
      status: reportGenerated ? 'Generated' : 'Not generated',
      action: reportGenerated ? 'Open' : 'Generate',
    },
  ];

  return (
    <div className="bg-background rounded-xl border shadow-sm overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead>Artifact</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.path}>
              <TableCell>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-md text-primary shrink-0">
                    <row.icon className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="font-medium">{row.name}</div>
                    <div className="text-xs text-muted-foreground">{row.description}</div>
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <Badge
                  variant="outline"
                  className={
                    row.status === 'Not generated'
                      ? 'bg-amber-500/10 text-amber-600 border-amber-200'
                      : row.available
                        ? 'bg-emerald-500/10 text-emerald-600 border-emerald-200'
                        : 'bg-muted text-muted-foreground'
                  }
                >
                  {row.status ?? (row.available ? 'Available' : 'Unavailable')}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!row.available}
                  onClick={() => navigate(`/documents/${job.jobId}/${row.path}`)}
                >
                  {row.action ?? 'Open'} <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
