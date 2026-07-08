import {
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  MoveHorizontal,
  Download,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

export function PdfToolbar({
  pageNumber,
  numPages,
  onPageChange,
  zoom,
  onZoomIn,
  onZoomOut,
  fitWidth,
  onToggleFitWidth,
  onDownload,
}) {
  const handlePageInput = (event) => {
    const value = Number(event.target.value);
    if (Number.isInteger(value) && value >= 1 && value <= numPages) {
      onPageChange(value);
    }
  };

  return (
    <div className="flex items-center gap-1 border-b bg-card px-3 py-2">
      <Button
        variant="ghost"
        size="icon"
        disabled={pageNumber <= 1}
        onClick={() => onPageChange(pageNumber - 1)}
        aria-label="Previous page"
      >
        <ChevronLeft />
      </Button>
      <div className="flex items-center gap-1.5 text-sm">
        <Input
          type="number"
          min={1}
          max={numPages || 1}
          value={pageNumber}
          onChange={handlePageInput}
          className="h-8 w-14 text-center"
          aria-label="Current page"
        />
        <span className="whitespace-nowrap text-muted-foreground">
          / {numPages || '—'}
        </span>
      </div>
      <Button
        variant="ghost"
        size="icon"
        disabled={!numPages || pageNumber >= numPages}
        onClick={() => onPageChange(pageNumber + 1)}
        aria-label="Next page"
      >
        <ChevronRight />
      </Button>

      <Separator orientation="vertical" className="mx-1 h-6" />

      <Button variant="ghost" size="icon" onClick={onZoomOut} disabled={fitWidth} aria-label="Zoom out">
        <ZoomOut />
      </Button>
      <span className="w-12 text-center text-sm text-muted-foreground">
        {fitWidth ? 'Fit' : `${Math.round(zoom * 100)}%`}
      </span>
      <Button variant="ghost" size="icon" onClick={onZoomIn} disabled={fitWidth} aria-label="Zoom in">
        <ZoomIn />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={onToggleFitWidth}
        aria-label="Fit width"
        className={cn(fitWidth && 'bg-accent text-accent-foreground')}
      >
        <MoveHorizontal />
      </Button>

      <div className="flex-1" />

      <Button variant="ghost" size="icon" onClick={onDownload} aria-label="Download PDF">
        <Download />
      </Button>
    </div>
  );
}
