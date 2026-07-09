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
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
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
            </Route>

            {/* Fullscreen Workspace (Studio Mode) */}
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
