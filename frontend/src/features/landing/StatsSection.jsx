export function StatsSection() {
  const stats = [
    { number: "500+", label: "Institutions Assessed" },
    { number: "50+", label: "Expert Consultants" },
    { number: "100%", label: "MESAR Compliant" },
    { number: "28/29", label: "NCISM Act Sections" }
  ];

  return (
    <section id="about" className="w-full bg-card py-16 px-4 md:px-8">
      <div className="max-w-[1200px] mx-auto grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8 md:gap-12">
        {stats.map((stat, idx) => (
          <div key={idx} className="flex flex-col items-center md:items-start text-center md:text-left space-y-1.5">
            <span className="font-serif text-[36px] font-normal text-foreground leading-tight select-none">
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
