import { Link } from "react-router-dom";

export function Footer() {
  return (
    <footer
      id="contact"
      className="w-full bg-background pt-16 pb-8 px-4 md:px-8"
    >
      <div className="max-w-[1200px] mx-auto">
        {/* Bordered decorative card */}
        <div className="relative overflow-hidden bg-card border-2 border-foreground rounded-3xl shadow-[6px_6px_0px_hsl(var(--foreground))]">
          {/* Radial coral beams + faint grid overlay (decorative) */}
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute inset-0 opacity-70 [mask-image:radial-gradient(65%_65%_at_50%_50%,black,transparent)] bg-[radial-gradient(1200px_400px_at_50%_-10%,rgba(204,120,92,0.14),transparent),radial-gradient(1200px_600px_at_50%_120%,rgba(204,120,92,0.10),transparent)]" />
            <div className="absolute inset-0 [mask-image:radial-gradient(80%_80%_at_50%_50%,black,transparent)] bg-[linear-gradient(to_right,rgba(20,20,19,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(20,20,19,0.05)_1px,transparent_1px)] bg-[size:28px_28px]" />
          </div>

          {/* Content */}
          <div className="relative px-6 py-14 md:px-10 md:py-16">
            <div className="w-full">
              {/* Footer Top */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-12 pb-12 border-b border-border text-left">
                {/* Brand Column */}
                <div className="lg:col-span-2">
                  <div className="flex flex-col items-start">
                    <div className="flex items-center gap-1.5 mb-4">
                      <span className="font-serif text-[20px] font-normal text-foreground tracking-wide select-none">
                        NCISM
                      </span>
                      <span className="w-2 h-2 bg-primary rounded-full" />
                    </div>

                    <p className="font-sans leading-relaxed text-sm text-muted-foreground max-w-[260px] mb-6">
                      National Commission for Indian System of Medicine
                    </p>

                    {/* Social icons */}
                    <div className="flex items-center gap-3">
                      <a
                        href="#"
                        aria-label="Twitter"
                        className="flex items-center justify-center w-9 h-9 rounded-lg bg-secondary ring-1 ring-border text-muted-foreground transition hover:bg-accent hover:text-foreground"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="18"
                          height="18"
                          viewBox="0 0 24 24"
                          fill="currentColor"
                          aria-hidden="true"
                        >
                          <path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z" />
                        </svg>
                      </a>
                      <a
                        href="#"
                        aria-label="GitHub"
                        className="flex items-center justify-center w-9 h-9 rounded-lg bg-secondary ring-1 ring-border text-muted-foreground transition hover:bg-accent hover:text-foreground"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="18"
                          height="18"
                          viewBox="0 0 24 24"
                          fill="currentColor"
                          aria-hidden="true"
                        >
                          <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                        </svg>
                      </a>
                      <a
                        href="#"
                        aria-label="LinkedIn"
                        className="flex items-center justify-center w-9 h-9 rounded-lg bg-secondary ring-1 ring-border text-muted-foreground transition hover:bg-accent hover:text-foreground"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="18"
                          height="18"
                          viewBox="0 0 24 24"
                          fill="currentColor"
                          aria-hidden="true"
                        >
                          <path d="M4.98 3.5c0 1.381-1.11 2.5-2.48 2.5s-2.48-1.119-2.48-2.5c0-1.38 1.11-2.5 2.48-2.5s2.48 1.12 2.48 2.5zm.02 4.5h-5v16h5v-16zm7.982 0h-4.968v16h4.969v-8.399c0-4.67 6.029-5.052 6.029 0v8.399h4.988v-10.131c0-7.88-8.922-7.593-11.018-3.714v-2.155z" />
                        </svg>
                      </a>
                    </div>
                  </div>
                </div>

                {/* Product */}
                <div className="text-left">
                  <h4 className="font-sans text-[13px] font-medium text-foreground uppercase tracking-wider mb-4">
                    Product
                  </h4>
                  <ul className="flex flex-col gap-3 font-sans text-sm text-muted-foreground">
                    <li>
                      <Link
                        to="/dashboard"
                        className="hover:text-foreground hover:underline transition-colors duration-150"
                      >
                        Dashboard
                      </Link>
                    </li>
                    <li>
                      <Link
                        to="/documents"
                        className="hover:text-foreground hover:underline transition-colors duration-150"
                      >
                        Documents
                      </Link>
                    </li>
                    <li>
                      <Link
                        to="/dashboard"
                        className="hover:text-foreground hover:underline transition-colors duration-150"
                      >
                        Assessments
                      </Link>
                    </li>
                    <li>
                      <Link
                        to="/dashboard"
                        className="hover:text-foreground hover:underline transition-colors duration-150"
                      >
                        Reports
                      </Link>
                    </li>
                  </ul>
                </div>

                {/* Resources */}
                <div className="text-left">
                  <h4 className="font-sans text-[13px] font-medium text-foreground uppercase tracking-wider mb-4">
                    Resources
                  </h4>
                  <ul className="flex flex-col gap-3 font-sans text-sm text-muted-foreground">
                    <li>
                      <a
                        href="#features"
                        className="hover:text-foreground hover:underline transition-colors duration-150"
                      >
                        MESAR Regulations
                      </a>
                    </li>
                    <li>
                      <a
                        href="#features"
                        className="hover:text-foreground hover:underline transition-colors duration-150"
                      >
                        NCISM Act 2020
                      </a>
                    </li>
                    <li>
                      <a
                        href="#contact"
                        className="hover:text-foreground hover:underline transition-colors duration-150"
                      >
                        Help Center
                      </a>
                    </li>
                  </ul>
                </div>

                {/* Contact */}
                <div className="text-left">
                  <h4 className="font-sans text-[13px] font-medium text-foreground uppercase tracking-wider mb-4">
                    Contact
                  </h4>
                  <ul className="flex flex-col gap-3 font-sans text-sm text-muted-foreground">
                    <li>
                      <a
                        href="mailto:support@ncism.gov.in"
                        className="hover:text-foreground hover:underline transition-colors duration-150"
                      >
                        support@ncism.gov.in
                      </a>
                    </li>
                    <li>
                      <span className="select-none">New Delhi, India</span>
                    </li>
                  </ul>
                </div>
              </div>

              {/* Footer Bottom */}
              <div className="flex flex-col md:flex-row items-center justify-between pt-8 gap-4 font-sans text-xs text-muted-foreground">
                <span>© 2026 NCISM. All rights reserved.</span>
                <div className="flex items-center gap-6">
                  <a
                    href="#privacy"
                    className="hover:text-foreground hover:underline transition-colors"
                  >
                    Privacy Policy
                  </a>
                  <a
                    href="#terms"
                    className="hover:text-foreground hover:underline transition-colors"
                  >
                    Terms of Service
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
