import { Navbar } from "./Navbar";

export function MainLayout({ children }) {
  return (
    <div className="relative flex min-h-screen flex-col bg-background">
      <Navbar />
      <main className="flex-1">
        {children}
      </main>
    </div>
  );
}
