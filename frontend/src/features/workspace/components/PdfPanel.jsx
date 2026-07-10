import { useWorkspaceLayout } from '../context/WorkspaceLayoutContext';
import { PdfViewer } from './PdfViewer';

/**
 * Thin wrapper for the left panel — PdfViewer's toolbar is the single header.
 */
export function PdfPanel({ job, onCollapseToggle, onResetWidths }) {
  const { isFullscreen, setIsFullscreen } = useWorkspaceLayout();

  const handleFullscreenToggle = () => {
    setIsFullscreen(isFullscreen === 'pdf' ? null : 'pdf');
  };

  return (
    <div className="h-full w-full flex flex-col min-h-0 relative">
      <PdfViewer
        job={job}
        isFullscreen={isFullscreen === 'pdf'}
        onFullscreenToggle={handleFullscreenToggle}
        onCollapseToggle={onCollapseToggle}
        onResetWidths={onResetWidths}
      />
    </div>
  );
}
