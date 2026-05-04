'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useInView } from '@/hooks/useInView';
import { ApiService } from '@/services/api';
import { toast } from 'sonner';
import { toastAxiosError } from '@/hooks/useAxiosError';

export default function ForgotPassword() {
  const [step, setStep] = useState<1 | 2>(1);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { ref, isInView } = useInView({ threshold: 0.1 });

  const handleRequestReset = async () => {
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      toast.error('Please enter a valid email address');
      return;
    }

    setIsLoading(true);
    try {
      const res = await ApiService.auth.forgotPassword({ email });
      if (res.data.success) {
        toast.success(res.data.message || 'Password reset OTP sent to your email');
        setStep(2);
      }
    } catch (error) {
      toastAxiosError(error, 'Failed to send reset OTP');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!otp || otp.length !== 6) {
      toast.error('Please enter a valid 6-digit OTP');
      return;
    }
    if (!password || password.length < 8) {
      toast.error('Password must be at least 8 characters long');
      return;
    }
    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setIsLoading(true);
    try {
      const res = await ApiService.auth.resetPassword({
        email,
        otp,
        new_password: password
      });
      if (res.data.success) {
        toast.success('Password reset successfully. You can now login.');
        router.push('/signin');
      }
    } catch (error) {
      toastAxiosError(error, 'Failed to reset password');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-[#f8fafc] relative overflow-hidden">
      {/* Background Decorative Elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
         <div className="absolute top-[-10%] left-[-5%] w-[500px] h-[500px] rounded-full bg-gradient-to-br from-[#0E9DA5]/10 to-[#0E9DA5]/5 blur-3xl opacity-60" />
         <div className="absolute bottom-[-10%] right-[-5%] w-[500px] h-[500px] rounded-full bg-gradient-to-tr from-[#0E9DA5]/10 to-[#0E9DA5]/5 blur-3xl opacity-60" />
      </div>

      <div 
        ref={ref}
        className={`w-full max-w-[440px] z-10 transition-all duration-700 ${isInView ? 'animate-scale-in opacity-100' : 'opacity-0 translate-y-4'}`}
      >
        <div className="glass-card p-8 rounded-2xl shadow-elevated border border-white/50 backdrop-blur-xl">
          {/* Header */}
          <div className="mb-8">
            <button 
              onClick={() => step === 2 ? setStep(1) : router.push('/signin')} 
              className="inline-flex items-center text-gray-500 hover:text-gray-900 border border-gray-200 rounded-full p-2 mb-6 hover:bg-gray-50 smooth-transition"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            
            <div className="flex justify-center mb-6">
               <div className="w-16 h-16 bg-[#e0f2f3] rounded-full flex items-center justify-center text-3xl animate-bounce-slow">
                 🔐
               </div>
            </div>

            <h1 className="text-2xl font-bold text-gray-900 mb-2 text-center">
              {step === 1 ? 'Forgot Password' : 'Reset Password'}
            </h1>
            <p className="text-gray-500 text-sm text-center">
              {step === 1 
                ? 'Enter your email address and we will send you an OTP to reset your password.' 
                : 'Enter the 6-digit OTP sent to your email and your new password.'}
            </p>
          </div>

          {/* Form */}
          {step === 1 ? (
            <div className="space-y-5 mb-8">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5 ml-1">
                  Email Address
                </label>
                <Input
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input-modern w-full"
                />
              </div>
              <Button
                onClick={handleRequestReset}
                disabled={isLoading}
                className="btn-primary w-full py-6 text-base font-semibold shadow-soft hover-glow flex items-center justify-center gap-2"
              >
                {isLoading && <Loader2 className="w-5 h-5 animate-spin" />}
                Send Reset OTP
              </Button>
            </div>
          ) : (
            <div className="space-y-5 mb-8">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5 ml-1">
                  OTP Code
                </label>
                <Input
                  type="text"
                  placeholder="123456"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="input-modern w-full tracking-widest text-center"
                  maxLength={6}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5 ml-1">
                  New Password
                </label>
                <Input
                  type="password"
                  placeholder="Enter new password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-modern w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5 ml-1">
                  Confirm Password
                </label>
                <Input
                  type="password"
                  placeholder="Re-enter password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="input-modern w-full"
                />
              </div>

              <Button
                onClick={handleResetPassword}
                disabled={isLoading}
                className="btn-primary w-full py-6 text-base font-semibold shadow-soft hover-glow flex items-center justify-center gap-2"
              >
                {isLoading && <Loader2 className="w-5 h-5 animate-spin" />}
                Reset Password
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
