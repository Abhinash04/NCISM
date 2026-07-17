import { useState } from 'react';
import { BarChart3, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BarList } from '@/components/ui/bar-list';
import { useReportsOverview } from '@/features/reports/hooks';
import { fetchExport } from '@/features/reports/report.api';
import { downloadBlob } from '@/lib/download';
import { toast } from 'sonner';

const PENALTY_LABELS = {
  seat_reduction: 'Seat reduction', denial: 'Denial', monetary: 'Monetary penalty',
  teacher_code_revocation: 'Teacher-code revocation',
};

function rupees(n) {
  return `₹${Number(n || 0).toLocaleString('en-IN')}`;
}

function Kpi({ label, value }) {
  return (
    <div className="bg-background rounded-xl border shadow-sm p-4">
      <div className="text-2xl font-bold tabular-nums">{value}</div>
      <div className="text-xs text-muted-foreground mt-1">{label}</div>
    </div>
  );
}

function Panel({ title, children }) {
  return (
    <div className="bg-background rounded-xl border shadow-sm p-5 space-y-4">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">{title}</h2>
      {children}
    </div>
  );
}

export function Reports() {
  const { data, isLoading, isError } = useReportsOverview();
  const [exporting, setExporting] = useState(null);

  async function onExport(dataset) {
    setExporting(dataset);
    try {
      const blob = await fetchExport(dataset);
      downloadBlob(blob, `${dataset}-report.csv`, 'text/csv');
    } catch {
      toast.error(`Failed to export ${dataset}.`);
    } finally {
      setExporting(null);
    }
  }

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-6xl mx-auto">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <BarChart3 className="h-7 w-7" /> Reports & analytics
          </h1>
          <p className="text-muted-foreground mt-1">Case throughput, board outcomes, and the punitive/compliance ledger across all institutions.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled={exporting === 'cases'} onClick={() => onExport('cases')}>
            <Download className="h-4 w-4 mr-1.5" /> Cases CSV
          </Button>
          <Button variant="outline" size="sm" disabled={exporting === 'penalties'} onClick={() => onExport('penalties')}>
            <Download className="h-4 w-4 mr-1.5" /> Penalties CSV
          </Button>
        </div>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground py-12 text-center">Loading…</p>
      ) : isError || !data ? (
        <p className="text-destructive py-12 text-center">Failed to load reports.</p>
      ) : (
        <>
          {/* KPI tiles */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <Kpi label="Total cases" value={data.summary.totalCases} />
            <Kpi label="Decided" value={data.summary.decidedCases} />
            <Kpi label="Avg days to decision" value={data.summary.avgDaysToDecision ?? '—'} />
            <Kpi label="Seat reductions" value={data.summary.seatReductionTotal} />
            <Kpi label="Monetary penalties" value={rupees(data.summary.monetaryTotal)} />
            <Kpi label="Complied cases" value={data.summary.complianceComplied} />
          </div>

          {/* Distributions */}
          <div className="grid md:grid-cols-2 gap-4">
            <Panel title="Cases by status"><BarList data={data.summary.byStatus} /></Panel>
            <Panel title="Approvals per month">
              <BarList data={data.throughput.approvalsPerMonth} />
              <p className="text-xs text-muted-foreground">
                {data.throughput.openCases} open · {data.throughput.decidedCases} decided
              </p>
            </Panel>
            <Panel title="Board outcomes"><BarList data={data.summary.byOutcome} /></Panel>
            <Panel title="Compliance status"><BarList data={data.summary.byCompliance} /></Panel>
          </div>

          {/* By system */}
          <Panel title="Cases by system of medicine">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-muted-foreground uppercase border-b">
                  <tr>
                    <th className="py-2 pr-4 font-medium">System</th>
                    <th className="py-2 pr-4 font-medium text-right">Total</th>
                    <th className="py-2 pr-4 font-medium text-right">Decided</th>
                    <th className="py-2 pr-4 font-medium text-right">Denied</th>
                  </tr>
                </thead>
                <tbody>
                  {data.bySystem.map((r) => (
                    <tr key={r.system} className="border-b last:border-0">
                      <td className="py-2 pr-4 capitalize">{r.system.replace(/_/g, ' ')}</td>
                      <td className="py-2 pr-4 text-right tabular-nums">{r.total}</td>
                      <td className="py-2 pr-4 text-right tabular-nums">{r.decided}</td>
                      <td className="py-2 pr-4 text-right tabular-nums">{r.denied}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>

          {/* Penalty ledger breakdown */}
          <Panel title="Penalty ledger">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-muted-foreground uppercase border-b">
                  <tr>
                    <th className="py-2 pr-4 font-medium">Type</th>
                    <th className="py-2 pr-4 font-medium">Status</th>
                    <th className="py-2 pr-4 font-medium text-right">Count</th>
                    <th className="py-2 pr-4 font-medium text-right">Seats</th>
                    <th className="py-2 pr-4 font-medium text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {data.penalties.length ? data.penalties.map((r) => (
                    <tr key={`${r.type}-${r.status}`} className="border-b last:border-0">
                      <td className="py-2 pr-4">{PENALTY_LABELS[r.type] || r.type}</td>
                      <td className="py-2 pr-4 capitalize">{r.status}</td>
                      <td className="py-2 pr-4 text-right tabular-nums">{r.count}</td>
                      <td className="py-2 pr-4 text-right tabular-nums">{r.seats || '—'}</td>
                      <td className="py-2 pr-4 text-right tabular-nums">{r.amount ? rupees(r.amount) : '—'}</td>
                    </tr>
                  )) : (
                    <tr><td colSpan="5" className="py-6 text-center text-muted-foreground">No penalties recorded.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </Panel>

          {/* Top institutions */}
          <Panel title="Institutions by penalties">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-muted-foreground uppercase border-b">
                  <tr>
                    <th className="py-2 pr-4 font-medium">Institution</th>
                    <th className="py-2 pr-4 font-medium text-right">Penalties</th>
                    <th className="py-2 pr-4 font-medium text-right">Seat reduction</th>
                    <th className="py-2 pr-4 font-medium text-right">Monetary</th>
                  </tr>
                </thead>
                <tbody>
                  {data.topInstitutions.length ? data.topInstitutions.map((r) => (
                    <tr key={r.instituteId} className="border-b last:border-0">
                      <td className="py-2 pr-4">
                        <span className="font-mono text-xs text-muted-foreground mr-2">{r.instituteId}</span>{r.institutionName}
                      </td>
                      <td className="py-2 pr-4 text-right tabular-nums">{r.penaltyCount}</td>
                      <td className="py-2 pr-4 text-right tabular-nums">{r.seatReduction || '—'}</td>
                      <td className="py-2 pr-4 text-right tabular-nums">{r.monetary ? rupees(r.monetary) : '—'}</td>
                    </tr>
                  )) : (
                    <tr><td colSpan="4" className="py-6 text-center text-muted-foreground">No penalties recorded.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </Panel>
        </>
      )}
    </div>
  );
}
