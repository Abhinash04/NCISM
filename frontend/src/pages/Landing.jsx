import { Link } from 'react-router-dom';
import { ArrowRight, FileText, Zap, Shield, Database } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';

export function Landing() {
  const features = [
    {
      title: "Structure-Preserving Extraction",
      description: "Inspection reports become structured Markdown and JSON — headings, tables, merged cells and reading order intact.",
      icon: <FileText className="h-6 w-6 text-primary" />,
    },
    {
      title: "Deterministic Assessment",
      description: "Versioned MESAR rulesets and the Board-approved punitive policy drive every finding. No AI judgement, no hallucinations.",
      icon: <Zap className="h-6 w-6 text-primary" />,
    },
    {
      title: "MARB-Format Reports",
      description: "Shortcomings, staff tables and punitive summaries rendered in the official MARB-ISM assessment report format.",
      icon: <Database className="h-6 w-6 text-primary" />,
    },
    {
      title: "Local & Auditable",
      description: "Documents process on your infrastructure; every finding carries its regulation reference and evidence trail.",
      icon: <Shield className="h-6 w-6 text-primary" />,
    },
  ];

  return (
    <div className="flex flex-col w-full h-full">
      {/* Hero Section */}
      <section className="w-full py-24 md:py-32 lg:py-48 flex items-center justify-center border-b">
        <div className="container px-4 md:px-6">
          <div className="flex flex-col items-center space-y-4 text-center">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="space-y-2"
            >
              <h1 className="font-display font-medium tracking-tight text-4xl sm:text-5xl md:text-6xl lg:text-7xl/none">
                Deterministic document assessment
              </h1>
              <p className="mx-auto max-w-[700px] text-muted-foreground md:text-xl">
                Upload inspection reports, preserve their structure, and generate MARB-format
                compliance assessments against NCISM regulations.
              </p>
            </motion.div>
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="space-x-4 pt-8"
            >
              <Link to="/dashboard">
                <Button size="lg" className="h-12 px-8">
                  Open Dashboard <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Feature Grid */}
      <section className="w-full py-24 bg-muted/30">
        <div className="container px-4 md:px-6 mx-auto">
          <div className="grid gap-12 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((feature, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="flex flex-col items-center space-y-4 text-center"
              >
                <div className="p-4 bg-background rounded-full shadow-sm border">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-sans font-medium">{feature.title}</h3>
                <p className="text-muted-foreground text-sm">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
