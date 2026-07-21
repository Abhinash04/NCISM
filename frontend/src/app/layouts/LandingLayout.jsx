import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { ThemeToggle } from '@/components/common/ThemeToggle';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { AnimatedHamburgerButton } from '@/components/ui/AnimatedHamburgerButton';

export function LandingLayout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background flex flex-col font-sans">
      {/* Mobile Drawer Overlay */}
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
            {/* Slide-out Menu */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 bottom-0 w-64 bg-background border-l z-50 md:hidden flex flex-col shadow-xl"
            >
              <div className="h-16 flex items-center justify-between px-6 border-b bg-muted/10">
                <div className="flex items-center gap-2 text-lg tracking-tight font-display font-semibold">
                  <span className="text-primary">NCISM</span>
                </div>
                <div className="-mr-2">
                  <AnimatedHamburgerButton active={mobileMenuOpen} setActive={setMobileMenuOpen} />
                </div>
              </div>
              <div className="flex-1 overflow-y-auto py-6 px-6">
                <nav className="flex flex-col space-y-4 text-base font-medium">
                  <Link to="/" onClick={() => setMobileMenuOpen(false)} className="transition-colors hover:text-foreground/80 text-foreground">Product</Link>
                  <Link to="/about" onClick={() => setMobileMenuOpen(false)} className="transition-colors hover:text-foreground/80 text-foreground/60">About</Link>
                  <Link to="/dashboard" onClick={() => setMobileMenuOpen(false)} className="transition-colors hover:text-foreground/80 text-foreground/60">Dashboard</Link>
                </nav>
                <div className="mt-8 pt-6 border-t flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Theme</span>
                  <ThemeToggle />
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center mx-auto px-4 justify-between">
          <div className="flex items-center gap-2 text-xl tracking-tight mr-4 font-display font-semibold">
            <span className="text-primary">NCISM</span>
            <span className="text-muted-foreground font-sans font-medium text-base hidden sm:inline">Assessment Platform</span>
          </div>

          <div className="flex items-center gap-4">
            {/* Desktop Nav */}
            <nav className="hidden md:flex items-center space-x-6 text-sm font-medium">
              <Link to="/" className="transition-colors hover:text-foreground/80 text-foreground">Product</Link>
              <Link to="/about" className="transition-colors hover:text-foreground/80 text-foreground/60">About</Link>
              <Link to="/dashboard" className="transition-colors hover:text-foreground/80 text-foreground/60">Dashboard</Link>
            </nav>
            <div className="hidden md:flex items-center gap-4 pl-6 border-l border-border">
              <ThemeToggle />
            </div>
            {/* Mobile Hamburger Button */}
            <div className="md:hidden">
              <AnimatedHamburgerButton active={mobileMenuOpen} setActive={setMobileMenuOpen} />
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
            Document assessment for the National Commission for Indian System of Medicine.
          </p>
        </div>
      </footer>
    </div>
  );
}
