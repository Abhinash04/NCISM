import { useRef } from 'react';
import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import { MarkdownRenderer } from '@/components/markdown/MarkdownRenderer';
import { downloadBlob } from '@/lib/download';

/**
 * Download a markdown document as Markdown / PDF / Word. PDF + DOCX are built
 * client-side from an offscreen render of the markdown (no backend needed).
 */
export function DownloadMenu({ filename, markdown, label = 'Download', size = 'sm' }) {
  const ref = useRef(null);
  if (!markdown) return null;

  const asMarkdown = () => downloadBlob(markdown, `${filename}.md`, 'text/markdown');

  const asPdf = async () => {
    if (!ref.current) return;
    const { default: html2pdf } = await import('html2pdf.js'); // heavy — load on demand
    html2pdf().set({
      margin: 12,
      filename: `${filename}.pdf`,
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'pt', format: 'a4', orientation: 'portrait' },
      pagebreak: { mode: ['css', 'legacy'] },
    }).from(ref.current).save();
  };

  const asDocx = async () => {
    const { markdownToDocxBlob } = await import('@/lib/markdown-docx'); // heavy — load on demand
    downloadBlob(await markdownToDocxBlob(markdown), `${filename}.docx`);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size={size}><Download className="h-4 w-4 mr-1" />{label}</Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={asPdf}>PDF (.pdf)</DropdownMenuItem>
          <DropdownMenuItem onClick={asDocx}>Word (.docx)</DropdownMenuItem>
          <DropdownMenuItem onClick={asMarkdown}>Markdown (.md)</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Offscreen source for the PDF/DOCX export (white background for print). */}
      <div
        aria-hidden
        ref={ref}
        className="fixed -left-[10000px] top-0 w-[760px] bg-white p-6 text-black prose prose-sm max-w-none"
      >
        <MarkdownRenderer markdown={markdown} />
      </div>
    </>
  );
}
