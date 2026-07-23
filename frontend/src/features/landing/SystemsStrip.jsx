export function SystemsStrip() {
  const systems = ['Ayurveda', 'Unani', 'Siddha', 'Sowa-Rigpa'];

  return (
    <section className="w-full bg-card border-b-2 border-foreground py-12 px-4 md:px-8">
      <p className="text-center font-sans text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground mb-8">
        Recognized under the NCISM Act 2020
      </p>
      <div className="max-w-[1200px] mx-auto flex flex-wrap justify-center items-center gap-8 md:gap-16">
        {systems.map((name) => (
          <span
            key={name}
            className="font-serif text-2xl md:text-3xl font-normal text-foreground tracking-tight select-none"
          >
            {name}
          </span>
        ))}
      </div>
    </section>
  );
}
