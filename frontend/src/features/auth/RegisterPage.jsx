import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Mail, Phone, Briefcase, Lock, Eye, EyeOff, Loader2 } from 'lucide-react';
import { AuthLayout } from './AuthLayout';
import { neoField, NEO_PRIMARY_BTN } from './authStyles';
import { toast } from 'sonner';

export function RegisterPage() {
  const navigate = useNavigate();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(false);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Field-level error states
  const [errors, setErrors] = useState({});

  const validateEmail = (val) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(val);
  };

  const validatePhone = (val) => {
    // optional +91, then 10 digits
    const regex = /^(?:\+91)?[6-9]\d{9}$/;
    return regex.test(val.replace(/\s+/g, ''));
  };

  const validatePassword = (val) => {
    // min 8 chars, 1 uppercase, 1 number
    const hasMinLength = val.length >= 8;
    const hasUppercase = /[A-Z]/.test(val);
    const hasNumber = /\d/.test(val);
    return hasMinLength && hasUppercase && hasNumber;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const newErrors = {};

    if (!fullName.trim()) {
      newErrors.fullName = 'Full Name is required';
    }

    if (!email) {
      newErrors.email = 'Email is required';
    } else if (!validateEmail(email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!phone) {
      newErrors.phone = 'Phone number is required';
    } else if (!validatePhone(phone)) {
      newErrors.phone = 'Please enter a valid 10-digit mobile number';
    }

    if (!role) {
      newErrors.role = 'Please select your role';
    }

    if (!password) {
      newErrors.password = 'Password is required';
    } else if (!validatePassword(password)) {
      newErrors.password = 'Password must be at least 8 characters, with 1 uppercase letter and 1 number';
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = 'Confirm Password is required';
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    if (!agreeTerms) {
      newErrors.agreeTerms = 'You must agree to the Terms of Service';
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) return;

    // NCISM accounts are provisioned by the administrator — there is no public
    // self-registration endpoint. Surface that honestly rather than faking an
    // account (no backend call, no navigation).
    setIsLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 400));
    toast.info('Registration is managed by your administrator. Please contact them for access.');
    setIsLoading(false);
  };

  const footerSlot = (
    <div className="text-center w-full">
      <p className="font-sans text-xs text-muted-foreground">
        Already have an account?{' '}
        <button
          type="button"
          onClick={() => navigate('/login')}
          className="text-primary font-medium hover:underline focus:outline-none"
        >
          Sign in
        </button>
      </p>
    </div>
  );

  return (
    <AuthLayout footer={footerSlot}>
      <div className="flex flex-col items-start text-left mb-8">
        <h2 className="font-serif text-[28px] font-normal text-foreground tracking-tight leading-tight">
          Create your account
        </h2>
        <p className="font-sans text-sm text-muted-foreground mt-1">
          Join the NCISM assessment platform
        </p>
      </div>

      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4 w-full">
        {/* Full Name */}
        <div className="flex flex-col gap-1.5 w-full">
          <label htmlFor="reg-name" className="font-sans text-[13px] font-medium text-foreground">
            Full Name
          </label>
          <div className="relative w-full">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <input
              type="text"
              autoComplete="name"
              name="fullName"
              id="reg-name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Dr. Full Name"
              className={neoField(!!errors.fullName, 'pl-10 pr-4')}
            />
          </div>
          {errors.fullName && (
            <span className="font-sans text-[13px] text-destructive mt-0.5 leading-tight">
              {errors.fullName}
            </span>
          )}
        </div>

        {/* Email */}
        <div className="flex flex-col gap-1.5 w-full">
          <label htmlFor="reg-email" className="font-sans text-[13px] font-medium text-foreground">
            Email
          </label>
          <div className="relative w-full">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <input
              type="email"
              autoComplete="email"
              name="email"
              spellCheck={false}
              id="reg-email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className={neoField(!!errors.email, 'pl-10 pr-4')}
            />
          </div>
          {errors.email && (
            <span className="font-sans text-[13px] text-destructive mt-0.5 leading-tight">
              {errors.email}
            </span>
          )}
        </div>

        {/* Phone */}
        <div className="flex flex-col gap-1.5 w-full">
          <label htmlFor="reg-phone" className="font-sans text-[13px] font-medium text-foreground">
            Phone
          </label>
          <div className="relative w-full">
            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <input
              type="tel"
              autoComplete="tel"
              name="tel"
              inputMode="tel"
              id="reg-phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+91 98765 43210"
              className={neoField(!!errors.phone, 'pl-10 pr-4')}
            />
          </div>
          {errors.phone && (
            <span className="font-sans text-[13px] text-destructive mt-0.5 leading-tight">
              {errors.phone}
            </span>
          )}
        </div>

        {/* Role Select Dropdown */}
        <div className="flex flex-col gap-1.5 w-full">
          <label htmlFor="reg-role" className="font-sans text-[13px] font-medium text-foreground">
            Role
          </label>
          <div className="relative w-full">
            <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4 pointer-events-none" />
            <select
              id="reg-role"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className={neoField(!!errors.role, 'pl-10 pr-10 appearance-none')}
            >
              <option value="" disabled hidden>
                Select your role
              </option>
              <option value="JUNIOR_CONSULTANT">Consultant</option>
              <option value="SENIOR_CONSULTANT">Senior Consultant</option>
              <option value="BOARD_MEMBER">Board Member</option>
              <option value="SECRETARIAT">Secretariat</option>
              <option value="VISITOR">Visitor</option>
            </select>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none flex items-center justify-center text-muted-foreground">
              <svg className="w-4 h-4 fill-none stroke-current" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
          {errors.role && (
            <span className="font-sans text-[13px] text-destructive mt-0.5 leading-tight">
              {errors.role}
            </span>
          )}
        </div>

        {/* Password */}
        <div className="flex flex-col gap-1.5 w-full">
          <label htmlFor="reg-password" className="font-sans text-[13px] font-medium text-foreground">
            Password
          </label>
          <div className="relative w-full">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <input
              type={showPassword ? 'text' : 'password'}
              id="reg-password"
              autoComplete="new-password"
              name="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Min 8 characters"
              className={neoField(!!errors.password, 'pl-10 pr-10')}
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
          {errors.password && (
            <span className="font-sans text-[13px] text-destructive mt-0.5 leading-tight">
              {errors.password}
            </span>
          )}
        </div>

        {/* Confirm Password */}
        <div className="flex flex-col gap-1.5 w-full">
          <label htmlFor="reg-confirm" className="font-sans text-[13px] font-medium text-foreground">
            Confirm Password
          </label>
          <div className="relative w-full">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <input
              type={showConfirmPassword ? 'text' : 'password'}
              id="reg-confirm"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter password"
              className={neoField(!!errors.confirmPassword, 'pl-10 pr-10')}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
              aria-pressed={showConfirmPassword}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5 rounded transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {errors.confirmPassword && (
            <span className="font-sans text-[13px] text-destructive mt-0.5 leading-tight">
              {errors.confirmPassword}
            </span>
          )}
        </div>

        {/* Terms Checklist */}
        <div className="flex flex-col gap-1 w-full mt-1">
          <div className="flex items-start gap-2.5">
            <input
              type="checkbox"
              id="agreeTerms"
              checked={agreeTerms}
              onChange={(e) => setAgreeTerms(e.target.checked)}
              className="w-5 h-5 rounded-[4px] border-2 border-foreground bg-background accent-primary focus:ring-2 focus:ring-ring mt-0.5"
            />
            <label htmlFor="agreeTerms" className="font-sans text-xs text-muted-foreground select-none leading-normal">
              I agree to the{' '}
              <a href="/terms" className="text-primary font-medium hover:underline">
                Terms of Service
              </a>{' '}
              and{' '}
              <a href="/privacy" className="text-primary font-medium hover:underline">
                Privacy Policy
              </a>
            </label>
          </div>
          {errors.agreeTerms && (
            <span className="font-sans text-[13px] text-destructive mt-0.5 leading-tight">
              {errors.agreeTerms}
            </span>
          )}
        </div>

        {/* Action Button */}
        <div className="w-full mt-2">
          <button
            type="submit"
            disabled={isLoading}
            className={NEO_PRIMARY_BTN}
          >
            {isLoading && <Loader2 className="w-4 h-4 animate-spin text-primary-foreground" />}
            {isLoading ? 'Creating Account...' : 'Create Account'}
          </button>
        </div>
      </form>
    </AuthLayout>
  );
}
