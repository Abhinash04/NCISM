import { useRef, useState } from 'react';
import { CloudUpload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ACCEPTED_EXTENSIONS } from '@/lib/fileValidation';

export function FileDropZone({ onFilesSelected }) {
  const inputRef = useRef(null);
  const [dragActive, setDragActive] = useState(false);

  const handleDrop = (event) => {
    event.preventDefault();
    setDragActive(false);
    if (event.dataTransfer.files?.length) {
      onFilesSelected(event.dataTransfer.files);
    }
  };

  const handleBrowse = (event) => {
    if (event.target.files?.length) {
      onFilesSelected(event.target.files);
      event.target.value = '';
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label="Upload PDF documents"
      onClick={() => inputRef.current?.click()}
      onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
      onDragOver={(e) => {
        e.preventDefault();
        setDragActive(true);
      }}
      onDragLeave={() => setDragActive(false)}
      onDrop={handleDrop}
      className={cn(
        'flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-10 text-center transition-colors',
        dragActive
          ? 'border-primary bg-primary/5'
          : 'border-border bg-card hover:border-primary/50 hover:bg-accent/50',
      )}
    >
      <div className="rounded-full bg-primary/10 p-3">
        <CloudUpload className="size-7 text-primary" />
      </div>
      <div>
        <p className="font-medium">Drag &amp; drop visitation documents here</p>
        <p className="text-sm text-muted-foreground">
          PDF, DOCX or XLSX · multiple files supported
        </p>
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={(e) => {
          e.stopPropagation();
          inputRef.current?.click();
        }}
      >
        Browse files
      </Button>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_EXTENSIONS}
        multiple
        className="hidden"
        onChange={handleBrowse}
      />
    </div>
  );
}
