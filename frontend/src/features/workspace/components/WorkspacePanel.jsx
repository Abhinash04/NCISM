import { DynamicTabs } from './DynamicTabs';
import { RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * Thin wrapper for the center panel. One header per panel: the DynamicTabs
 * strip is the header — panel controls render in its trailing cluster
 * (fullscreen lives in StructuredToolbar with the other content controls).
 */
export function WorkspacePanel({ job, onResetWidths, tabletInspectorOpenBtn }) {
  const trailing = (
    <>
      {tabletInspectorOpenBtn}
      {onResetWidths && (
        <Button
          variant="ghost"
          size="icon"
          className="w-7 h-7 text-muted-foreground hover:text-foreground"
          onClick={onResetWidths}
          title="Reset Panel Widths"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </Button>
      )}
    </>
  );

  return (
    <div className="h-full w-full flex flex-col min-h-0 bg-background relative">
      <DynamicTabs job={job} trailing={trailing} />
    </div>
  );
}
