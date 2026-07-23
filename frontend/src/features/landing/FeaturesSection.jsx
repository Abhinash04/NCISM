import { FileUp, ShieldCheck, Gavel } from 'lucide-react';

export function FeaturesSection() {

  const cards = [
    {
      icon: <FileUp className="w-8 h-8 text-primary" strokeWidth={1.5} />,
      title: "Document Processing",
      desc: "Automated PDF extraction with OpenDataLoader pipeline and CDM reconstruction."
    },
    {
      icon: <ShieldCheck className="w-8 h-8 text-primary" strokeWidth={1.5} />,
      title: "Compliance Evaluation",
      desc: "Deterministic MESAR regulation assessment with structured reporting."
    },
    {
      icon: <Gavel className="w-8 h-8 text-primary" strokeWidth={1.5} />,
      title: "Board Review",
      desc: "Multi-tier review chain: Junior Consultant → Senior Consultant → Board Member."
    }
  ];
  return (
    <section id="features" className="w-full bg-background border-b-2 border-foreground py-24 px-4 md:px-8">
      <div className="max-w-[1200px] mx-auto space-y-16">

        {/* Header section */}
        <div className="text-center max-w-[620px] mx-auto space-y-3">
          <h2 className="font-serif text-[36px] md:text-[44px] font-normal text-foreground tracking-tight leading-snug">
            Streamlined Assessment Workflows
          </h2>
          <p className="font-sans text-base text-muted-foreground leading-relaxed">
            From document upload to board decision — everything in one platform
          </p>
        </div>

        {/* Feature Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {cards.map((card, idx) => (
            <div
              key={idx}
              className="bg-card rounded-3xl border-2 border-foreground p-8 flex flex-col space-y-5 text-left shadow-[6px_6px_0px_hsl(var(--foreground))] transition-transform duration-200 ease-out hover:-translate-y-1 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
            >
              <div className="w-14 h-14 rounded-2xl bg-background border-2 border-foreground flex items-center justify-center shrink-0 shadow-[3px_3px_0px_hsl(var(--foreground))]">
                {card.icon}
              </div>
              <div className="space-y-2">
                <h3 className="font-serif text-[20px] font-normal text-foreground tracking-tight">
                  {card.title}
                </h3>
                <p className="font-sans text-sm text-foreground/80 leading-relaxed">
                  {card.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
