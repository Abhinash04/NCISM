import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { PdfViewer } from './PdfViewer';
import { DynamicTabs } from './DynamicTabs';
import { Inspector } from './Inspector';
import { FileText } from 'lucide-react';
import { motion } from 'framer-motion';

export function SplitScreenViewer({ job }) {
  if (!job) return null;

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex h-full w-full overflow-hidden"
    >
      <ResizablePanelGroup direction="horizontal">
        {/* Left Panel: PDF Viewer */}
        <ResizablePanel defaultSize={35} minSize={20}>
          <div className="h-full w-full flex flex-col relative bg-muted/20">
            <PdfViewer job={job} />
          </div>
        </ResizablePanel>

        <ResizableHandle withHandle className="w-2 bg-border hover:bg-primary/50 transition-colors cursor-col-resize z-10 group hidden lg:flex" />

        {/* Center Panel: Structured Output */}
        <ResizablePanel defaultSize={45} minSize={25}>
          <div className="flex flex-col h-full bg-background relative overflow-hidden">
            {job.artifacts ? (
              <DynamicTabs job={job} />
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-8">
                <FileText className="w-12 h-12 mb-4 opacity-20" />
                <p>No structured output available.</p>
              </div>
            )}
          </div>
        </ResizablePanel>

        <ResizableHandle withHandle className="w-2 bg-border hover:bg-primary/50 transition-colors cursor-col-resize z-10 group hidden lg:flex" />

        {/* Right Panel: Inspector */}
        <ResizablePanel defaultSize={20} minSize={20} maxSize={35} collapsible={true} className="hidden lg:block">
          <div className="h-full w-full bg-muted/10 border-l overflow-hidden">
            <Inspector job={job} />
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </motion.div>
  );
}
