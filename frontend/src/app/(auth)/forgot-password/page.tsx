'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ApiService } from '@/services/api';
import { toast } from 'sonner';
import { toastAxiosError } from '@/hooks/useAxiosError';
import { AuthLayout } from '@/components/layout/AuthLayout';

export default function ForgotPassword() {
  const [step, setStep] = useState<1 | 2>(1);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleRequestReset = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      toast.error('Please enter a valid email address');
      return;
    }
    setIsLoading(true);
    try {
      const res = await ApiService.auth.forgotPassword({ email });
      if (res.data.success) {
        toast.success(res.data.message || 'Reset code sent to your email');
        setStep(2);
      }
    } catch (error) {
      toastAxiosError(error, 'Failed to send reset code');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!otp || otp.length !== 6) {
      toast.error('Please enter the 6-digit code');
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
        new_password: password,
      });
      if (res.data.success) {
        toast.success('Password reset — you can sign in now');
        router.push('/signin');
      }
    } catch (error) {
      toastAxiosError(error, 'Failed to reset password');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout
      title={step === 1 ? 'Forgot password' : 'Reset password'}
      subtitle={
        step === 1
          ? "Enter your email and we'll send a 6-digit code to reset your password."
          : 'Enter the code we sent and choose a new password.'
      }
      onBack={() => (step === 2 ? setStep(1) : router.push('/signin'))}
      heroTitle={
        <>
          We&apos;ll get you
          <br />
          back in.
        </>
      }
      heroDescription="Resetting your password takes under a minute. Check your inbox for the verification code."
      footer={
        step === 1 ? (
          <>
            Remembered it?{' '}
            <Link
              href="/signin"
              className="font-semibold text-primary hover:underline underline-offset-4"
            >
              Sign in
            </Link>
          </>
        ) : null
      }
    >
      <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-brand-soft px-3 py-1 text-xs font-medium text-accent-foreground">
        <Lock className="h-3.5 w-3.5" aria-hidden="true" />
        Step {step} of 2
      </div>

      {step === 1 ? (
        <form onSubmit={handleRequestReset} className="space-y-5" noValidate>
          <div className="space-y-1.5">
            <label htmlFor="email" className="block text-sm font-medium text-foreground">
              Email address
            </label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="h-12"
            />
          </div>
          <Button type="submit" size="xl" block loading={isLoading} className="h-12 text-base">
            {isLoading ? 'Sending…' : 'Send reset code'}
          </Button>
        </form>
      ) : (
        <form onSubmit={handleResetPassword} className="space-y-5" noValidate>
          <div className="space-y-1.5">
            <label htmlFor="otp" className="block text-sm font-medium text-foreground">
              Verification code
            </label>
            <Input
              id="otp"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              autoComplete="one-time-code"
              placeholder="123456"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              maxLength={6}
              className="h-12 text-center text-lg tracking-[0.5em] font-semibold"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="new-password" className="block text-sm font-medium text-foreground">
              New password
            </label>
            <Input
              id="new-password"
              type="password"
              autoComplete="new-password"
              placeholder="At least 8 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-12"
            />
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="confirm-password"
              className="block text-sm font-medium text-foreground"
            >
              Confirm password
            </label>
            <Input
              id="confirm-password"
              type="password"
              autoComplete="new-password"
              placeholder="Re-enter password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="h-12"
            />
          </div>

          <Button type="submit" size="xl" block loading={isLoading} className="h-12 text-base">
            {isLoading ? 'Resetting…' : 'Reset password'}
          </Button>
        </form>
      )}
    </AuthLayout>
  );
}
