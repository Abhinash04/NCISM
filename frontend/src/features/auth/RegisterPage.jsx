import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Mail, Phone, Briefcase, Lock, Eye, EyeOff, Loader2 } from 'lucide-react';
import { AuthLayout } from './AuthLayout';
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

    setIsLoading(true);
    try {
      // Simulate API registration call
      await new Promise((resolve) => setTimeout(resolve, 1500));
      toast.success('Account created successfully!');
      navigate('/login');
    } catch {
      toast.error('Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const footerSlot = (
    <div className="text-center w-full">
      <p className="font-sans text-xs text-[#6c6a64]">
        Already have an account?{' '}
        <button
          type="button"
          onClick={() => navigate('/login')}
          className="text-[#cc785c] font-medium hover:underline focus:outline-none"
        >
          Sign in
        </button>
      </p>
    </div>
  );

  return (
    <AuthLayout footer={footerSlot}>
      <div className="flex flex-col items-center justify-center text-center mb-8">
        <span className="font-serif text-[24px] font-normal text-[#141413] tracking-wide select-none">
          NCISM
        </span>
        <h2 className="font-serif text-[28px] font-normal text-[#141413] tracking-tight leading-tight mt-3">
          Create your account
        </h2>
        <p className="font-sans text-sm text-[#6c6a64] mt-1">
          Join the NCISM assessment platform
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4 w-full">
        {/* Full Name */}
        <div className="flex flex-col gap-1.5 w-full">
          <label className="font-sans text-[13px] font-medium text-[#141413]">
            Full Name
          </label>
          <div className="relative w-full">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6c6a64] w-4.5 h-4.5" />
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Dr. Full Name"
              className={`w-full h-10 pl-10 pr-4 bg-[#faf9f5] border rounded-[8px] font-sans text-sm text-[#3d3d3a] placeholder-[#8e8b82] focus:outline-none focus:ring-2 transition-all duration-150 ${
                errors.fullName
                  ? 'border-[#c64545] focus:ring-[rgba(198,69,69,0.15)] focus:border-[#c64545]'
                  : 'border-[#e6dfd8] focus:border-[#cc785c] focus:ring-[rgba(204,120,92,0.15)]'
              }`}
            />
          </div>
          {errors.fullName && (
            <span className="font-sans text-[13px] text-[#c64545] mt-0.5 leading-tight">
              {errors.fullName}
            </span>
          )}
        </div>

        {/* Email */}
        <div className="flex flex-col gap-1.5 w-full">
          <label className="font-sans text-[13px] font-medium text-[#141413]">
            Email
          </label>
          <div className="relative w-full">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6c6a64] w-4.5 h-4.5" />
            <input
              type="text"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className={`w-full h-10 pl-10 pr-4 bg-[#faf9f5] border rounded-[8px] font-sans text-sm text-[#3d3d3a] placeholder-[#8e8b82] focus:outline-none focus:ring-2 transition-all duration-150 ${
                errors.email
                  ? 'border-[#c64545] focus:ring-[rgba(198,69,69,0.15)] focus:border-[#c64545]'
                  : 'border-[#e6dfd8] focus:border-[#cc785c] focus:ring-[rgba(204,120,92,0.15)]'
              }`}
            />
          </div>
          {errors.email && (
            <span className="font-sans text-[13px] text-[#c64545] mt-0.5 leading-tight">
              {errors.email}
            </span>
          )}
        </div>

        {/* Phone */}
        <div className="flex flex-col gap-1.5 w-full">
          <label className="font-sans text-[13px] font-medium text-[#141413]">
            Phone
          </label>
          <div className="relative w-full">
            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6c6a64] w-4.5 h-4.5" />
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+91 98765 43210"
              className={`w-full h-10 pl-10 pr-4 bg-[#faf9f5] border rounded-[8px] font-sans text-sm text-[#3d3d3a] placeholder-[#8e8b82] focus:outline-none focus:ring-2 transition-all duration-150 ${
                errors.phone
                  ? 'border-[#c64545] focus:ring-[rgba(198,69,69,0.15)] focus:border-[#c64545]'
                  : 'border-[#e6dfd8] focus:border-[#cc785c] focus:ring-[rgba(204,120,92,0.15)]'
              }`}
            />
          </div>
          {errors.phone && (
            <span className="font-sans text-[13px] text-[#c64545] mt-0.5 leading-tight">
              {errors.phone}
            </span>
          )}
        </div>

        {/* Role Select Dropdown */}
        <div className="flex flex-col gap-1.5 w-full">
          <label className="font-sans text-[13px] font-medium text-[#141413]">
            Role
          </label>
          <div className="relative w-full">
            <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6c6a64] w-4.5 h-4.5 pointer-events-none" />
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className={`w-full h-10 pl-10 pr-10 bg-[#faf9f5] border rounded-[8px] font-sans text-sm text-[#3d3d3a] focus:outline-none focus:ring-2 transition-all duration-150 appearance-none ${
                errors.role
                  ? 'border-[#c64545] focus:ring-[rgba(198,69,69,0.15)] focus:border-[#c64545]'
                  : 'border-[#e6dfd8] focus:border-[#cc785c] focus:ring-[rgba(204,120,92,0.15)]'
              }`}
            >
              <option value="" disabled hidden>
                Select your role
              </option>
              <option value="JUNIOR_CONSULTANT">Junior Consultant</option>
              <option value="SENIOR_CONSULTANT">Senior Consultant</option>
              <option value="BOARD_MEMBER">Board Member</option>
              <option value="SECRETARIAT">Secretariat</option>
              <option value="VISITOR">Visitor</option>
            </select>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none flex items-center justify-center text-[#6c6a64]">
              <svg className="w-4 h-4 fill-none stroke-current" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
          {errors.role && (
            <span className="font-sans text-[13px] text-[#c64545] mt-0.5 leading-tight">
              {errors.role}
            </span>
          )}
        </div>

        {/* Password */}
        <div className="flex flex-col gap-1.5 w-full">
          <label className="font-sans text-[13px] font-medium text-[#141413]">
            Password
          </label>
          <div className="relative w-full">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6c6a64] w-4.5 h-4.5" />
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Min 8 characters"
              className={`w-full h-10 pl-10 pr-10 bg-[#faf9f5] border rounded-[8px] font-sans text-sm text-[#3d3d3a] placeholder-[#8e8b82] focus:outline-none focus:ring-2 transition-all duration-150 ${
                errors.password
                  ? 'border-[#c64545] focus:ring-[rgba(198,69,69,0.15)] focus:border-[#c64545]'
                  : 'border-[#e6dfd8] focus:border-[#cc785c] focus:ring-[rgba(204,120,92,0.15)]'
              }`}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6c6a64] hover:text-[#141413] p-0.5 rounded transition-colors duration-150 focus:outline-none"
            >
              {showPassword ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
            </button>
          </div>
          {errors.password && (
            <span className="font-sans text-[13px] text-[#c64545] mt-0.5 leading-tight">
              {errors.password}
            </span>
          )}
        </div>

        {/* Confirm Password */}
        <div className="flex flex-col gap-1.5 w-full">
          <label className="font-sans text-[13px] font-medium text-[#141413]">
            Confirm Password
          </label>
          <div className="relative w-full">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6c6a64] w-4.5 h-4.5" />
            <input
              type={showConfirmPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter password"
              className={`w-full h-10 pl-10 pr-10 bg-[#faf9f5] border rounded-[8px] font-sans text-sm text-[#3d3d3a] placeholder-[#8e8b82] focus:outline-none focus:ring-2 transition-all duration-150 ${
                errors.confirmPassword
                  ? 'border-[#c64545] focus:ring-[rgba(198,69,69,0.15)] focus:border-[#c64545]'
                  : 'border-[#e6dfd8] focus:border-[#cc785c] focus:ring-[rgba(204,120,92,0.15)]'
              }`}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6c6a64] hover:text-[#141413] p-0.5 rounded transition-colors duration-150 focus:outline-none"
            >
              {showConfirmPassword ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
            </button>
          </div>
          {errors.confirmPassword && (
            <span className="font-sans text-[13px] text-[#c64545] mt-0.5 leading-tight">
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
              className="w-4 h-4 rounded text-[#cc785c] border-[#e6dfd8] focus:ring-[#cc785c] bg-[#faf9f5] focus:ring-opacity-25 mt-0.5 accent-[#cc785c]"
            />
            <label htmlFor="agreeTerms" className="font-sans text-xs text-[#6c6a64] select-none leading-normal">
              I agree to the{' '}
              <a href="/terms" className="text-[#cc785c] font-medium hover:underline">
                Terms of Service
              </a>{' '}
              and{' '}
              <a href="/privacy" className="text-[#cc785c] font-medium hover:underline">
                Privacy Policy
              </a>
            </label>
          </div>
          {errors.agreeTerms && (
            <span className="font-sans text-[13px] text-[#c64545] mt-0.5 leading-tight">
              {errors.agreeTerms}
            </span>
          )}
        </div>

        {/* Action Button */}
        <div className="w-full mt-2">
          <button
            type="submit"
            disabled={isLoading}
            className="w-full h-10 bg-[#cc785c] text-white hover:bg-[#a9583e] rounded-[8px] font-sans text-sm font-medium transition-colors duration-150 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isLoading && <Loader2 className="w-4 h-4 animate-spin text-white" />}
            {isLoading ? 'Creating Account...' : 'Create Account'}
          </button>
        </div>
      </form>
    </AuthLayout>
  );
}
