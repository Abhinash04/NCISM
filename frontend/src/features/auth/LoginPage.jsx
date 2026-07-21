import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { AuthLayout } from './AuthLayout';
import { toast } from 'sonner';

export function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const validateEmail = (val) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(val);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setEmailError('');
    setPasswordError('');

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
      // Simulate API verification call
      await new Promise((resolve) => setTimeout(resolve, 1200));
      toast.success('Successfully signed in!');
      navigate('/jr-consultant/dashboard');
    } catch {
      toast.error('Authentication failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const footerSlot = (
    <div className="space-y-4 w-full">
      <div className="relative flex items-center justify-center w-full">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-[#e6dfd8]"></div>
        </div>
        <span className="relative px-3 bg-[#efe9de] text-xs font-medium text-[#6c6a64] select-none">or</span>
      </div>
      <button
        type="button"
        onClick={() => navigate('/register')}
        className="w-full h-10 bg-[#faf9f5] border border-[#e6dfd8] text-[#141413] hover:bg-[#efe9de] rounded-[8px] font-sans text-sm font-medium transition-colors duration-150 flex items-center justify-center"
      >
        Create an account
      </button>
    </div>
  );

  return (
    <AuthLayout footer={footerSlot}>
      <div className="flex flex-col items-center justify-center text-center mb-8">
        <span className="font-serif text-[24px] font-normal text-[#141413] tracking-wide select-none">
          NCISM
        </span>
        <h2 className="font-serif text-[28px] font-normal text-[#141413] tracking-tight leading-tight mt-3">
          Welcome back
        </h2>
        <p className="font-sans text-sm text-[#6c6a64] mt-1">
          Sign in to your account
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4 w-full">
        {/* Email Field */}
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
                emailError
                  ? 'border-[#c64545] focus:ring-[rgba(198,69,69,0.15)] focus:border-[#c64545]'
                  : 'border-[#e6dfd8] focus:border-[#cc785c] focus:ring-[rgba(204,120,92,0.15)]'
              }`}
            />
          </div>
          {emailError && (
            <span className="font-sans text-[13px] text-[#c64545] mt-0.5 leading-tight">
              {emailError}
            </span>
          )}
        </div>

        {/* Password Field */}
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
              placeholder="••••••••"
              className={`w-full h-10 pl-10 pr-10 bg-[#faf9f5] border rounded-[8px] font-sans text-sm text-[#3d3d3a] placeholder-[#8e8b82] focus:outline-none focus:ring-2 transition-all duration-150 ${
                passwordError
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
          {passwordError && (
            <span className="font-sans text-[13px] text-[#c64545] mt-0.5 leading-tight">
              {passwordError}
            </span>
          )}
        </div>

        {/* Submit Actions */}
        <div className="flex flex-col gap-3 w-full mt-2">
          <button
            type="submit"
            disabled={isLoading}
            className="w-full h-10 bg-[#cc785c] text-white hover:bg-[#a9583e] rounded-[8px] font-sans text-sm font-medium transition-colors duration-150 flex items-center justify-center disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Signing In...' : 'Sign In'}
          </button>
          <button
            type="button"
            onClick={() => navigate('/forgot-password')}
            className="text-center font-sans text-xs font-medium text-[#cc785c] hover:underline bg-transparent border-0 p-0 focus:outline-none cursor-pointer mt-1 self-center"
          >
            Forgot password?
          </button>
        </div>
      </form>
    </AuthLayout>
  );
}
