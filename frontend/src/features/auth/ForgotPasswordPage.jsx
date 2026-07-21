import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Loader2, ShieldCheck } from 'lucide-react';
import { AuthLayout } from './AuthLayout';

const FIELD_BASE =
  'w-full h-10 pl-10 pr-4 bg-background border rounded-[8px] font-sans text-sm text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:ring-2 transition-all duration-150';

export function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const validateEmail = (val) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setEmailError('');
    if (!email) return setEmailError('Email is required');
    if (!validateEmail(email)) return setEmailError('Please enter a valid email address');

    // No self-service reset endpoint — accounts are administrator-provisioned.
    // Acknowledge the request honestly instead of pretending to send an email.
    setIsLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 500));
    setIsLoading(false);
    setSubmitted(true);
  };

  const footerSlot = (
    <div className="text-center w-full">
      <button
        type="button"
        onClick={() => navigate('/login')}
        className="font-sans text-sm font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
      >
        Back to sign in
      </button>
    </div>
  );

  if (submitted) {
    return (
      <AuthLayout footer={footerSlot}>
        <div role="status" aria-live="polite" className="flex flex-col items-center justify-center text-center gap-4">
          <div className="grid h-12 w-12 place-content-center rounded-full bg-primary/10 text-primary">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <h2 className="font-serif text-[24px] font-normal text-foreground tracking-tight leading-tight">
            Contact your administrator
          </h2>
          <p className="font-sans text-sm text-muted-foreground leading-relaxed max-w-[320px]">
            Password resets for <span className="font-medium text-foreground">{email}</span> are managed
            by your NCISM administrator. Please reach out to them to have your password reset — no reset
            email is sent automatically.
          </p>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout footer={footerSlot}>
      <div className="flex flex-col items-center justify-center text-center mb-8">
        <span className="font-serif text-[24px] font-normal text-foreground tracking-wide select-none">
          NCISM
        </span>
        <h2 className="font-serif text-[28px] font-normal text-foreground tracking-tight leading-tight mt-3">
          Forgot your password?
        </h2>
        <p className="font-sans text-sm text-muted-foreground mt-1">
          Enter your email and we'll tell you how to reset it
        </p>
      </div>

      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4 w-full">
        <div className="flex flex-col gap-1.5 w-full">
          <label htmlFor="fp-email" className="font-sans text-[13px] font-medium text-foreground">
            Email
          </label>
          <div className="relative w-full">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" aria-hidden="true" />
            <input
              id="fp-email"
              type="email"
              autoComplete="email"
              spellCheck={false}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              aria-invalid={!!emailError}
              aria-describedby={emailError ? 'fp-email-error' : undefined}
              className={`${FIELD_BASE} ${
                emailError
                  ? 'border-destructive focus:ring-destructive/20 focus:border-destructive'
                  : 'border-border focus:border-primary focus:ring-ring/40'
              }`}
            />
          </div>
          {emailError && (
            <span id="fp-email-error" className="font-sans text-[13px] text-destructive mt-0.5 leading-tight">
              {emailError}
            </span>
          )}
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full h-10 bg-primary text-primary-foreground rounded-[8px] font-sans text-sm font-medium flex items-center justify-center gap-2 transition-[transform,background-color] duration-150 ease-out hover:bg-primary/90 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-secondary disabled:opacity-70 disabled:cursor-not-allowed disabled:active:scale-100"
        >
          {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
          {isLoading ? 'Submitting…' : 'Reset password'}
        </button>
      </form>
    </AuthLayout>
  );
}
