import { useRef } from 'react';
import { useWorkspaceLayout } from '../context/WorkspaceLayoutContext';
import { PdfViewer } from './PdfViewer';
import { PanelDebugOverlay } from './PanelDebugOverlay';

export function PdfPanel({ job, onCollapseToggle, onResetWidths }) {
  const { isFullscreen, setIsFullscreen, debugMode } = useWorkspaceLayout();
  const panelRef = useRef(null);

  const handleFullscreenToggle = () => {
    if (isFullscreen === 'pdf') {
      setIsFullscreen(null);
    } else {
      setIsFullscreen('pdf');
    }
  };

  return (
    <div 
      ref={panelRef}
      className={`h-full w-full flex flex-col min-h-0 relative ${
        debugMode ? 'border-2 border-emerald-500' : ''
      }`}
    >
      <PdfViewer 
        job={job}
        isFullscreen={isFullscreen === 'pdf'}
        onFullscreenToggle={handleFullscreenToggle}
        onCollapseToggle={onCollapseToggle}
        onResetWidths={onResetWidths}
      />

      {debugMode && (
        <PanelDebugOverlay name="PDF Panel" refContainer={panelRef} />
      )}
    </div>
  );
}
