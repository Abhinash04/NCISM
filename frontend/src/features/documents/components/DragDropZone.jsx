import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { UploadCloud, FileType2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

export function DragDropZone({ onFileSelect }) {
  const onDrop = useCallback((acceptedFiles) => {
    if (acceptedFiles?.length > 0) {
      onFileSelect(acceptedFiles[0]);
    }
  }, [onFileSelect]);

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf']
    },
    maxFiles: 1
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "group relative flex flex-col items-center justify-center w-full h-64 sm:h-80 md:h-96 rounded-3xl border-2 border-dashed transition-all duration-300 cursor-pointer overflow-hidden bg-muted/30",
        isDragActive ? "border-primary bg-primary/5 scale-[1.02]" : "border-border hover:border-primary/50 hover:bg-muted/50",
        isDragReject && "border-destructive bg-destructive/5"
      )}
      {...getRootProps()}
    >
      <input {...getInputProps()} />
      
      <div className="flex flex-col items-center justify-center p-6 text-center z-10">
        <motion.div
          animate={{ y: isDragActive ? -10 : 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
          className="mb-4 p-4 rounded-full bg-primary/10 text-primary"
        >
          {isDragReject ? (
            <FileType2 className="w-10 h-10 text-destructive" />
          ) : (
            <UploadCloud className="w-10 h-10" />
          )}
        </motion.div>
        
        <h3 className="text-xl font-semibold mb-2">
          {isDragActive ? "Drop PDF here" : "Upload a PDF document"}
        </h3>
        
        <p className="text-sm text-muted-foreground max-w-sm">
          {isDragReject 
            ? "Only PDF files are supported" 
            : "Drag and drop your file here, or click to browse. OpenDataLoader will extract structured content."}
        </p>
      </div>

      {/* Decorative background glow */}
      <div className="absolute inset-0 bg-gradient-to-t from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
    </motion.div>
  );
}
