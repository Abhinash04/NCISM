import { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { ThemeToggle } from '@/components/common/ThemeToggle';
import { StatusBadge } from '@/components/common/StatusBadge';
import { Home, Settings, FileText, LogOut, Building2, Upload, Users, Shield, KeyRound, FileStack, Gavel, ScrollText, ClipboardCheck, BarChart3, Layers } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/features/auth/AuthContext';
import { AnimatedHamburgerButton } from '@/components/ui/AnimatedHamburgerButton';
import { Sidebar } from '@/components/common/Sidebar';

export function DashboardLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const auth = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Admin lives under /admin/*; every other role under its own /:role/* subtree.
  const role = auth.primaryRole;
  const NAV_BY_ROLE = {
    admin: [
      { name: 'Institutions', path: '/admin/institutions', icon: Building2 },
      { name: 'Import', path: '/admin/institutions/import', icon: Upload },
      { name: 'Users', path: '/admin/users', icon: Users },
      { name: 'Roles', path: '/admin/roles', icon: Shield },
      { name: 'Permissions', path: '/admin/permissions', icon: KeyRound },
      { name: 'Rulesets', path: '/admin/rulesets', icon: Layers },
      { name: 'Cases', path: '/admin/applications', icon: FileStack },
      { name: 'Compliance', path: '/admin/compliance', icon: ClipboardCheck, perm: 'compliance:read' },
      { name: 'Reports', path: '/admin/reports', icon: BarChart3, perm: 'report:read' },
      { name: 'Audit', path: '/admin/audit', icon: ScrollText },
    ],
    // Visitor: upload + track own cases only.
    visitor: [
      { name: 'Dashboard', path: '/visitor/dashboard', icon: Home },
      { name: 'My Uploads', path: '/visitor/applications', icon: FileStack },
      { name: 'Settings', path: '/visitor/settings', icon: Settings },
    ],
    // Junior (dealing staff): allotted cases + compliance ledger. No upload.
    junior_consultant: [
      { name: 'Dashboard', path: '/junior_consultant/dashboard', icon: Home },
      { name: 'Cases', path: '/junior_consultant/applications', icon: FileStack },
      { name: 'Compliance', path: '/junior_consultant/compliance', icon: ClipboardCheck, perm: 'compliance:read' },
      { name: 'Settings', path: '/junior_consultant/settings', icon: Settings },
    ],
    // Senior: review queue for supervised juniors + read compliance.
    senior_consultant: [
      { name: 'Dashboard', path: '/senior_consultant/dashboard', icon: Home },
      { name: 'Review Queue', path: '/senior_consultant/applications', icon: FileStack },
      { name: 'Compliance', path: '/senior_consultant/compliance', icon: ClipboardCheck, perm: 'compliance:read' },
      { name: 'Settings', path: '/senior_consultant/settings', icon: Settings },
    ],
    // College is external: only their own cases + settings (no registry access).
    college: [
      { name: 'Dashboard', path: '/college/dashboard', icon: Home },
      { name: 'My Cases', path: '/college/applications', icon: FileStack },
      { name: 'Settings', path: '/college/settings', icon: Settings },
    ],
    secretariat: [
      { name: 'Dashboard', path: '/secretariat/dashboard', icon: Home },
      { name: 'Meetings', path: '/secretariat/meetings', icon: Gavel },
      { name: 'Cases', path: '/secretariat/applications', icon: FileStack },
      { name: 'Reports', path: '/secretariat/reports', icon: BarChart3, perm: 'report:read' },
      { name: 'Settings', path: '/secretariat/settings', icon: Settings },
    ],
    hearing_committee: [
      { name: 'Dashboard', path: '/hearing_committee/dashboard', icon: Home },
      { name: 'Hearings', path: '/hearing_committee/applications', icon: Gavel },
      { name: 'Settings', path: '/hearing_committee/settings', icon: Settings },
    ],
    commission_observer: [
      { name: 'Dashboard', path: '/commission_observer/dashboard', icon: Home },
      { name: 'Cases', path: '/commission_observer/applications', icon: FileStack },
      { name: 'Meetings', path: '/commission_observer/meetings', icon: Gavel },
      { name: 'Compliance', path: '/commission_observer/compliance', icon: ClipboardCheck, perm: 'compliance:read' },
      { name: 'Reports', path: '/commission_observer/reports', icon: BarChart3, perm: 'report:read' },
      { name: 'Audit', path: '/commission_observer/audit', icon: ScrollText },
      { name: 'Settings', path: '/commission_observer/settings', icon: Settings },
    ],
    board_member: [
      { name: 'Dashboard', path: '/board_member/dashboard', icon: Home },
      { name: 'Cases', path: '/board_member/applications', icon: FileStack },
      { name: 'Meetings', path: '/board_member/meetings', icon: Gavel },
      { name: 'Institutions', path: '/board_member/institutions', icon: Building2 },
      { name: 'Compliance', path: '/board_member/compliance', icon: ClipboardCheck, perm: 'compliance:read' },
      { name: 'Reports', path: '/board_member/reports', icon: BarChart3, perm: 'report:read' },
      { name: 'Audit', path: '/board_member/audit', icon: ScrollText },
      { name: 'Settings', path: '/board_member/settings', icon: Settings },
    ],
    president: [
      { name: 'Dashboard', path: '/president/dashboard', icon: Home },
      { name: 'Cases', path: '/president/applications', icon: FileStack },
      { name: 'Meetings', path: '/president/meetings', icon: Gavel },
      { name: 'Institutions', path: '/president/institutions', icon: Building2 },
      { name: 'Compliance', path: '/president/compliance', icon: ClipboardCheck, perm: 'compliance:read' },
      { name: 'Reports', path: '/president/reports', icon: BarChart3, perm: 'report:read' },
      { name: 'Audit', path: '/president/audit', icon: ScrollText },
      { name: 'Settings', path: '/president/settings', icon: Settings },
    ],
  };
  // Fallback for any role without an explicit portal (e.g. retired reviewer/analyst/viewer).
  const navItems = (NAV_BY_ROLE[role] || [
    { name: 'Dashboard', path: `/${role}/dashboard`, icon: Home },
    { name: 'Applications', path: `/${role}/applications`, icon: FileStack },
    { name: 'Settings', path: `/${role}/settings`, icon: Settings },
    // `perm` (optional) hides an item unless the user holds that permission.
  ]).filter((i) => !i.perm || auth.hasPermission(i.perm));

  async function onLogout() {
    await auth.logout();
    navigate('/login', { replace: true });
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background font-sans">
      {/* Mobile Sidebar Overlay/Drawer */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.4 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileMenuOpen(false)}
              className="fixed inset-0 bg-black/40 z-40 md:hidden"
            />
            {/* Slide-out Menu Panel */}
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 left-0 bottom-0 w-72 bg-background border-r z-50 md:hidden flex flex-col shadow-xl"
            >
              {/* Header inside mobile menu */}
              <div className="h-16 flex items-center justify-between px-6 border-b shrink-0 bg-muted/10">
                <div className="flex items-center gap-2 text-lg tracking-tight">
                  <FileText className="w-5 h-5 text-primary" />
                  <span className="text-primary font-display font-semibold">NCISM</span>
                  <span className="text-muted-foreground text-sm font-medium">Platform</span>
                </div>
                <div className="-mr-2">
                  <AnimatedHamburgerButton active={mobileMenuOpen} setActive={setMobileMenuOpen} />
                </div>
              </div>

              {/* Navigation Links */}
              <div className="flex-1 overflow-y-auto py-6 px-4">
                <nav className="space-y-1">
                  {navItems.map((item) => {
                    const isActive = location.pathname === item.path
                      || location.pathname.startsWith(`${item.path}/`);
                    return (
                      <Link
                        key={item.path}
                        to={item.path}
                        onClick={() => setMobileMenuOpen(false)}
                        className={cn(
                          "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                          isActive
                            ? "bg-primary/10 text-primary"
                            : "text-muted-foreground hover:bg-muted hover:text-foreground"
                        )}
                      >
                        <item.icon className={cn("w-4 h-4", isActive ? "text-primary" : "text-muted-foreground")} />
                        {item.name}
                      </Link>
                    );
                  })}
                </nav>
              </div>

              {/* Footer inside mobile menu */}
              {auth.user && (
                <div className="p-4 border-t bg-muted/10">
                  <div className="flex items-center justify-between">
                    <div className="leading-tight">
                      <div className="text-sm font-medium">{auth.user.name}</div>
                      <div className="text-xs text-muted-foreground capitalize">{auth.roles.join(', ')}</div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => { setMobileMenuOpen(false); onLogout(); }} title="Sign out">
                      <LogOut className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Sidebar (desktop) — collapsible, driven by the role nav data */}
      <Sidebar
        navItems={navItems}
        user={auth.user}
        roleLabel={auth.roles.join(', ')}
        onLogout={onLogout}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Topbar */}
        {(
          <header className="h-16 border-b bg-background flex items-center justify-between px-6 shrink-0 z-10 print-hide">
            <div className="flex items-center gap-4">
              <div className="md:hidden -ml-2">
                <AnimatedHamburgerButton active={mobileMenuOpen} setActive={setMobileMenuOpen} />
              </div>
              <h2 className="text-lg font-semibold tracking-tight capitalize">
                {location.pathname.split('/')[1] || 'Dashboard'}
              </h2>
            </div>
            <div className="flex items-center gap-4">
              <StatusBadge />
              <ThemeToggle />
              {auth.user && (
                <div className="flex items-center gap-3 pl-3 border-l">
                  <div className="text-right leading-tight hidden sm:block">
                    <div className="text-sm font-medium">{auth.user.name}</div>
                    <div className="text-xs text-muted-foreground capitalize">{auth.roles.join(', ')}</div>
                  </div>
                  <Button variant="ghost" size="icon" onClick={onLogout} title="Sign out">
                    <LogOut className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>
          </header>
        )}

        {/* Page Content */}
        <main className="flex-1 overflow-auto bg-muted/5 relative">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="h-full"
          >
            <Outlet />
          </motion.div>
        </main>
      </div>
    </div>
  );
}
