import { FileScan, Loader2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DOCUMENT_STATUS } from '@/db/db';
import { RawTextTab } from '@/features/document-details/components/tabs/RawTextTab';
import { StructureViewTab } from '@/features/document-details/components/tabs/StructureViewTab';
import { OcrMetadataTab } from '@/features/document-details/components/tabs/OcrMetadataTab';
import { PipelineArtifactsTab } from '@/features/document-details/components/tabs/PipelineArtifactsTab';

function EmptyState({ document: doc }) {
  if (doc.status === DOCUMENT_STATUS.PROCESSING) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 text-muted-foreground">
        <Loader2 className="size-7 animate-spin" />
        <p className="text-sm">Running the extraction pipeline…</p>
      </div>
    );
  }
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center text-muted-foreground">
      <FileScan className="size-8" />
      <p className="text-sm">
        Not processed yet — click <span className="font-medium">Process document</span>{' '}
        to run extraction.
      </p>
    </div>
  );
}

export function ExtractionTabs({ document: doc, extraction }) {
  // While a re-process is running, keep showing the previous result.
  const showEmpty =
    !extraction || (doc.status === DOCUMENT_STATUS.PROCESSING && !extraction.rawText);

  if (showEmpty) {
    return <EmptyState document={doc} />;
  }

  return (
    <Tabs defaultValue="text" className="flex h-full flex-col gap-0">
      <TabsList className="m-2 grid w-auto grid-cols-4">
        <TabsTrigger value="text">Extracted Text</TabsTrigger>
        <TabsTrigger value="structure">Structure View</TabsTrigger>
        <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
        <TabsTrigger value="metadata">OCR Metadata</TabsTrigger>
      </TabsList>
      <TabsContent value="text" className="min-h-0 flex-1">
        <RawTextTab extraction={extraction} />
      </TabsContent>
      <TabsContent value="structure" className="min-h-0 flex-1">
        <StructureViewTab extraction={extraction} />
      </TabsContent>
      <TabsContent value="pipeline" className="min-h-0 flex-1">
        <PipelineArtifactsTab extraction={extraction} />
      </TabsContent>
      <TabsContent value="metadata" className="min-h-0 flex-1">
        <OcrMetadataTab extraction={extraction} />
      </TabsContent>
    </Tabs>
  );
}
