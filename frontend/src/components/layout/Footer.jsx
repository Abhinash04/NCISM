import { Link } from 'react-router-dom';

export function Footer() {
  return (
    <footer id="contact" className="w-full bg-card pt-16 pb-8 px-4 md:px-8">
      <div className="max-w-[1200px] mx-auto space-y-12">

        {/* Top 4-column row */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 md:gap-12 text-left">

          {/* Brand Col */}
          <div className="space-y-3">
            <span className="font-serif text-[20px] font-normal text-foreground tracking-wide select-none">
              NCISM
            </span>
            <p className="font-sans text-sm text-muted-foreground leading-relaxed max-w-[240px]">
              National Commission for Indian System of Medicine
            </p>
          </div>

          {/* Product Links */}
          <div className="space-y-4">
            <h4 className="font-sans text-[13px] font-medium text-foreground uppercase tracking-wider">
              Product
            </h4>
            <div className="flex flex-col gap-2.5 font-sans text-sm text-muted-foreground">
              <Link to="/dashboard" className="hover:text-foreground hover:underline transition-colors duration-150">
                Dashboard
              </Link>
              <Link to="/documents" className="hover:text-foreground hover:underline transition-colors duration-150">
                Documents
              </Link>
              <Link to="/dashboard" className="hover:text-foreground hover:underline transition-colors duration-150">
                Assessments
              </Link>
              <Link to="/dashboard" className="hover:text-foreground hover:underline transition-colors duration-150">
                Reports
              </Link>
            </div>
          </div>

          {/* Resources Links */}
          <div className="space-y-4">
            <h4 className="font-sans text-[13px] font-medium text-foreground uppercase tracking-wider">
              Resources
            </h4>
            <div className="flex flex-col gap-2.5 font-sans text-sm text-muted-foreground">
              <a href="#features" className="hover:text-foreground hover:underline transition-colors duration-150">
                MESAR Regulations
              </a>
              <a href="#features" className="hover:text-foreground hover:underline transition-colors duration-150">
                NCISM Act 2020
              </a>
              <a href="#contact" className="hover:text-foreground hover:underline transition-colors duration-150">
                Help Center
              </a>
            </div>
          </div>

          {/* Contact Col */}
          <div className="space-y-4">
            <h4 className="font-sans text-[13px] font-medium text-foreground uppercase tracking-wider">
              Contact
            </h4>
            <div className="flex flex-col gap-2.5 font-sans text-sm text-muted-foreground">
              <a href="mailto:support@ncism.gov.in" className="hover:text-foreground hover:underline transition-colors duration-150">
                support@ncism.gov.in
              </a>
              <span className="select-none">New Delhi, India</span>
            </div>
          </div>

        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-6 border-t border-border flex flex-col md:flex-row items-center justify-between gap-4 font-sans text-xs text-muted-foreground">
          <span>
            © 2026 NCISM. All rights reserved.
          </span>
          <div className="flex items-center gap-6">
            <a href="#privacy" className="hover:text-foreground hover:underline transition-colors">
              Privacy Policy
            </a>
            <a href="#terms" className="hover:text-foreground hover:underline transition-colors">
              Terms of Service
            </a>
          </div>
        </div>

      </div>
    </footer>
  );
}
