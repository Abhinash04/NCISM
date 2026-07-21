import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, LayoutDashboard, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/features/auth/AuthContext';
import { useApplications } from '@/features/applications/hooks';
import { DASHBOARD_CONFIG, GENERIC_DASHBOARD } from '@/features/dashboard/dashboardConfig';
import { STATUS_META } from '@/pages/applications/ApplicationsList';

const SYSTEM_LABELS = { ayurveda: 'Ayurveda', unani: 'Unani', siddha: 'Siddha', sowa_rigpa: 'Sowa-Rigpa' };

/**
 * Role-scoped landing. Renders KPI tiles + action-grouped case lists from the
 * role's already-scoped queue (queueFor). No upload affordance except the
 * Visitor CTA. Config-driven: see features/dashboard/dashboardConfig.js.
 */
export function RoleDashboard() {
  const navigate = useNavigate();
  const { primaryRole, user } = useAuth();
  const { data: rows = [], isLoading } = useApplications();

  const cfg = DASHBOARD_CONFIG[primaryRole] || GENERIC_DASHBOARD;
  const base = `/${primaryRole}`;

  const byStatus = useMemo(() => {
    const m = {};
    for (const r of rows) (m[r.status] ||= []).push(r);
    return m;
  }, [rows]);

  const count = (statuses) => statuses.reduce((n, s) => n + (byStatus[s]?.length || 0), 0);
  const rowsFor = (statuses) => statuses.flatMap((s) => byStatus[s] || [])
    .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));

  return (
    <div className="p-6 md:p-8 space-y-8 max-w-6xl mx-auto">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
            <LayoutDashboard className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{cfg.title}</h1>
            <p className="text-muted-foreground mt-1 text-sm">
              {user?.name ? `${user.name.split(' ').slice(0, 2).join(' ')} · ` : ''}{cfg.subtitle}
            </p>
          </div>
        </div>
        {cfg.cta && (
          <Button onClick={() => navigate(`${base}/${cfg.cta.to}`)}>
            <Plus className="h-4 w-4 mr-1" /> {cfg.cta.label}
          </Button>
        )}
      </div>

      {/* KPI tiles */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {cfg.kpis.map((k) => (
          <div key={k.label} className="rounded-xl border bg-background p-4 shadow-sm">
            <div className="text-2xl font-bold tabular-nums">{isLoading ? '—' : count(k.statuses)}</div>
            <div className="text-xs text-muted-foreground mt-1">{k.label}</div>
          </div>
        ))}
      </div>

      {/* Grouped queue lists */}
      <div className="space-y-6">
        {cfg.groups.map((g) => {
          const list = rowsFor(g.statuses);
          return (
            <section key={g.label} className="space-y-3">
              <div className="flex items-baseline justify-between">
                <h2 className="text-sm font-semibold">{g.label} <span className="text-muted-foreground font-normal">({list.length})</span></h2>
                {g.hint && list.length > 0 && <span className="text-xs text-muted-foreground hidden sm:block">{g.hint}</span>}
              </div>
              {list.length ? (
                <div className="rounded-xl border bg-background divide-y overflow-hidden">
                  {list.slice(0, 6).map((r) => {
                    const meta = STATUS_META[r.status] || { label: r.status, variant: 'secondary' };
                    return (
                      <button
                        key={r.id}
                        onClick={() => navigate(`${base}/applications/${r.id}`)}
                        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/40 transition-colors"
                      >
                        <span className="font-mono text-xs text-muted-foreground shrink-0 w-16">{r.institute_id}</span>
                        <span className="min-w-0 flex-1 truncate text-sm">{r.institution_name}</span>
                        <span className="hidden md:block text-xs text-muted-foreground shrink-0">
                          {SYSTEM_LABELS[r.system] || r.system} · {r.state}
                        </span>
                        <Badge variant={meta.variant} className="shrink-0">{meta.label}</Badge>
                        <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                      </button>
                    );
                  })}
                  {list.length > 6 && (
                    <button onClick={() => navigate(`${base}/applications`)}
                      className="w-full px-4 py-2.5 text-xs text-primary hover:bg-muted/40 text-left">
                      View all {list.length} →
                    </button>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground rounded-xl border border-dashed bg-muted/20 px-4 py-6 text-center">
                  {isLoading ? 'Loading…' : `Nothing ${g.label.toLowerCase()}.`}
                </p>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
