'use client';

import React, { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ApiService, VerifyOTPPyload } from '@/services/api';
import { toast } from 'sonner';
import { toastAxiosError } from '@/hooks/useAxiosError';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { OtpInput } from '@/components/auth/OtpInput';

const OTP_LENGTH = 6;

function OTPVerificationContent() {
  const [otp, setOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get('email') || '';

  const handleContinue = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (otp.length !== OTP_LENGTH) {
      toast.error(`Please enter the ${OTP_LENGTH}-digit code`);
      return;
    }
    if (!email) {
      toast.error('Email not found. Please sign up again.');
      return;
    }

    setIsLoading(true);
    try {
      const verifyPayload: VerifyOTPPyload = { email, otp };
      await ApiService.auth.verifyEmail(verifyPayload);
      toast.success('Email verified — please sign in');
      router.push('/signin');
    } catch (error: unknown) {
      toastAxiosError(error);
      console.error('Verification error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (!email) return;
    try {
      await ApiService.auth.resendOtp(email);
      toast.success('Code resent');
    } catch (error) {
      toastAxiosError(error, 'Failed to resend code.');
      console.error('Resend error:', error);
    }
  };

  return (
    <AuthLayout
      title="Verify your email"
      subtitle={
        email ? (
          <>
            We sent a {OTP_LENGTH}-digit code to{' '}
            <span className="font-semibold text-foreground">{email}</span>.
          </>
        ) : (
          `Enter the ${OTP_LENGTH}-digit code we just sent.`
        )
      }
      heroTitle={
        <>
          One last step to
          <br />
          secure your account.
        </>
      }
      heroDescription="OTP codes never leave the device that requested them and expire automatically."
    >
      <div className="mb-6 flex items-center gap-3 rounded-xl border border-border bg-brand-soft px-4 py-3 text-sm text-accent-foreground">
        <ShieldCheck className="h-5 w-5 shrink-0" aria-hidden="true" />
        <span>
          The code expires in 10 minutes. Don&apos;t share it with anyone.
        </span>
      </div>

      <form onSubmit={handleContinue} noValidate>
        <div className="mb-6">
          <OtpInput
            value={otp}
            onChange={setOtp}
            length={OTP_LENGTH}
            autoFocus
            onComplete={() => handleContinue()}
          />
        </div>

        <Button type="submit" size="xl" block loading={isLoading} className="h-12 text-base">
          {isLoading ? 'Verifying…' : 'Verify & continue'}
        </Button>

        <p className="mt-5 text-center text-sm text-muted-foreground">
          Didn&apos;t get the code?{' '}
          <button
            type="button"
            onClick={handleResend}
            className="font-semibold text-primary hover:underline underline-offset-4"
          >
            Resend code
          </button>
        </p>
      </form>
    </AuthLayout>
  );
}

export default function OTPVerification() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-background p-6">
          <div className="w-full max-w-[440px] space-y-4">
            <Skeleton className="h-8 w-2/3" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-14 w-full rounded-xl" />
          </div>
        </div>
      }
    >
      <OTPVerificationContent />
    </Suspense>
  );
}
