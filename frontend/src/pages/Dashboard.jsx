import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DragDropZone } from '@/components/upload/DragDropZone';
import { SystemHealthWidget } from '@/components/dashboard/SystemHealthWidget';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, Clock, FileCheck } from 'lucide-react';
import { StorageService } from '@/services/storage.service';
import { formatDistanceToNow } from 'date-fns';

export function Dashboard() {
  const navigate = useNavigate();
  const [documents] = useState(() => StorageService.getAllDocuments());

  const handleFileSelect = (file) => {
    // Navigate to new workspace upload flow, pass file in state or use a store
    // For now, let's just pass the file to a context or via state. 
    // Wait, react-router-dom state is good for this.
    navigate('/workspace/new', { state: { file } });
  };

  const completedDocs = documents.filter(d => d.status === 'completed');
  const avgProcessingTime = completedDocs.length > 0
    ? (completedDocs.reduce((acc, d) => acc + (d.processingTime || 0), 0) / completedDocs.length / 1000).toFixed(1)
    : 0;

  return (
    <div className="p-6 md:p-8 space-y-8 max-w-7xl mx-auto">
      
      {/* Header */}
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Command Center</h1>
        <p className="text-muted-foreground">Manage your documents, view processing queues, and monitor system health.</p>
      </div>

      {/* Stats Row */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Processed</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completedDocs.length}</div>
            <p className="text-xs text-muted-foreground">Documents extracted</p>
          </CardContent>
        </Card>
        
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Processing Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgProcessingTime}s</div>
            <p className="text-xs text-muted-foreground">Per document</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Supported Formats</CardTitle>
            <FileCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">1</div>
            <p className="text-xs text-muted-foreground">PDF only (for now)</p>
          </CardContent>
        </Card>

        {/* System Health Widget replaces 4th stat card */}
        <SystemHealthWidget />
      </div>

      {/* Main Grid */}
      <div className="grid gap-8 lg:grid-cols-3">
        
        {/* Quick Upload Zone */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-lg font-semibold">Quick Upload</h2>
          <Card className="shadow-sm overflow-hidden">
            <DragDropZone onFileSelect={handleFileSelect} />
          </Card>
        </div>

        {/* Recent Documents */}
        <div className="lg:col-span-1 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Recent Documents</h2>
          </div>
          <Card className="shadow-sm border-0 bg-transparent">
            <div className="space-y-4">
              {documents.slice(0, 5).map(doc => (
                <div 
                  key={doc.id}
                  onClick={() => navigate(`/workspace/${doc.id}`)}
                  className="flex items-center p-4 bg-background border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors shadow-sm"
                >
                  <div className="p-2 bg-primary/10 rounded-md mr-4 text-primary">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <h4 className="text-sm font-medium truncate">{doc.filename}</h4>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDistanceToNow(new Date(doc.createdAt), { addSuffix: true })}
                    </p>
                  </div>
                  <div className="text-xs font-medium px-2 py-1 bg-muted rounded-full ml-2">
                    {doc.status}
                  </div>
                </div>
              ))}
              
              {documents.length === 0 && (
                <div className="text-center p-8 border border-dashed rounded-lg bg-background">
                  <p className="text-sm text-muted-foreground">No documents processed yet.</p>
                </div>
              )}
            </div>
          </Card>
        </div>

      </div>
    </div>
  );
}
