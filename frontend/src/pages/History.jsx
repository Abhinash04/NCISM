import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDocuments } from '@/features/documents/hooks/useDocuments';
import { deleteDocument } from '@/lib/db/documents.repository';
import { formatDistanceToNow, format } from 'date-fns';
import { FileText, Search, MoreVertical, Trash2, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from '@/lib/utils';
import { formatBytes } from '@/lib/format';
import { motion } from 'framer-motion';

export function History() {
  const navigate = useNavigate();
  const documents = useDocuments();
  const [searchQuery, setSearchQuery] = useState('');

  const handleDelete = (id) => {
    deleteDocument(id); // live query refreshes the list automatically
  };

  const filteredDocs = documents.filter(doc => 
    doc.filename?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto flex flex-col h-full">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Extraction History</h1>
          <p className="text-muted-foreground mt-1">View and manage previously processed documents.</p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search documents..." 
            className="pl-9 bg-background"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="bg-background rounded-xl border shadow-sm flex-1 overflow-hidden flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted-foreground uppercase bg-muted/50 border-b">
              <tr>
                <th scope="col" className="px-6 py-4 font-medium">Document</th>
                <th scope="col" className="px-6 py-4 font-medium">Status</th>
                <th scope="col" className="px-6 py-4 font-medium">Size</th>
                <th scope="col" className="px-6 py-4 font-medium">Processed</th>
                <th scope="col" className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredDocs.length > 0 ? (
                filteredDocs.map((doc, idx) => (
                  <motion.tr 
                    key={doc.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="border-b last:border-0 hover:bg-muted/30 transition-colors"
                  >
                    <td className="px-6 py-4 font-medium text-foreground flex items-center gap-3">
                      <div className="p-2 bg-primary/10 rounded-md text-primary shrink-0">
                        <FileText className="h-4 w-4" />
                      </div>
                      <span className="truncate max-w-[200px] sm:max-w-[300px]" title={doc.filename}>{doc.filename}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn("px-2.5 py-1 text-xs font-medium rounded-full capitalize",
                        doc.status === 'completed' ? "bg-emerald-500/10 text-emerald-500" :
                        doc.status === 'failed' ? "bg-destructive/10 text-destructive" :
                        "bg-amber-500/10 text-amber-500"
                      )}>
                        {doc.status || 'processing'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">
                      {formatBytes(doc.size)}
                    </td>
                    <td className="px-6 py-4 text-muted-foreground whitespace-nowrap">
                      <div className="flex flex-col">
                        <span>{formatDistanceToNow(new Date(doc.createdAt), { addSuffix: true })}</span>
                        <span className="text-[10px] opacity-70">{format(new Date(doc.createdAt), 'MMM d, yyyy h:mm a')}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => navigate(`/workspace/${doc.id}`)}
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => navigate(`/workspace/${doc.id}`)}>
                              Open in Workspace
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              className="text-destructive focus:text-destructive focus:bg-destructive/10"
                              onClick={() => handleDelete(doc.id)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </td>
                  </motion.tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center text-muted-foreground">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <FileText className="h-8 w-8 opacity-20" />
                      <p>No documents found.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
