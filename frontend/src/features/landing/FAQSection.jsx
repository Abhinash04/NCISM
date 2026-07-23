import { ChevronDown } from 'lucide-react';

export function FAQSection() {
  const faqs = [
    {
      q: "Which medical systems does the MESAR assessment cover?",
      a: "The platform assesses institutions across all four Indian systems of medicine recognized under the NCISM Act 2020 — Ayurveda, Unani, Siddha, and Sowa-Rigpa — each with its own MESAR ruleset.",
    },
    {
      q: "How does automated document processing work?",
      a: "Institution submissions are run through the OpenDataLoader pipeline, which extracts text and structure from PDFs and reconstructs them into a Common Data Model, so reviewers work from clean, structured data instead of raw pages.",
    },
    {
      q: "Who reviews an institution's assessment?",
      a: "Every assessment moves through a transparent multi-tier chain — Consultant, then Senior Consultant, then Board Member — with each step recorded in the audit trail.",
    },
    {
      q: "Is the compliance evaluation deterministic?",
      a: "Yes. Evaluation is rule-based against the applicable MESAR ruleset, so the same submission always produces the same result — reproducible and defensible.",
    },
  ];

  return (
    <section id="faq" className="w-full bg-background border-b-2 border-foreground py-24 px-4 md:px-8">
      <div className="max-w-[760px] mx-auto">
        <h2 className="font-serif text-[36px] md:text-[44px] font-normal text-foreground tracking-tight text-center mb-12">
          Frequently Asked Questions
        </h2>

        <div className="space-y-4">
          {faqs.map((faq, idx) => (
            <details
              key={idx}
              className="group rounded-2xl border-2 border-foreground bg-card overflow-hidden shadow-[6px_6px_0px_hsl(var(--foreground))]"
            >
              <summary className="flex justify-between items-center gap-4 cursor-pointer list-none p-6 font-sans text-lg font-medium text-foreground tracking-tight">
                <span>{faq.q}</span>
                <ChevronDown
                  className="w-6 h-6 shrink-0 text-primary transition-transform duration-200 group-open:rotate-180 motion-reduce:transition-none"
                  strokeWidth={1.5}
                />
              </summary>
              <div className="px-6 pb-6 pt-4 font-sans text-base text-muted-foreground leading-relaxed border-t-2 border-foreground/10 mt-1">
                {faq.a}
              </div>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
