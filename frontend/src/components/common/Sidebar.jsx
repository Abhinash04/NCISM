import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FileText, ChevronsRight, LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

const STORAGE_KEY = 'ncism.sidebar.collapsed';

/**
 * Collapsible desktop sidebar for the dashboard shell. Driven by the caller's
 * role nav data (same `{ name, path, icon }` shape DashboardLayout builds from
 * NAV_BY_ROLE). Animates between a full 16rem panel and an icon-only rail, and
 * remembers the open/closed choice in localStorage.
 */
export function Sidebar({ navItems, user, roleLabel, onLogout }) {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem(STORAGE_KEY) === 'true'; } catch { return false; }
  });

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, String(collapsed)); } catch { /* ignore */ }
  }, [collapsed]);

  const open = !collapsed;

  return (
    <motion.nav
      layout
      className="relative hidden shrink-0 flex-col border-r bg-muted/20 md:flex"
      style={{ width: open ? 256 : 72 }}
    >
      <TitleSection open={open} roleLabel={roleLabel} />

      <div className="flex-1 overflow-y-auto overflow-x-hidden px-3 py-4">
        <div className="space-y-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path
              || location.pathname.startsWith(`${item.path}/`);
            return <Option key={item.path} item={item} isActive={isActive} open={open} />;
          })}
        </div>
      </div>

      {user && <UserFooter open={open} user={user} roleLabel={roleLabel} onLogout={onLogout} />}
      <ToggleClose open={open} onToggle={() => setCollapsed((v) => !v)} />
    </motion.nav>
  );
}

function Option({ item, isActive, open }) {
  const Icon = item.icon;
  return (
    <Link
      to={item.path}
      title={item.name}
      className={cn(
        'relative flex h-10 items-center rounded-md text-sm font-medium transition-colors',
        isActive ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted hover:text-foreground',
      )}
    >
      <span className="grid h-full w-[46px] shrink-0 place-content-center">
        <Icon className="h-4 w-4" />
      </span>
      {open && (
        <motion.span
          layout
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="truncate pr-3"
        >
          {item.name}
        </motion.span>
      )}
    </Link>
  );
}

function TitleSection({ open, roleLabel }) {
  return (
    <div className="flex h-16 items-center border-b px-4 shrink-0">
      <span className="grid h-9 w-[38px] shrink-0 place-content-center">
        <FileText className="h-5 w-5 text-primary" />
      </span>
      {open && (
        <motion.div
          layout
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="min-w-0 leading-tight"
        >
          <div className="flex items-center gap-1.5 text-lg tracking-tight">
            <span className="font-display font-semibold text-primary">NCISM</span>
            <span className="text-sm font-medium text-muted-foreground">Platform</span>
          </div>
          {roleLabel && <div className="truncate text-xs capitalize text-muted-foreground">{roleLabel}</div>}
        </motion.div>
      )}
    </div>
  );
}

function UserFooter({ open, user, roleLabel, onLogout }) {
  return (
    <div className="border-t bg-muted/10 p-2">
      <div className="flex items-center">
        {open && (
          <motion.div
            layout
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="min-w-0 flex-1 px-2 leading-tight"
          >
            <div className="truncate text-sm font-medium">{user.name}</div>
            <div className="truncate text-xs capitalize text-muted-foreground">{roleLabel}</div>
          </motion.div>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={onLogout}
          title="Sign out"
          className={cn(!open && 'mx-auto')}
        >
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function ToggleClose({ open, onToggle }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      title={open ? 'Collapse' : 'Expand'}
      className="flex h-11 items-center border-t text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
    >
      <span className="grid h-full w-[46px] shrink-0 place-content-center">
        <ChevronsRight className={cn('h-4 w-4 transition-transform', open && 'rotate-180')} />
      </span>
      {open && (
        <motion.span
          layout
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="text-sm font-medium"
        >
          Collapse
        </motion.span>
      )}
    </button>
  );
}
