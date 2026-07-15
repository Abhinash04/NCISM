import { BrowserRouter, Routes, Route, Navigate, useLocation, useParams } from 'react-router-dom';
import { ThemeProvider } from 'next-themes';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/sonner';
import { importLegacyLocalStorage } from '@/lib/db/documents.repository';

import { LandingLayout } from '@/app/layouts/LandingLayout';
import { DashboardLayout } from '@/app/layouts/DashboardLayout';

import { AuthProvider } from '@/features/auth/AuthContext';
import { ProtectedRoute } from '@/features/auth/ProtectedRoute';

import { Landing } from '@/pages/Landing';
import { Login } from '@/pages/Login';
import { Forbidden } from '@/pages/Forbidden';
import { Dashboard } from '@/pages/Dashboard';
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
import { UploadProcessing } from '@/pages/documents/UploadProcessing';

// Legacy-route shims: preserve deep links into the retired 3-panel workspace.
function WorkspaceNewRedirect() {
  const location = useLocation();
  return <Navigate to="/documents/new" replace state={location.state} />;
}
function WorkspaceRedirect() {
  const { documentId } = useParams();
  return <Navigate to={`/documents/${documentId}`} replace />;
}

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
          <AuthProvider>
          <Routes>
            {/* Public */}
            <Route element={<LandingLayout />}>
              <Route path="/" element={<Landing />} />
            </Route>
            <Route path="/login" element={<Login />} />
            <Route path="/403" element={<Forbidden />} />

            {/* Authenticated dashboard shell */}
            <Route element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/about" element={<About />} />

              {/* Page-based document workflow */}
              <Route path="/documents" element={<DocumentsList />} />
              <Route path="/documents/new" element={<UploadProcessing />} />
              <Route path="/documents/:documentId" element={<DocumentDetails />} />
              <Route path="/documents/:documentId/pdf" element={<PdfPage />} />
              <Route path="/documents/:documentId/text" element={<ExtractedTextPage />} />
              <Route path="/documents/:documentId/structure" element={<StructurePage />} />
              <Route path="/documents/:documentId/metadata" element={<MetadataPage />} />
              <Route path="/documents/:documentId/pipeline" element={<PipelinePage />} />
              <Route path="/documents/:documentId/report" element={<ReportPage />} />
            </Route>

            {/* Legacy redirects */}
            <Route path="/history" element={<Navigate to="/documents" replace />} />
            <Route path="/workspace/new" element={<WorkspaceNewRedirect />} />
            <Route path="/workspace/:documentId" element={<WorkspaceRedirect />} />

            <Route path="*" element={<NotFound />} />
          </Routes>
          </AuthProvider>
        </BrowserRouter>
        <Toaster position="bottom-right" richColors />
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
