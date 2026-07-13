import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function About() {
  return (
    <div className="p-6 md:p-8 space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">About</h1>
        <p className="text-muted-foreground mt-1">NCISM Assessment Platform — foundation release.</p>
      </div>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-base font-sans">What this platform does</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <p>
            The platform digitizes the assessment of ASU&amp;SR college inspection reports for the
            Medical Assessment and Rating Board (MARB-ISM) of the National Commission for Indian
            System of Medicine.
          </p>
          <p>
            Uploaded documents are extracted with structure preserved (headings, tables, reading
            order), then evaluated by a deterministic rule engine against versioned MESAR
            regulation rulesets and the Board-approved punitive policy. The output is an
            assessment report in the official MARB format — every finding carries its regulation
            reference, and values the system cannot verify are flagged for manual verification
            rather than invented.
          </p>
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-base font-sans">Pipeline</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground leading-relaxed">
          Upload → OpenDataLoader-PDF extraction (Docling hybrid) → semantic reconstruction →
          canonical Markdown + JSON → parameter extraction → rule evaluation → punitive policy →
          MARB report.
        </CardContent>
      </Card>
    </div>
  );
}
