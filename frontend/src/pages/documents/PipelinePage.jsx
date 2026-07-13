import { useMemo, useState } from 'react';
import { DocumentPageLayout } from '@/features/documents/components/DocumentPageLayout';
import { WarningsBanner } from '@/features/documents/components/WarningsBanner';
import { useArtifact } from '@/features/workspace/hooks/useArtifact';
import { computeDocStats } from '@/features/documents/lib/stats';
import { downloadBlob } from '@/lib/download';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  CheckCircle2, AlertTriangle, XCircle, Upload, Cog, Layers, Package,
  Download, FileText, FileJson, File, ChevronDown, ChevronRight,
} from 'lucide-react';
import { formatBytes } from '@/lib/format';

export function PipelinePage() {
  return (
    <DocumentPageLayout title="Pipeline">
      {(job) => <PipelineContent job={job} />}
    </DocumentPageLayout>
  );
}

function StageIcon({ state }) {
  if (state === 'ok') return <CheckCircle2 className="w-5 h-5 text-emerald-500" />;
  if (state === 'warn') return <AlertTriangle className="w-5 h-5 text-amber-500" />;
  return <XCircle className="w-5 h-5 text-destructive" />;
}

function PipelineContent({ job }) {
  const { data: markdown } = useArtifact(job, 'markdown');
  const { data: pdfBlob } = useArtifact(job, 'pdf');
  const { data: json } = useArtifact(job, 'json');
  const [showRaw, setShowRaw] = useState(false);

  const stats = useMemo(() => computeDocStats(markdown), [markdown]);
  const recoveredNote = (job.warnings || []).find((w) => /base engine/i.test(w));
  const hasWarnings = (job.warnings?.length || 0) > 0 || (job.failedPages?.length || 0) > 0;

  const stages = [
    {
      icon: Upload, name: 'Upload', state: 'ok',
      detail: `${job.filename} · ${formatBytes(job.filesize)}`,
    },
    {
      icon: Cog, name: 'Extraction (OpenDataLoader)',
      state: job.status === 'failed' ? 'fail' : recoveredNote ? 'warn' : 'ok',
      detail: recoveredNote
        ? recoveredNote
        : `${job.pageCount || '?'} pages · Docling hybrid backend`,
    },
    {
      icon: Layers, name: 'Semantic reconstruction',
      state: markdown || job.artifacts?.markdown ? 'ok' : 'fail',
      detail: 'Markdown rebuilt from the element JSON (form blocks, tables, reading order)',
    },
    {
      icon: Package, name: 'Artifacts',
      state: 'ok',
      detail: ['pdf', 'markdown', 'json', 'html', 'report', 'assessment']
        .filter((t) => job.artifacts?.[t]).join(' · ') || 'stored locally',
    },
  ];

  const downloads = [
    { label: 'Markdown', icon: FileText, available: Boolean(markdown), run: () => downloadBlob(markdown, `${(job.filename || 'document').replace(/\.[^/.]+$/, '')}.md`, 'text/markdown') },
    { label: 'Element JSON', icon: FileJson, available: Boolean(json), run: () => downloadBlob(JSON.stringify(json, null, 2), `${(job.filename || 'document').replace(/\.[^/.]+$/, '')}.json`, 'application/json') },
    { label: 'Original PDF', icon: File, available: Boolean(pdfBlob), run: () => downloadBlob(pdfBlob, job.filename || 'document.pdf', 'application/pdf') },
  ];

  return (
    <div className="h-full overflow-y-auto">
      <div className="px-6 md:px-8 pb-8 space-y-6 max-w-5xl">
        <WarningsBanner job={job} />

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Stage timeline */}
          <Card className="shadow-sm lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-sm font-medium font-sans">Processing stages</CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="space-y-5">
                {stages.map((stage, i) => (
                  <li key={i} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <StageIcon state={stage.state} />
                      {i < stages.length - 1 && <div className="w-px flex-1 bg-border mt-1" />}
                    </div>
                    <div className="pb-1">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <stage.icon className="w-3.5 h-3.5 text-muted-foreground" /> {stage.name}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{stage.detail}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card className="shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium font-sans">Execution</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Processing time</span><span className="font-medium">{((job.processingTimeMs || 0) / 1000).toFixed(2)}s</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Status</span><span className="font-medium capitalize">{job.status}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Validation</span><span className="font-medium">{hasWarnings ? `${job.warnings?.length || 0} warning(s)` : 'No warnings'}</span></div>
              </CardContent>
            </Card>

            <Card className="shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium font-sans">Extraction statistics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Words</span><span className="font-medium">{stats.words.toLocaleString()}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Headings</span><span className="font-medium">{stats.headings}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Tables</span><span className="font-medium">{stats.tables}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Pages</span><span className="font-medium">{job.pageCount || '—'}</span></div>
              </CardContent>
            </Card>

            <Card className="shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium font-sans">Downloads</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {downloads.map((d) => (
                  <Button key={d.label} variant="outline" size="sm" className="w-full justify-start"
                    disabled={!d.available} onClick={d.run}>
                    <d.icon className="w-3.5 h-3.5 mr-2" /> {d.label}
                    <Download className="w-3.5 h-3.5 ml-auto" />
                  </Button>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Raw job DTO */}
        <div className="border rounded-xl bg-background overflow-hidden">
          <button
            onClick={() => setShowRaw((v) => !v)}
            className="w-full flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-muted-foreground uppercase tracking-wider hover:bg-muted/40 transition-colors"
          >
            {showRaw ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
            Raw job response
          </button>
          {showRaw && (
            <pre className="p-4 border-t text-xs font-mono text-muted-foreground whitespace-pre-wrap break-words max-h-96 overflow-y-auto bg-muted/20">
              {JSON.stringify(job, null, 2)}
            </pre>
          )}
        </div>
      </div>
    </div>
  );
}
