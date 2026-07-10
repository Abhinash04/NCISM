import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from 'next-themes';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/sonner';
import { importLegacyLocalStorage } from '@/lib/db/documents.repository';

import { LandingLayout } from '@/app/layouts/LandingLayout';
import { DashboardLayout } from '@/app/layouts/DashboardLayout';

import { Landing } from '@/pages/Landing';
import { Dashboard } from '@/pages/Dashboard';
import { Workspace } from '@/pages/Workspace';
import { History } from '@/pages/History';
import { Settings } from '@/pages/Settings';
import { About } from '@/pages/About';
import { NotFound } from '@/pages/NotFound';

import { DocumentsList } from '@/pages/documents/DocumentsList';
import { DocumentDetails } from '@/pages/documents/DocumentDetails';
import { PdfPage } from '@/pages/documents/PdfPage';
import { ExtractedTextPage } from '@/pages/documents/ExtractedTextPage';
import { StructurePage } from '@/pages/documents/StructurePage';
import { MetadataPage } from '@/pages/documents/MetadataPage';
import { PipelinePage } from '@/pages/documents/PipelinePage';
import { ReportPage } from '@/pages/documents/ReportPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { refetchOnWindowFocus: false },
  },
});

// One-time import of the pre-Dexie localStorage history.
importLegacyLocalStorage();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
        <BrowserRouter>
          <Routes>
            {/* Public Landing Page */}
            <Route element={<LandingLayout />}>
              <Route path="/" element={<Landing />} />
            </Route>

            {/* Dashboard Shell */}
            <Route element={<DashboardLayout />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/history" element={<History />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/about" element={<About />} />

              {/* Page-based document workflow */}
              <Route path="/documents" element={<DocumentsList />} />
              <Route path="/documents/:documentId" element={<DocumentDetails />} />
              <Route path="/documents/:documentId/pdf" element={<PdfPage />} />
              <Route path="/documents/:documentId/text" element={<ExtractedTextPage />} />
              <Route path="/documents/:documentId/structure" element={<StructurePage />} />
              <Route path="/documents/:documentId/metadata" element={<MetadataPage />} />
              <Route path="/documents/:documentId/pipeline" element={<PipelinePage />} />
              <Route path="/documents/:documentId/report" element={<ReportPage />} />
            </Route>

            {/* Fullscreen Workspace (legacy — removed after migration) */}
            <Route path="/workspace/new" element={<Workspace />} />
            <Route path="/workspace/:documentId" element={<Workspace />} />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
        <Toaster position="bottom-right" richColors />
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
