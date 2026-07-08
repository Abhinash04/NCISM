import { Outlet } from 'react-router-dom';
import { ThemeToggle } from '@/components/common/ThemeToggle';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

export function LandingLayout() {
  return (
    <div className="min-h-screen bg-background flex flex-col font-sans">
      <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center mx-auto px-4">
          <div className="flex items-center gap-2 font-bold text-xl tracking-tight mr-4">
            <span className="text-primary">OpenDataLoader</span>
            <span className="text-muted-foreground">PDF</span>
          </div>
          <div className="flex flex-1 items-center justify-between space-x-2 md:justify-end">
            <nav className="flex items-center space-x-6 text-sm font-medium">
              <Link to="/" className="transition-colors hover:text-foreground/80 text-foreground">Product</Link>
              <Link to="/about" className="transition-colors hover:text-foreground/80 text-foreground/60">About</Link>
              <Link to="/dashboard" className="transition-colors hover:text-foreground/80 text-foreground/60">Dashboard</Link>
            </nav>
            <div className="flex items-center gap-4 ml-6 pl-6 border-l">
              <ThemeToggle />
            </div>
          </div>
        </div>
      </header>
      
      <main className="flex-1 flex flex-col">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.3 }}
          className="flex-1 flex flex-col"
        >
          <Outlet />
        </motion.div>
      </main>

      <footer className="border-t py-6 md:py-0">
        <div className="container flex flex-col items-center justify-between gap-4 md:h-16 md:flex-row mx-auto px-4">
          <p className="text-center text-sm leading-loose text-muted-foreground md:text-left">
            Built for enterprise-grade PDF understanding.
          </p>
        </div>
      </footer>
    </div>
  );
}
