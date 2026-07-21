import { DocumentPageLayout } from '@/features/documents/components/DocumentPageLayout';
import { StructureViewer } from '@/features/workspace/components/StructureViewer';

export function StructurePage() {
  return (
    <DocumentPageLayout title="Structure View">
      {(job) => <StructureViewer job={job} />}
    </DocumentPageLayout>
  );
}
