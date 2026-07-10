import { useState, useEffect, useRef } from 'react';
import { 
  ResizablePanelGroup, 
  ResizablePanel, 
  ResizableHandle 
} from "@/components/ui/resizable";
import { 
  ChevronRight, 
  ChevronLeft, 
  FileText
} from "lucide-react";
import { useWorkspaceLayout } from '../context/WorkspaceLayoutContext';
import { PdfPanel } from './PdfPanel';
import { WorkspacePanel } from './WorkspacePanel';
import { InspectorPanel } from './InspectorPanel';
import { Sheet, SheetContent } from "@/components/ui/sheet";

// Native hook to watch screen size with matchMedia
function useMediaQuery(query) {
  const [matches, setMatches] = useState(
    typeof window !== 'undefined' ? window.matchMedia(query).matches : false
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const media = window.matchMedia(query);
    const listener = () => setMatches(media.matches);
    media.addEventListener('change', listener);
    return () => media.removeEventListener('change', listener);
  }, [query]);

  return matches;
}

// Layout control precedence: fullscreen > reading mode > manual collapse.
// Fullscreen unmounts the panel group; on exit the readingMode effect
// re-applies collapses. collapsedPanels is DERIVED state — only the panels'
// onCollapse/onExpand callbacks write it; intent goes through the imperative
// panel API (panelRef.collapse()/expand()/resize()).
export function PanelGroup({ job }) {
  const {
    isFullscreen,
    collapsedPanels,
    setCollapsedPanels,
    panelSizes,
    setPanelSizes,
    readingMode,
    setReadingMode,
  } = useWorkspaceLayout();

  // Watch breakpoints
  const isMobile = useMediaQuery('(max-width: 767px)');
  const isTablet = useMediaQuery('(min-width: 768px) and (max-width: 1023px)');

  // Active tab on mobile
  const [mobileTab, setMobileTab] = useState('workspace'); // 'pdf' | 'workspace' | 'inspector'
  // Drawer state on tablet
  const [isTabletInspectorOpen, setIsTabletInspectorOpen] = useState(false);

  // Panel refs for resizing/collapsing programmatically
  const pdfPanelRef = useRef(null);
  const workspacePanelRef = useRef(null);
  const inspectorPanelRef = useRef(null);

  // Persist layout after drag release. v4's onLayoutChanged delivers a map
  // { [panelId]: value } — normalize to percentages by the group sum.
  const handleLayoutChanged = (layout) => {
    const sum = Object.values(layout).reduce((a, b) => a + b, 0);
    if (!sum) return;
    const pct = (key) => {
      const entry = Object.entries(layout).find(([id]) => id.startsWith(key));
      return entry ? (entry[1] / sum) * 100 : null;
    };

    const pdf = pct('pdf-panel');
    const workspace = pct('workspace-panel');
    const inspector = pct('inspector-panel');

    // Don't persist collapsed(0) widths as the new default.
    if (pdf != null && workspace != null && inspector != null) {
      if (pdf === 0 || inspector === 0) return;
      setPanelSizes({ pdf, workspace, inspector });
    } else if (pdf != null && workspace != null && isTablet) {
      if (pdf === 0) return;
      setPanelSizes(prev => ({ ...prev, pdf, workspace }));
    }
  };

  // Safe calls for ref collapse/expand actions
  const togglePdfCollapse = () => {
    const panel = pdfPanelRef.current;
    if (panel) {
      if (panel.isCollapsed()) {
        panel.expand();
      } else {
        panel.collapse();
      }
    }
  };

  const toggleInspectorCollapse = () => {
    const panel = inspectorPanelRef.current;
    if (panel) {
      if (panel.isCollapsed()) {
        panel.expand();
      } else {
        panel.collapse();
      }
    }
  };

  const handleResetWidths = () => {
    setReadingMode(false); // reset means reset
    pdfPanelRef.current?.expand();
    inspectorPanelRef.current?.expand();
    // Numeric values are pixels in v4 — resize with percent strings.
    pdfPanelRef.current?.resize('35%');
    inspectorPanelRef.current?.resize('20%');
    setPanelSizes({ pdf: 35, workspace: 45, inspector: 20 });
  };

  // Reading mode: collapse both side panels; restore on exit. Manual
  // expansion of a rail while reading stays allowed (user override).
  useEffect(() => {
    if (isMobile || isFullscreen) return;
    if (readingMode) {
      pdfPanelRef.current?.collapse();
      inspectorPanelRef.current?.collapse();
    } else {
      pdfPanelRef.current?.expand();
      inspectorPanelRef.current?.expand();
    }
  }, [readingMode, isMobile, isTablet, isFullscreen]);

  // Fullscreen Render overrides standard panel groups
  if (isFullscreen === 'pdf') {
    return (
      <div className="h-full w-full relative min-h-0">
        <PdfPanel job={job} />
      </div>
    );
  }

  if (isFullscreen === 'workspace') {
    return (
      <div className="h-full w-full relative min-h-0">
        <WorkspacePanel job={job} />
      </div>
    );
  }

  if (isFullscreen === 'inspector') {
    return (
      <div className="h-full w-full relative min-h-0">
        <InspectorPanel job={job} />
      </div>
    );
  }

  // --- MOBILE LAYOUT ---
  if (isMobile) {
    return (
      <div className="h-full w-full flex flex-col min-h-0 bg-background">
        <div className="flex-1 min-h-0 overflow-hidden relative">
          {mobileTab === 'pdf' && <PdfPanel job={job} />}
          {mobileTab === 'workspace' && <WorkspacePanel job={job} />}
          {mobileTab === 'inspector' && <InspectorPanel job={job} />}
        </div>
        {/* Mobile bottom tab bar */}
        <div className="h-14 border-t bg-background shrink-0 flex items-center justify-around px-4 z-20">
          <button
            onClick={() => setMobileTab('pdf')}
            className={`flex flex-col items-center justify-center py-1 text-xs font-medium transition-colors ${
              mobileTab === 'pdf' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <FileText className="w-5 h-5 mb-0.5" />
            PDF Viewer
          </button>
          <button
            onClick={() => setMobileTab('workspace')}
            className={`flex flex-col items-center justify-center py-1 text-xs font-medium transition-colors ${
              mobileTab === 'workspace' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <FileText className="w-5 h-5 mb-0.5" />
            Workspace
          </button>
          <button
            onClick={() => setMobileTab('inspector')}
            className={`flex flex-col items-center justify-center py-1 text-xs font-medium transition-colors ${
              mobileTab === 'inspector' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <FileText className="w-5 h-5 mb-0.5" />
            Inspector
          </button>
        </div>
      </div>
    );
  }

  // --- TABLET LAYOUT ---
  if (isTablet) {
    return (
      <div className="h-full w-full flex min-h-0 relative bg-background">
        <ResizablePanelGroup
          direction="horizontal"
          onLayoutChanged={handleLayoutChanged}
          id="workspace-layout-group-tablet"
        >
          {/* PDF Panel */}
          <ResizablePanel
            ref={pdfPanelRef}
            id="pdf-panel-tablet"
            defaultSize={`${panelSizes.pdf}%`}
            minSize="20%"
            collapsible
            onCollapse={() => setCollapsedPanels(prev => ({ ...prev, pdf: true }))}
            onExpand={() => setCollapsedPanels(prev => ({ ...prev, pdf: false }))}
          >
            <PdfPanel 
              job={job} 
              onCollapseToggle={togglePdfCollapse}
              onResetWidths={handleResetWidths}
            />
          </ResizablePanel>

          <ResizableHandle withHandle className="w-1.5 hover:bg-primary/50 transition-colors" />

          {/* Workspace Panel */}
          <ResizablePanel
            ref={workspacePanelRef}
            id="workspace-panel-tablet"
            defaultSize={`${100 - panelSizes.pdf}%`}
            minSize="30%"
          >
            <WorkspacePanel 
              job={job}
              onResetWidths={handleResetWidths}
              tabletInspectorOpenBtn={
                <button
                  onClick={() => setIsTabletInspectorOpen(true)}
                  className="px-3 py-1 bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground text-xs rounded-md transition-colors"
                >
                  Document Inspector
                </button>
              }
            />
          </ResizablePanel>
        </ResizablePanelGroup>

        {/* Collapsed PDF Sidebar on Left */}
        {collapsedPanels.pdf && (
          <div 
            onClick={togglePdfCollapse}
            className="absolute left-0 top-0 bottom-0 w-10 border-r bg-muted/10 hover:bg-muted/20 flex flex-col items-center py-4 select-none cursor-pointer z-30 transition-all duration-200"
          >
            <button className="p-1.5 bg-muted rounded-md mb-4 text-muted-foreground hover:text-foreground">
              <ChevronRight className="w-4 h-4" />
            </button>
            <div className="[writing-mode:vertical-lr] rotate-180 text-xs font-semibold text-muted-foreground tracking-wider select-none">
              ORIGINAL PDF
            </div>
          </div>
        )}

        {/* Inspector Slide-over Drawer for Tablets */}
        <Sheet open={isTabletInspectorOpen} onOpenChange={setIsTabletInspectorOpen}>
          <SheetContent side="right" className="w-[350px] sm:w-[450px] p-0 border-l bg-background">
            <div className="h-full w-full flex flex-col min-h-0">
              <InspectorPanel job={job} isTabletDrawer={true} onClose={() => setIsTabletInspectorOpen(false)} />
            </div>
          </SheetContent>
        </Sheet>
      </div>
    );
  }

  // --- DESKTOP LAYOUT ---
  return (
    <div className="h-full w-full flex min-h-0 relative bg-background">
      {/* Collapsed PDF Sidebar on Left */}
      {collapsedPanels.pdf && (
        <div 
          onClick={togglePdfCollapse}
          className="w-10 h-full border-r bg-muted/10 hover:bg-muted/20 flex flex-col items-center py-4 select-none cursor-pointer shrink-0 z-30 transition-all duration-200"
        >
          <button className="p-1.5 bg-muted rounded-md mb-4 text-muted-foreground hover:text-foreground">
            <ChevronRight className="w-4 h-4" />
          </button>
          <div className="[writing-mode:vertical-lr] rotate-180 text-xs font-semibold text-muted-foreground tracking-wider select-none">
            ORIGINAL PDF
          </div>
        </div>
      )}

      {/* Main Resizable Panel Group */}
      <div className="flex-1 min-h-0 h-full overflow-hidden relative">
        <ResizablePanelGroup
          direction="horizontal"
          onLayoutChanged={handleLayoutChanged}
          id="workspace-layout-group-desktop"
        >
          {/* PDF Panel */}
          <ResizablePanel
            ref={pdfPanelRef}
            id="pdf-panel-desktop"
            defaultSize={`${panelSizes.pdf}%`}
            minSize="15%"
            collapsible
            onCollapse={() => setCollapsedPanels(prev => ({ ...prev, pdf: true }))}
            onExpand={() => setCollapsedPanels(prev => ({ ...prev, pdf: false }))}
          >
            <PdfPanel 
              job={job}
              onCollapseToggle={togglePdfCollapse}
              onResetWidths={handleResetWidths}
            />
          </ResizablePanel>

          <ResizableHandle withHandle className="w-1.5 hover:bg-primary/50 transition-colors z-20" />

          {/* Workspace Panel */}
          <ResizablePanel
            ref={workspacePanelRef}
            id="workspace-panel-desktop"
            defaultSize={`${panelSizes.workspace}%`}
            minSize="30%"
          >
            <WorkspacePanel 
              job={job}
              onResetWidths={handleResetWidths}
            />
          </ResizablePanel>

          <ResizableHandle withHandle className="w-1.5 hover:bg-primary/50 transition-colors z-20" />

          {/* Inspector Panel */}
          <ResizablePanel
            ref={inspectorPanelRef}
            id="inspector-panel-desktop"
            defaultSize={`${panelSizes.inspector}%`}
            minSize="15%"
            collapsible
            onCollapse={() => setCollapsedPanels(prev => ({ ...prev, inspector: true }))}
            onExpand={() => setCollapsedPanels(prev => ({ ...prev, inspector: false }))}
          >
            <InspectorPanel 
              job={job}
              onCollapseToggle={toggleInspectorCollapse}
              onResetWidths={handleResetWidths}
            />
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>

      {/* Collapsed Inspector Sidebar on Right */}
      {collapsedPanels.inspector && (
        <div 
          onClick={toggleInspectorCollapse}
          className="w-10 h-full border-l bg-muted/10 hover:bg-muted/20 flex flex-col items-center py-4 select-none cursor-pointer shrink-0 z-30 transition-all duration-200"
        >
          <button className="p-1.5 bg-muted rounded-md mb-4 text-muted-foreground hover:text-foreground">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="[writing-mode:vertical-lr] text-xs font-semibold text-muted-foreground tracking-wider select-none">
            INSPECTOR
          </div>
        </div>
      )}
    </div>
  );
}
