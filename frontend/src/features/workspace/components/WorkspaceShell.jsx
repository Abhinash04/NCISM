import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { StatusBadge } from '@/components/common/StatusBadge';
import { ThemeToggle } from '@/components/common/ThemeToggle';
import { PanelGroup } from './PanelGroup';

export function WorkspaceShell({ job }) {
  const navigate = useNavigate();

  return (
    <div className="h-screen w-full bg-background flex flex-col overflow-hidden">
      {/* Workspace Header / Navbar */}
      <header className="h-16 border-b bg-background flex items-center justify-between px-6 shrink-0 z-10">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/dashboard')}
            className="p-2 hover:bg-muted rounded-full transition-colors"
            title="Back to Dashboard"
          >
            <ArrowLeft className="w-5 h-5 text-muted-foreground" />
          </button>
          <div className="flex flex-col">
            <h2 className="text-lg font-semibold tracking-tight">{job.filename || 'Document'}</h2>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>Processing Time: {(job.processingTimeMs / 1000).toFixed(2)}s</span>
              <span>•</span>
              <span>{job.pageCount || 0} Pages</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <StatusBadge />
          <ThemeToggle />
        </div>
      </header>

      {/* Warnings Banner */}
      {(job.status === 'partial' || job.warnings.length > 0) && (
        <div className="bg-destructive/10 border-b border-destructive/20 p-4 text-sm text-foreground shrink-0 z-10 shadow-sm flex flex-col gap-2 overflow-y-auto max-h-48">
          <div className="flex items-center gap-2 text-destructive font-semibold">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="lucide lucide-alert-triangle"
            >
              <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
              <path d="M12 9v4" />
              <path d="M12 17h.01" />
            </svg>
            Extraction completed with warnings.
          </div>
          <div className="text-muted-foreground grid grid-cols-[100px_1fr] gap-x-4">
            {job.failedPages.length > 0 && (
              <>
                <span className="font-medium text-foreground">Successfully processed:</span>
                <span>Pages 1–{Math.max(1, Math.min(...job.failedPages) - 1)}</span>
                <span className="font-medium text-foreground">Failed:</span>
                <span>Pages {job.failedPages.join(', ')}</span>
              </>
            )}
            {job.warnings.length > 0 && (
              <>
                <span className="font-medium text-foreground">Reason:</span>
                <ul className="list-disc pl-4 space-y-1">
                  {job.warnings.map((w, i) => <li key={i}>{w}</li>)}
                </ul>
              </>
            )}
          </div>
        </div>
      )}

      {/* Workspace Body */}
      <div className="flex-1 min-h-0 w-full overflow-hidden relative">
        <PanelGroup job={job} />
      </div>
    </div>
  );
}
