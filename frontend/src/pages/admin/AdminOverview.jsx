import { useNavigate } from 'react-router-dom';
import {
  Building2, Upload, Users, Shield, KeyRound, FileStack, ClipboardCheck, BarChart3, ScrollText, LayoutDashboard, Layers,
} from 'lucide-react';
import { useReportsOverview } from '@/features/reports/hooks';

const TILES = [
  { name: 'Users', path: '/admin/users', icon: Users, desc: 'Accounts, roles & the reporting chain' },
  { name: 'Roles', path: '/admin/roles', icon: Shield, desc: 'Role definitions' },
  { name: 'Permissions', path: '/admin/permissions', icon: KeyRound, desc: 'Permission catalogue' },
  { name: 'Rulesets', path: '/admin/rulesets', icon: Layers, desc: 'Assessment ruleset activation' },
  { name: 'Institutions', path: '/admin/institutions', icon: Building2, desc: '672-college registry' },
  { name: 'Import', path: '/admin/institutions/import', icon: Upload, desc: 'Bulk registry import' },
  { name: 'Cases', path: '/admin/applications', icon: FileStack, desc: 'All assessment cases' },
  { name: 'Compliance', path: '/admin/compliance', icon: ClipboardCheck, desc: 'Penalty ledger' },
  { name: 'Reports', path: '/admin/reports', icon: BarChart3, desc: 'Analytics & exports' },
  { name: 'Audit', path: '/admin/audit', icon: ScrollText, desc: 'Append-only activity log' },
];

function rupees(n) { return `₹${Number(n || 0).toLocaleString('en-IN')}`; }

export function AdminOverview() {
  const navigate = useNavigate();
  const { data } = useReportsOverview();
  const s = data?.summary;

  const kpis = [
    { label: 'Total cases', value: s ? s.totalCases : '—' },
    { label: 'Decided', value: s ? s.decidedCases : '—' },
    { label: 'Seat reductions', value: s ? s.seatReductionTotal : '—' },
    { label: 'Monetary penalties', value: s ? rupees(s.monetaryTotal) : '—' },
  ];

  return (
    <div className="p-6 md:p-8 space-y-8 max-w-6xl mx-auto">
      <div className="flex items-start gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
          <LayoutDashboard className="h-5 w-5" />
        </span>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Administration</h1>
          <p className="text-muted-foreground mt-1 text-sm">Users, registry, and platform oversight. Admins configure the system — they are not in the approval chain.</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {kpis.map((k) => (
          <div key={k.label} className="rounded-xl border bg-background p-4 shadow-sm">
            <div className="text-2xl font-bold tabular-nums">{k.value}</div>
            <div className="text-xs text-muted-foreground mt-1">{k.label}</div>
          </div>
        ))}
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {TILES.map((t) => (
          <button
            key={t.path}
            onClick={() => navigate(t.path)}
            className="flex items-start gap-3 rounded-xl border bg-background p-4 text-left shadow-sm hover:border-primary/50 hover:bg-muted/30 transition-colors"
          >
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-primary/10 text-primary">
              <t.icon className="h-5 w-5" />
            </span>
            <span>
              <span className="block text-sm font-semibold">{t.name}</span>
              <span className="block text-xs text-muted-foreground">{t.desc}</span>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
