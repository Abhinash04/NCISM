import { useWorkspaceLayout } from '../context/WorkspaceLayoutContext';
import { Inspector } from './Inspector';
import { Maximize2, Minimize2, RotateCcw, X, PanelRightClose } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * Thin wrapper for the right panel. One header per panel: Inspector's own
 * tab row is the header — panel controls render in its trailing cluster.
 */
export function InspectorPanel({ job, onCollapseToggle, onResetWidths, isTabletDrawer, onClose }) {
  const { isFullscreen, setIsFullscreen } = useWorkspaceLayout();

  const toggleFullscreen = () => {
    setIsFullscreen(isFullscreen === 'inspector' ? null : 'inspector');
  };

  const iconClass = "w-7 h-7 text-muted-foreground hover:text-foreground";

  const trailing = (
    <>
      {!isTabletDrawer && onResetWidths && (
        <Button variant="ghost" size="icon" className={iconClass} onClick={onResetWidths} title="Reset Panel Widths">
          <RotateCcw className="w-3.5 h-3.5" />
        </Button>
      )}
      {!isTabletDrawer && onCollapseToggle && (
        <Button variant="ghost" size="icon" className={iconClass} onClick={onCollapseToggle} title="Collapse Inspector">
          <PanelRightClose className="w-3.5 h-3.5" />
        </Button>
      )}
      {!isTabletDrawer && (
        <Button
          variant="ghost"
          size="icon"
          className={iconClass}
          onClick={toggleFullscreen}
          title={isFullscreen === 'inspector' ? "Exit Fullscreen" : "Fullscreen Inspector"}
        >
          {isFullscreen === 'inspector' ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
        </Button>
      )}
      {isTabletDrawer && onClose && (
        <Button variant="ghost" size="icon" className={iconClass} onClick={onClose} title="Close Drawer">
          <X className="w-3.5 h-3.5" />
        </Button>
      )}
    </>
  );

  return (
    <div className="h-full w-full flex flex-col min-h-0 bg-background relative">
      <Inspector job={job} trailing={trailing} />
    </div>
  );
}
