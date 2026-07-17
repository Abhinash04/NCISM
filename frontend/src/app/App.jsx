import { BrowserRouter, Routes, Route, Navigate, useLocation, useParams } from 'react-router-dom';
import { ThemeProvider } from 'next-themes';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/sonner';
import { importLegacyLocalStorage } from '@/lib/db/documents.repository';

import { LandingLayout } from '@/app/layouts/LandingLayout';
import { DashboardLayout } from '@/app/layouts/DashboardLayout';
import { RoleLayout } from '@/app/layouts/RoleLayout';

import { AuthProvider, useAuth } from '@/features/auth/AuthContext';
import { ProtectedRoute } from '@/features/auth/ProtectedRoute';

import { Landing } from '@/pages/Landing';
import { Login } from '@/pages/Login';
import { Forbidden } from '@/pages/Forbidden';
import { Dashboard } from '@/pages/Dashboard';
import { Profile } from '@/pages/Profile';
import { Settings } from '@/pages/Settings';
import { About } from '@/pages/About';
import { NotFound } from '@/pages/NotFound';

import { InstitutionsList } from '@/pages/institutions/InstitutionsList';
import { InstitutionDetail } from '@/pages/institutions/InstitutionDetail';
import { InstitutionImport } from '@/pages/institutions/InstitutionImport';
import { UsersList } from '@/pages/admin/UsersList';
import { UserDetail } from '@/pages/admin/UserDetail';
import { RolesList } from '@/pages/admin/RolesList';
import { PermissionsList } from '@/pages/admin/PermissionsList';
import { ApplicationsList } from '@/pages/applications/ApplicationsList';
import { ApplicationUpload } from '@/pages/applications/ApplicationUpload';
import { ApplicationDetail } from '@/pages/applications/ApplicationDetail';
import { MeetingsList } from '@/pages/meetings/MeetingsList';
import { MeetingDetail } from '@/pages/meetings/MeetingDetail';
import { AuditLog } from '@/pages/audit/AuditLog';
import { ComplianceQueue } from '@/pages/compliance/ComplianceQueue';

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

// `/dashboard` (and legacy flat paths) redirect to the role-scoped landing.
// Admin has no /:role subtree — it lands in the admin console instead.
function RoleDashboardRedirect() {
  const auth = useAuth();
  if (auth.primaryRole === 'admin') return <Navigate to="/admin/users" replace />;
  return <Navigate to={`/${auth.primaryRole}/dashboard`} replace />;
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

            {/* Role-scoped portal: /:role/dashboard etc. RoleLayout validates the segment. */}
            <Route path="/:role" element={<ProtectedRoute><RoleLayout /></ProtectedRoute>}>
              <Route index element={<Navigate to="dashboard" replace />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="profile" element={<Profile />} />
              <Route path="settings" element={<Settings />} />
              <Route path="about" element={<About />} />
              <Route path="institutions" element={<InstitutionsList />} />
              <Route path="institutions/:id" element={<InstitutionDetail />} />
              <Route path="applications" element={<ApplicationsList />} />
              <Route path="applications/new" element={<ApplicationUpload />} />
              <Route path="applications/:id" element={<ApplicationDetail />} />
              <Route path="meetings" element={<MeetingsList />} />
              <Route path="meetings/:id" element={<MeetingDetail />} />
              <Route path="audit" element={<AuditLog />} />
              <Route path="compliance" element={<ComplianceQueue />} />
            </Route>

            {/* Admin console (admin-only) */}
            <Route path="/admin" element={<ProtectedRoute roles={['admin']}><DashboardLayout /></ProtectedRoute>}>
              <Route index element={<Navigate to="users" replace />} />
              <Route path="institutions" element={<InstitutionsList />} />
              <Route path="institutions/import" element={<InstitutionImport />} />
              <Route path="institutions/:id" element={<InstitutionDetail />} />
              <Route path="users" element={<UsersList />} />
              <Route path="users/:userId" element={<UserDetail />} />
              <Route path="roles" element={<RolesList />} />
              <Route path="permissions" element={<PermissionsList />} />
              <Route path="audit" element={<AuditLog />} />
              <Route path="compliance" element={<ComplianceQueue />} />
            </Route>

            {/* Post-login landing → role-scoped dashboard */}
            <Route path="/dashboard" element={<ProtectedRoute><RoleDashboardRedirect /></ProtectedRoute>} />

            {/* Shared dashboard shell for the legacy document workflow (all roles) */}
            <Route element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
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
