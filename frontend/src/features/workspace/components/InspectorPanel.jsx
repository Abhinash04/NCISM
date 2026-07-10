import { useRef } from 'react';
import { useWorkspaceLayout } from '../context/WorkspaceLayoutContext';
import { Inspector } from './Inspector';
import { PanelDebugOverlay } from './PanelDebugOverlay';
import { Maximize2, Minimize2, RotateCcw, X, PanelRightClose } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function InspectorPanel({ job, onCollapseToggle, onResetWidths, isTabletDrawer, onClose }) {
  const { isFullscreen, setIsFullscreen, debugMode } = useWorkspaceLayout();
  const panelRef = useRef(null);

  const toggleFullscreen = () => {
    setIsFullscreen(isFullscreen === 'inspector' ? null : 'inspector');
  };

  return (
    <div 
      ref={panelRef}
      className={`h-full w-full flex flex-col min-h-0 bg-background relative ${
        debugMode ? 'border-2 border-purple-500' : ''
      }`}
    >
      {/* Inspector Panel Header */}
      <div className="h-12 border-b flex items-center justify-between px-4 bg-background shrink-0 z-20">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Inspector
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          {/* Close button for tablet sheet */}
          {isTabletDrawer && onClose && (
            <Button 
              variant="ghost" 
              size="icon" 
              className="w-8 h-8 text-muted-foreground hover:text-foreground"
              onClick={onClose}
              title="Close Drawer"
            >
              <X className="w-4 h-4" />
            </Button>
          )}

          {!isTabletDrawer && onResetWidths && (
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

          {!isTabletDrawer && onCollapseToggle && (
            <Button 
              variant="ghost" 
              size="icon" 
              className="w-8 h-8 text-muted-foreground hover:text-foreground"
              onClick={onCollapseToggle}
              title="Collapse Inspector"
            >
              <PanelRightClose className="w-4 h-4" />
            </Button>
          )}

          {!isTabletDrawer && (
            <Button 
              variant="ghost" 
              size="icon" 
              className="w-8 h-8 text-muted-foreground hover:text-foreground"
              onClick={toggleFullscreen}
              title={isFullscreen === 'inspector' ? "Exit Fullscreen" : "Fullscreen Inspector"}
            >
              {isFullscreen === 'inspector' ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </Button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0 relative">
        <Inspector job={job} />
      </div>

      {debugMode && (
        <PanelDebugOverlay name="Inspector Panel" refContainer={panelRef} />
      )}
    </div>
  );
}
