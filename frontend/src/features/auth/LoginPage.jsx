import { useState } from 'react';
import { useNavigate, useLocation, Navigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { AuthLayout } from './AuthLayout';
import { useAuth } from './AuthContext';

export function LoginPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [formError, setFormError] = useState('');
  const [challenge, setChallenge] = useState(null); // set → MFA step-up screen
  const [code, setCode] = useState('');

  const from = location.state?.from?.pathname || '/dashboard';
  if (auth.isAuthenticated) return <Navigate to={from} replace />;

  const validateEmail = (val) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(val);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setEmailError('');
    setPasswordError('');
    setFormError('');

    let hasError = false;

    if (!email) {
      setEmailError('Email is required');
      hasError = true;
    } else if (!validateEmail(email)) {
      setEmailError('Please enter a valid email address');
      hasError = true;
    }

    if (!password) {
      setPasswordError('Password is required');
      hasError = true;
    } else if (password.length < 6) {
      setPasswordError('Password must be at least 6 characters');
      hasError = true;
    }

    if (hasError) return;

    setIsLoading(true);
    try {
      const result = await auth.login(email, password);
      if (result?.mfaRequired) { setChallenge(result.challenge); return; } // ask for the code
      navigate(from, { replace: true });
    } catch (err) {
      setFormError(err?.response?.data?.error?.message || 'Authentication failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleMfaSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setIsLoading(true);
    try {
      await auth.completeMfaLogin(challenge, code);
      navigate(from, { replace: true });
    } catch (err) {
      setFormError(err?.response?.data?.error?.message || 'Incorrect code');
    } finally {
      setIsLoading(false);
    }
  };

  const footerSlot = (
    <div className="space-y-4 w-full">
      <div className="relative flex items-center justify-center w-full">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border"></div>
        </div>
        <span className="relative px-3 bg-secondary text-xs font-medium text-muted-foreground select-none">or</span>
      </div>
      <button
        type="button"
        onClick={() => navigate('/register')}
        className="w-full h-10 bg-background border border-border text-foreground hover:bg-accent rounded-[8px] font-sans text-sm font-medium transition-colors duration-150 flex items-center justify-center"
      >
        Create an account
      </button>
    </div>
  );

  // MFA step-up screen — shown after a correct password for an MFA-enabled user.
  if (challenge) {
    return (
      <AuthLayout>
        <div className="flex flex-col items-center justify-center text-center mb-8">
          <span className="font-serif text-[24px] font-normal text-foreground tracking-wide select-none">
            NCISM
          </span>
          <h2 className="font-serif text-[28px] font-normal text-foreground tracking-tight leading-tight mt-3">
            Two-factor authentication
          </h2>
          <p className="font-sans text-sm text-muted-foreground mt-1">
            Enter the 6-digit code from your authenticator app
          </p>
        </div>

        <form onSubmit={handleMfaSubmit} className="flex flex-col gap-4 w-full">
          <div className="flex flex-col gap-1.5 w-full">
            <label className="font-sans text-[13px] font-medium text-foreground">Authentication code</label>
            <input
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              placeholder="123456"
              autoFocus
              className="w-full h-10 px-4 bg-background border border-border rounded-[8px] font-sans text-sm text-foreground text-center tracking-[0.4em] placeholder:text-muted-foreground/70 focus:outline-none focus:ring-2 focus:border-primary focus:ring-ring/40 transition-all duration-150"
            />
          </div>
          {formError && (
            <span className="font-sans text-[13px] text-destructive leading-tight">{formError}</span>
          )}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full h-10 bg-primary text-primary-foreground hover:bg-primary/90 rounded-[8px] font-sans text-sm font-medium transition-colors duration-150 flex items-center justify-center disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Verifying...' : 'Verify'}
          </button>
        </form>
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
          Welcome back
        </h2>
        <p className="font-sans text-sm text-muted-foreground mt-1">
          Sign in to your account
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4 w-full">
        {/* Email Field */}
        <div className="flex flex-col gap-1.5 w-full">
          <label className="font-sans text-[13px] font-medium text-foreground">
            Email
          </label>
          <div className="relative w-full">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <input
              type="text"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className={`w-full h-10 pl-10 pr-4 bg-background border rounded-[8px] font-sans text-sm text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:ring-2 transition-all duration-150 ${
                emailError
                  ? 'border-destructive focus:ring-destructive/20 focus:border-destructive'
                  : 'border-border focus:border-primary focus:ring-ring/40'
              }`}
            />
          </div>
          {emailError && (
            <span className="font-sans text-[13px] text-destructive mt-0.5 leading-tight">
              {emailError}
            </span>
          )}
        </div>

        {/* Password Field */}
        <div className="flex flex-col gap-1.5 w-full">
          <label className="font-sans text-[13px] font-medium text-foreground">
            Password
          </label>
          <div className="relative w-full">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className={`w-full h-10 pl-10 pr-10 bg-background border rounded-[8px] font-sans text-sm text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:ring-2 transition-all duration-150 ${
                passwordError
                  ? 'border-destructive focus:ring-destructive/20 focus:border-destructive'
                  : 'border-border focus:border-primary focus:ring-ring/40'
              }`}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5 rounded transition-colors duration-150 focus:outline-none"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {passwordError && (
            <span className="font-sans text-[13px] text-destructive mt-0.5 leading-tight">
              {passwordError}
            </span>
          )}
        </div>

        {formError && (
          <span className="font-sans text-[13px] text-destructive leading-tight">{formError}</span>
        )}

        {/* Submit Actions */}
        <div className="flex flex-col gap-3 w-full mt-2">
          <button
            type="submit"
            disabled={isLoading}
            className="w-full h-10 bg-primary text-primary-foreground hover:bg-primary/90 rounded-[8px] font-sans text-sm font-medium transition-colors duration-150 flex items-center justify-center disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Signing In...' : 'Sign In'}
          </button>
          <button
            type="button"
            onClick={() => toast.info('Password resets are managed by your administrator. Please contact them for access.')}
            className="text-center font-sans text-xs font-medium text-primary hover:underline bg-transparent border-0 p-0 focus:outline-none cursor-pointer mt-1 self-center"
          >
            Forgot password?
          </button>
        </div>
      </form>
    </AuthLayout>
  );
}
