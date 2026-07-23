import { useState } from 'react';
import { useNavigate, useLocation, Navigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, Loader2 } from 'lucide-react';
import { AuthLayout } from './AuthLayout';
import { useAuth } from './AuthContext';
import { neoField, NEO_PRIMARY_BTN, NEO_SECONDARY_BTN } from './authStyles';

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
        className={NEO_SECONDARY_BTN}
      >
        Create an account
      </button>
    </div>
  );

  // MFA step-up screen — shown after a correct password for an MFA-enabled user.
  if (challenge) {
    return (
      <AuthLayout>
        <div className="flex flex-col items-start text-left mb-8">
          <h2 className="font-serif text-[28px] font-normal text-foreground tracking-tight leading-tight">
            Two-factor authentication
          </h2>
          <p className="font-sans text-sm text-muted-foreground mt-1">
            Enter the 6-digit code from your authenticator app
          </p>
        </div>

        <form onSubmit={handleMfaSubmit} noValidate className="flex flex-col gap-4 w-full">
          <div className="flex flex-col gap-1.5 w-full">
            <label htmlFor="mfa-code" className="font-sans text-[13px] font-medium text-foreground">Authentication code</label>
            <input
              id="mfa-code"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              spellCheck={false}
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              placeholder="123456"
              autoFocus
              aria-invalid={!!formError}
              aria-describedby={formError ? 'mfa-error' : undefined}
              className={neoField(!!formError, 'px-4 text-center tracking-[0.4em]')}
            />
          </div>
          {formError && (
            <span id="mfa-error" role="alert" className="font-sans text-[13px] text-destructive leading-tight">{formError}</span>
          )}
          <button type="submit" disabled={isLoading} className={NEO_PRIMARY_BTN}>
            {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
            {isLoading ? 'Verifying…' : 'Verify'}
          </button>
        </form>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout footer={footerSlot}>
      <div className="flex flex-col items-start text-left mb-8">
        <h2 className="font-serif text-[28px] font-normal text-foreground tracking-tight leading-tight">
          Welcome back
        </h2>
        <p className="font-sans text-sm text-muted-foreground mt-1">
          Sign in to your account
        </p>
      </div>

      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4 w-full">
        {/* Email Field */}
        <div className="flex flex-col gap-1.5 w-full">
          <label htmlFor="login-email" className="font-sans text-[13px] font-medium text-foreground">
            Email
          </label>
          <div className="relative w-full">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" aria-hidden="true" />
            <input
              id="login-email"
              type="email"
              autoComplete="email"
              spellCheck={false}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              aria-invalid={!!emailError}
              aria-describedby={emailError ? 'login-email-error' : undefined}
              className={neoField(!!emailError, 'pl-10 pr-4')}
            />
          </div>
          {emailError && (
            <span id="login-email-error" className="font-sans text-[13px] text-destructive mt-0.5 leading-tight">
              {emailError}
            </span>
          )}
        </div>

        {/* Password Field */}
        <div className="flex flex-col gap-1.5 w-full">
          <label htmlFor="login-password" className="font-sans text-[13px] font-medium text-foreground">
            Password
          </label>
          <div className="relative w-full">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" aria-hidden="true" />
            <input
              id="login-password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              aria-invalid={!!passwordError}
              aria-describedby={passwordError ? 'login-password-error' : undefined}
              className={neoField(!!passwordError, 'pl-10 pr-10')}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              aria-pressed={showPassword}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5 rounded transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {passwordError && (
            <span id="login-password-error" className="font-sans text-[13px] text-destructive mt-0.5 leading-tight">
              {passwordError}
            </span>
          )}
        </div>

        {formError && (
          <span role="alert" className="font-sans text-[13px] text-destructive leading-tight">{formError}</span>
        )}

        {/* Submit Actions */}
        <div className="flex flex-col gap-3 w-full mt-2">
          <button type="submit" disabled={isLoading} className={NEO_PRIMARY_BTN}>
            {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
            {isLoading ? 'Signing in…' : 'Sign In'}
          </button>
          <button
            type="button"
            onClick={() => navigate('/forgot-password')}
            className="text-center font-sans text-xs font-medium text-primary hover:underline bg-transparent border-0 p-0 cursor-pointer mt-1 self-center rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Forgot password?
          </button>
        </div>
      </form>
    </AuthLayout>
  );
}
