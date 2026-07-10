import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from '@/components/ui/scroll-area';
import { JsonViewer } from "./JsonViewer";
import { MarkdownViewer } from "./MarkdownViewer";
import { RawViewer } from "./RawViewer";
import { AssessmentTab } from "@/features/assessment/components/AssessmentTab";
import { FileText } from "lucide-react";

export function DynamicTabs({ job, trailing }) {
  const artifacts = job?.artifacts || {};

  // Determine default tab
  const defaultTab = artifacts.markdown ? "markdown" : artifacts.json ? "json" : "raw";

  return (
    <Tabs defaultValue={defaultTab} className="flex-1 flex flex-col w-full h-full">
      <div className="border-b border-border/60 bg-muted/10 shrink-0 px-3 pt-2 flex items-center">
        <TabsList variant="line" className="h-auto p-0 bg-transparent gap-4">
          <TabsTrigger value="json" disabled={!artifacts.json} className="px-2 py-2">
            JSON
          </TabsTrigger>
          <TabsTrigger value="markdown" disabled={!artifacts.markdown} className="px-2 py-2">
            Structured View
          </TabsTrigger>
          <TabsTrigger value="raw" className="px-2 py-2">
            Raw Response
          </TabsTrigger>
          <div className="w-px h-4 bg-border mx-2 self-center"></div>
          <TabsTrigger value="assessment" className="px-2 py-2 text-primary data-[state=active]:text-primary flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5" /> Assessment Report
          </TabsTrigger>
        </TabsList>
        {trailing && (
          <div className="ml-auto flex items-center gap-1 pb-1 shrink-0">
            {trailing}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-hidden relative">
        <TabsContent value="json" className="h-full w-full m-0 p-0 border-none outline-none absolute inset-0">
          <JsonViewer job={job} />
        </TabsContent>
        <TabsContent value="markdown" className="h-full w-full m-0 p-0 border-none outline-none absolute inset-0 flex">
          <MarkdownViewer job={job} />
        </TabsContent>

        <TabsContent value="raw" className="h-full w-full m-0 p-0 border-none outline-none absolute inset-0">
          <RawViewer job={job} />
        </TabsContent>
        
        <TabsContent value="assessment" className="h-full w-full m-0 p-0 border-none outline-none absolute inset-0 flex flex-col">
          <ScrollArea className="flex-1 min-h-0 w-full">
            <AssessmentTab job={job} />
          </ScrollArea>
        </TabsContent>
      </div>
    </Tabs>
  );
}
