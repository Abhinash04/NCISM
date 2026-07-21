import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useParams } from 'react-router-dom';
import { ThemeProvider } from 'next-themes';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { Toaster } from '@/components/ui/sonner';
import { importLegacyLocalStorage } from '@/lib/db/documents.repository';

import { DashboardLayout } from '@/app/layouts/DashboardLayout';
import { RoleLayout } from '@/app/layouts/RoleLayout';

import { AuthProvider, useAuth } from '@/features/auth/AuthContext';
import { ProtectedRoute } from '@/features/auth/ProtectedRoute';

// Light shell/entry pages stay in the main bundle (no spinner on core nav).
import { LandingPage } from '@/features/landing/LandingPage';
import { LoginPage } from '@/features/auth/LoginPage';
import { RegisterPage } from '@/features/auth/RegisterPage';
import { Forbidden } from '@/pages/Forbidden';
import { RoleDashboard } from '@/pages/dashboard/RoleDashboard';
import { Profile } from '@/pages/Profile';
import { Settings } from '@/pages/Settings';
import { About } from '@/pages/About';
import { NotFound } from '@/pages/NotFound';
import { InstitutionsList } from '@/pages/institutions/InstitutionsList';
import { ApplicationsList } from '@/pages/applications/ApplicationsList';

// Heavy routes (pdf viewer, markdown/report rendering, admin, reports, meetings)
// are code-split so they don't weigh down the initial bundle. `lazy` needs a
// default export, so map the named export through.
const named = (loader, name) => lazy(() => loader().then((m) => ({ default: m[name] })));

const InstitutionDetail = named(() => import('@/pages/institutions/InstitutionDetail'), 'InstitutionDetail');
const InstitutionImport = named(() => import('@/pages/institutions/InstitutionImport'), 'InstitutionImport');
const UsersList = named(() => import('@/pages/admin/UsersList'), 'UsersList');
const UserDetail = named(() => import('@/pages/admin/UserDetail'), 'UserDetail');
const RolesList = named(() => import('@/pages/admin/RolesList'), 'RolesList');
const PermissionsList = named(() => import('@/pages/admin/PermissionsList'), 'PermissionsList');
const AdminOverview = named(() => import('@/pages/admin/AdminOverview'), 'AdminOverview');
const RulesetsList = named(() => import('@/pages/admin/RulesetsList'), 'RulesetsList');
const ApplicationUpload = named(() => import('@/pages/applications/ApplicationUpload'), 'ApplicationUpload');
const ApplicationDetail = named(() => import('@/pages/applications/ApplicationDetail'), 'ApplicationDetail');
const MeetingsList = named(() => import('@/pages/meetings/MeetingsList'), 'MeetingsList');
const MeetingDetail = named(() => import('@/pages/meetings/MeetingDetail'), 'MeetingDetail');
const AuditLog = named(() => import('@/pages/audit/AuditLog'), 'AuditLog');
const ComplianceQueue = named(() => import('@/pages/compliance/ComplianceQueue'), 'ComplianceQueue');
const Reports = named(() => import('@/pages/reports/Reports'), 'Reports');

const DocumentsList = named(() => import('@/pages/documents/DocumentsList'), 'DocumentsList');
const DocumentDetails = named(() => import('@/pages/documents/DocumentDetails'), 'DocumentDetails');
const PdfPage = named(() => import('@/pages/documents/PdfPage'), 'PdfPage');
const ExtractedTextPage = named(() => import('@/pages/documents/ExtractedTextPage'), 'ExtractedTextPage');
const StructurePage = named(() => import('@/pages/documents/StructurePage'), 'StructurePage');
const MetadataPage = named(() => import('@/pages/documents/MetadataPage'), 'MetadataPage');
const PipelinePage = named(() => import('@/pages/documents/PipelinePage'), 'PipelinePage');
const ReportPage = named(() => import('@/pages/documents/ReportPage'), 'ReportPage');
const UploadProcessing = named(() => import('@/pages/documents/UploadProcessing'), 'UploadProcessing');

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
          <Suspense fallback={(
            <div className="grid min-h-screen place-items-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}>
          <Routes>
            {/* Public */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/403" element={<Forbidden />} />

            {/* Role-scoped portal: /:role/dashboard etc. RoleLayout validates the segment. */}
            <Route path="/:role" element={<ProtectedRoute><RoleLayout /></ProtectedRoute>}>
              <Route index element={<Navigate to="dashboard" replace />} />
              <Route path="dashboard" element={<RoleDashboard />} />
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
              <Route path="reports" element={<Reports />} />
            </Route>

            {/* Admin console (admin-only) */}
            <Route path="/admin" element={<ProtectedRoute roles={['admin']}><DashboardLayout /></ProtectedRoute>}>
              <Route index element={<AdminOverview />} />
              <Route path="institutions" element={<InstitutionsList />} />
              <Route path="institutions/import" element={<InstitutionImport />} />
              <Route path="institutions/:id" element={<InstitutionDetail />} />
              <Route path="users" element={<UsersList />} />
              <Route path="users/:userId" element={<UserDetail />} />
              <Route path="roles" element={<RolesList />} />
              <Route path="permissions" element={<PermissionsList />} />
              <Route path="rulesets" element={<RulesetsList />} />
              <Route path="applications" element={<ApplicationsList />} />
              <Route path="applications/:id" element={<ApplicationDetail />} />
              <Route path="audit" element={<AuditLog />} />
              <Route path="compliance" element={<ComplianceQueue />} />
              <Route path="reports" element={<Reports />} />
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
          </Suspense>
          </AuthProvider>
        </BrowserRouter>
        <Toaster position="bottom-right" richColors />
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
