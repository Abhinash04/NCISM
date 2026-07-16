import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { ThemeToggle } from '@/components/common/ThemeToggle';
import { StatusBadge } from '@/components/common/StatusBadge';
import { Home, Settings, FileText, Info, LogOut, Building2, Upload, Users, Shield, KeyRound } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/features/auth/AuthContext';

export function DashboardLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const auth = useAuth();

  // Admin lives under /admin/*; every other role under its own /:role/* subtree.
  const role = auth.primaryRole;
  const navItems = role === 'admin'
    ? [
      { name: 'Institutions', path: '/admin/institutions', icon: Building2 },
      { name: 'Import', path: '/admin/institutions/import', icon: Upload },
      { name: 'Users', path: '/admin/users', icon: Users },
      { name: 'Roles', path: '/admin/roles', icon: Shield },
      { name: 'Permissions', path: '/admin/permissions', icon: KeyRound },
      { name: 'Documents', path: '/documents', icon: FileText },
    ]
    : [
      { name: 'Dashboard', path: `/${role}/dashboard`, icon: Home },
      { name: 'Institutions', path: `/${role}/institutions`, icon: Building2 },
      { name: 'Documents', path: '/documents', icon: FileText },
      { name: 'Settings', path: `/${role}/settings`, icon: Settings },
      { name: 'About', path: `/${role}/about`, icon: Info },
    ];

  async function onLogout() {
    await auth.logout();
    navigate('/login', { replace: true });
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background font-sans">
      {/* Sidebar */}
      <aside className="w-64 border-r bg-muted/20 hidden md:flex flex-col">
        <div className="h-16 flex items-center px-6 border-b shrink-0">
          <div className="flex items-center gap-2 text-lg tracking-tight">
            <FileText className="w-5 h-5 text-primary" />
            <span className="text-primary font-display font-semibold">NCISM</span>
            <span className="text-muted-foreground text-sm font-medium">Platform</span>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto py-6 px-4">
          <nav className="space-y-1">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path
                || location.pathname.startsWith(`${item.path}/`);
              return (
                <Link
                  key={item.path}
                  to={item.path}
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
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Topbar */}
        {(
          <header className="h-16 border-b bg-background flex items-center justify-between px-6 shrink-0 z-10 print-hide">
            <div className="flex items-center gap-4">
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
