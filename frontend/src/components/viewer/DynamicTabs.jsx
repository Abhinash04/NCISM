import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { JsonViewer } from "./JsonViewer";
import { MarkdownViewer } from "./MarkdownViewer";
import { HtmlViewer } from "./HtmlViewer";
import { RawViewer } from "./RawViewer";

export function DynamicTabs({ result }) {
  const { document, capabilities } = result;

  // Determine default tab
  const defaultTab = capabilities.markdown ? "markdown" : capabilities.json ? "json" : "raw";

  return (
    <Tabs defaultValue={defaultTab} className="flex-1 flex flex-col w-full h-full">
      <div className="px-4 pt-2 border-b bg-muted/10 shrink-0">
        <TabsList className="bg-transparent space-x-2 h-auto p-0">
          <TabsTrigger 
            value="json" 
            disabled={!capabilities.json}
            className="data-[state=active]:bg-background data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none rounded-none border-b-2 border-transparent px-4 py-2"
          >
            JSON
          </TabsTrigger>
          <TabsTrigger 
            value="markdown" 
            disabled={!capabilities.markdown}
            className="data-[state=active]:bg-background data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none rounded-none border-b-2 border-transparent px-4 py-2"
          >
            Markdown
          </TabsTrigger>
          <TabsTrigger 
            value="html" 
            disabled={!capabilities.html}
            className="data-[state=active]:bg-background data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none rounded-none border-b-2 border-transparent px-4 py-2"
          >
            HTML
          </TabsTrigger>
          <TabsTrigger 
            value="raw" 
            className="data-[state=active]:bg-background data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none rounded-none border-b-2 border-transparent px-4 py-2"
          >
            Raw Response
          </TabsTrigger>
        </TabsList>
      </div>

      <div className="flex-1 overflow-hidden relative">
        <TabsContent value="json" className="h-full w-full m-0 p-0 border-none outline-none absolute inset-0">
          <JsonViewer data={document.json} />
        </TabsContent>
        <TabsContent value="markdown" className="h-full w-full m-0 p-0 border-none outline-none absolute inset-0">
          <MarkdownViewer data={document.markdown} />
        </TabsContent>
        <TabsContent value="html" className="h-full w-full m-0 p-0 border-none outline-none absolute inset-0">
          <HtmlViewer data={document.html} />
        </TabsContent>
        <TabsContent value="raw" className="h-full w-full m-0 p-0 border-none outline-none absolute inset-0">
          <RawViewer data={document.raw} />
        </TabsContent>
      </div>
    </Tabs>
  );
}
