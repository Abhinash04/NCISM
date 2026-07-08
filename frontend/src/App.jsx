import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from 'next-themes';
import { Toaster } from '@/components/ui/sonner';

import { LandingLayout } from '@/components/layout/LandingLayout';
import { DashboardLayout } from '@/components/layout/DashboardLayout';

import { Landing } from '@/pages/Landing';
import { Dashboard } from '@/pages/Dashboard';
import { Workspace } from '@/pages/Workspace';
import { History } from '@/pages/History';
import { Settings } from '@/pages/Settings';
import { About } from '@/pages/About';

function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <BrowserRouter>
        <Routes>
          {/* Public Landing Page */}
          <Route element={<LandingLayout />}>
            <Route path="/" element={<Landing />} />
          </Route>

          {/* Authenticated Dashboard Shell */}
          <Route element={<DashboardLayout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/history" element={<History />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/about" element={<About />} />
          </Route>

          {/* Fullscreen Workspace (Studio Mode) */}
          <Route path="/workspace/new" element={<Workspace />} />
          <Route path="/workspace/:documentId" element={<Workspace />} />
        </Routes>
      </BrowserRouter>
      <Toaster position="bottom-right" richColors />
    </ThemeProvider>
  );
}

export default App;
