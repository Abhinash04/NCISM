import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { ArrowLeft, Building2, Mail, Phone, FileText, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useInstitution } from '@/features/institutions/hooks';

const SYSTEM_LABELS = {
  ayurveda: 'Ayurveda', unani: 'Unani', siddha: 'Siddha', sowa_rigpa: 'Sowa-Rigpa',
};

function Field({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm break-words">{value || '—'}</p>
      </div>
    </div>
  );
}

export function InstitutionDetail() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { pathname } = useLocation();
  const listPath = pathname.replace(/\/[^/]+$/, ''); // drop /:id → registry list
  const { data: inst, isLoading, isError } = useInstitution(id);

  if (isLoading) return <div className="p-8 text-muted-foreground">Loading…</div>;
  if (isError || !inst) return <div className="p-8 text-destructive">Institution not found.</div>;

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-4xl mx-auto">
      <Button variant="ghost" size="sm" onClick={() => navigate(listPath)}>
        <ArrowLeft className="h-4 w-4 mr-1" /> Back to registry
      </Button>

      <div className="flex items-start gap-4">
        <div className="p-3 bg-primary/10 rounded-lg text-primary shrink-0">
          <Building2 className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{inst.name}</h1>
          <p className="text-muted-foreground mt-1 font-mono text-sm">
            {inst.institute_id} · {SYSTEM_LABELS[inst.system] || inst.system}
          </p>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Registry details</CardTitle></CardHeader>
        <CardContent className="grid sm:grid-cols-2 gap-5">
          <Field icon={MapPin} label="State" value={inst.state} />
          <Field icon={FileText} label="File number" value={inst.file_number} />
          <Field icon={Mail} label="Email" value={inst.email} />
          <Field icon={Phone} label="Contact" value={inst.contact} />
          <Field icon={Building2} label="Status" value={inst.status} />
          <Field icon={FileText} label="Source" value={inst.source} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Assessment history</CardTitle></CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No assessments yet. The post-visitation assessment lifecycle arrives in a later phase.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
