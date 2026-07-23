export function StatsSection() {
  const stats = [
    { number: "500+", label: "Institutions Assessed" },
    { number: "50+", label: "Expert Consultants" },
    { number: "100%", label: "MESAR Compliant" },
    { number: "28/29", label: "NCISM Act Sections" }
  ];

  return (
    <section id="impact" className="w-full bg-card border-b-2 border-foreground py-24 px-4 md:px-8">
      <div className="max-w-[1200px] mx-auto grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8">
        {stats.map((stat, idx) => (
          <div
            key={idx}
            className="rounded-3xl border-2 border-foreground bg-background p-8 flex flex-col items-start text-left space-y-2 shadow-[6px_6px_0px_hsl(var(--foreground))] transition-transform duration-200 ease-out hover:-translate-y-1 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
          >
            <span className="font-serif text-[40px] font-normal text-foreground leading-none select-none">
              {stat.number}
            </span>
            <span className="font-sans text-sm text-muted-foreground tracking-wide">
              {stat.label}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
