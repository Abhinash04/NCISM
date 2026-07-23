import { CheckCircle } from 'lucide-react';

export function ProblemSolution() {
  const points = [
    'Deterministic MESAR rule evaluation',
    'Automated document extraction & CDM reconstruction',
    'Transparent multi-tier board review',
    'Complete, exportable audit trail',
  ];

  return (
    <section id="overview" className="w-full bg-secondary border-b-2 border-foreground py-24 px-4 md:px-8">
      <div className="max-w-[1100px] mx-auto grid md:grid-cols-2 gap-16 items-center">

        {/* Problem */}
        <div>
          <h2 className="font-serif text-[32px] md:text-[40px] font-normal text-foreground tracking-tight leading-tight mb-6">
            Manual accreditation is slow, inconsistent, and hard to audit.
          </h2>
          <p className="font-sans text-base text-muted-foreground leading-relaxed mb-6">
            Institutions submit hundreds of pages; reviewers assess them by hand against MESAR regulations. The process is time-consuming, varies between reviewers, and leaves gaps in the record.
          </p>
          <p className="font-sans text-base text-muted-foreground leading-relaxed">
            The MESAR platform standardizes assessment end-to-end — from document intake to board decision — so every institution is evaluated the same way, with a defensible trail.
          </p>
        </div>

        {/* Solution card */}
        <div className="rounded-3xl border-2 border-foreground bg-card p-8 shadow-[6px_6px_0px_hsl(var(--foreground))]">
          <h3 className="font-serif text-2xl font-normal text-foreground tracking-tight mb-6">
            The MESAR platform approach
          </h3>
          <ul className="space-y-4 font-sans text-base text-foreground">
            {points.map((point) => (
              <li key={point} className="flex items-start gap-3">
                <CheckCircle className="w-6 h-6 text-primary shrink-0 mt-0.5" strokeWidth={1.5} />
                <span>{point}</span>
              </li>
            ))}
          </ul>
        </div>

      </div>
    </section>
  );
}
