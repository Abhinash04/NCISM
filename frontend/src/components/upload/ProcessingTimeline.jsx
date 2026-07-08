import { motion } from 'framer-motion';
import { CheckCircle2, Circle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const STEPS = [
  "Uploading PDF",
  "Sending to Hybrid Server",
  "Extracting Content",
  "Preparing Results",
  "Rendering Viewer"
];

export function ProcessingTimeline({ currentStep }) {
  return (
    <div className="w-full max-w-md mx-auto p-8 rounded-2xl border bg-card/50 backdrop-blur-sm shadow-sm">
      <h3 className="text-xl font-semibold mb-6 text-center">Processing Document</h3>
      
      <div className="space-y-6">
        {STEPS.map((step, index) => {
          const stepNumber = index + 1;
          const isCompleted = currentStep > stepNumber;
          const isCurrent = currentStep === stepNumber;

          return (
            <motion.div 
              key={step}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="flex items-center gap-4"
            >
              <div className={cn(
                "flex-shrink-0 relative flex items-center justify-center w-8 h-8 rounded-full transition-colors duration-300",
                isCompleted ? "text-primary" : isCurrent ? "text-primary" : "text-muted-foreground"
              )}>
                {isCompleted ? (
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}>
                    <CheckCircle2 className="w-6 h-6 text-green-500" />
                  </motion.div>
                ) : isCurrent ? (
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                ) : (
                  <Circle className="w-6 h-6" />
                )}
                
                {/* Connecting line */}
                {index < STEPS.length - 1 && (
                  <div className={cn(
                    "absolute top-8 left-1/2 -ml-px w-0.5 h-6 transition-colors duration-300",
                    isCompleted ? "bg-green-500/50" : "bg-border"
                  )} />
                )}
              </div>
              
              <span className={cn(
                "text-sm font-medium transition-colors duration-300",
                isCompleted ? "text-foreground" : isCurrent ? "text-foreground" : "text-muted-foreground"
              )}>
                {step}
              </span>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
