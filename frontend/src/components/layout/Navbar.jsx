import { ThemeToggle } from "@/components/common/ThemeToggle";
import { StatusBadge } from "@/components/common/StatusBadge";
import { FileText } from "lucide-react";

export function Navbar() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 max-w-screen-2xl items-center">
        <div className="flex items-center gap-2 mr-4">
          <FileText className="h-6 w-6 text-primary" />
          <span className="font-bold tracking-tight">OpenDataLoader PDF</span>
        </div>
        
        <div className="flex flex-1 items-center justify-between space-x-2 md:justify-end">
          <div className="flex items-center gap-4">
            <StatusBadge />
            <ThemeToggle />
          </div>
        </div>
      </div>
    </header>
  );
}
