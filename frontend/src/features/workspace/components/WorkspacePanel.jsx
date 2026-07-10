import { useRef } from 'react';
import { useWorkspaceLayout } from '../context/WorkspaceLayoutContext';
import { DynamicTabs } from './DynamicTabs';
import { PanelDebugOverlay } from './PanelDebugOverlay';
import { Maximize2, Minimize2, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function WorkspacePanel({ job, onResetWidths, tabletInspectorOpenBtn }) {
  const { isFullscreen, setIsFullscreen, debugMode } = useWorkspaceLayout();
  const panelRef = useRef(null);

  const toggleFullscreen = () => {
    setIsFullscreen(isFullscreen === 'workspace' ? null : 'workspace');
  };

  return (
    <div 
      ref={panelRef}
      className={`h-full w-full flex flex-col min-h-0 bg-background relative ${
        debugMode ? 'border-2 border-blue-500' : ''
      }`}
    >
      {/* Workspace Panel Header */}
      <div className="h-12 border-b flex items-center justify-between px-4 bg-background shrink-0 z-20">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Structured Workspace
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          {tabletInspectorOpenBtn}
          
          {onResetWidths && (
            <Button 
              variant="ghost" 
              size="icon" 
              className="w-8 h-8 text-muted-foreground hover:text-foreground"
              onClick={onResetWidths}
              title="Reset Panel Widths"
            >
              <RotateCcw className="w-4 h-4" />
            </Button>
          )}

          <Button 
            variant="ghost" 
            size="icon" 
            className="w-8 h-8 text-muted-foreground hover:text-foreground"
            onClick={toggleFullscreen}
            title={isFullscreen === 'workspace' ? "Exit Fullscreen" : "Fullscreen Workspace"}
          >
            {isFullscreen === 'workspace' ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      {/* Tabs Container */}
      <div className="flex-1 min-h-0 relative">
        <DynamicTabs job={job} />
      </div>

      {debugMode && (
        <PanelDebugOverlay name="Workspace Panel" refContainer={panelRef} />
      )}
    </div>
  );
}
