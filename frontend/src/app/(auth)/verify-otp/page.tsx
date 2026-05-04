'use client';

import React, { useState, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ApiService, VerifyOTPPyload } from '@/services/api';
import { toast } from 'sonner';
import { toastAxiosError } from '@/hooks/useAxiosError';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { cn } from '@/lib/utils';

const OTP_LENGTH = 6;

function OTPVerificationContent() {
  const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [isLoading, setIsLoading] = useState(false);
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get('email') || '';

  const handleContinue = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const otpValue = otp.join('');
    if (otpValue.length !== OTP_LENGTH) {
      toast.error(`Please enter the ${OTP_LENGTH}-digit code`);
      return;
    }
    if (!email) {
      toast.error('Email not found. Please sign up again.');
      return;
    }

    setIsLoading(true);
    try {
      const verifyPayload: VerifyOTPPyload = { email, otp: otpValue };
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

  const handleInputChange = (index: number, value: string) => {
    const sanitized = value.replace(/\D/g, '').slice(-1);
    const next = [...otp];
    next[index] = sanitized;
    setOtp(next);
    if (sanitized && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    if (e.key === 'ArrowRight' && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH);
    if (!pasted) return;
    const next = [...otp];
    for (let i = 0; i < pasted.length; i++) next[i] = pasted[i];
    setOtp(next);
    const nextEmpty = next.findIndex((v) => v === '');
    const focusIndex = nextEmpty === -1 ? OTP_LENGTH - 1 : nextEmpty;
    inputRefs.current[focusIndex]?.focus();
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
        ) as unknown as string
          : `Enter the ${OTP_LENGTH}-digit code we just sent.`
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
        <fieldset className="mb-6">
          <legend className="sr-only">Enter the verification code</legend>
          <div className="flex justify-between gap-2 sm:gap-3">
            {otp.map((digit, index) => (
              <input
                key={index}
                ref={(el) => {
                  inputRefs.current[index] = el;
                }}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                autoComplete={index === 0 ? 'one-time-code' : 'off'}
                maxLength={1}
                value={digit}
                onChange={(e) => handleInputChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                onPaste={handlePaste}
                aria-label={`Digit ${index + 1} of ${OTP_LENGTH}`}
                className={cn(
                  'h-12 w-10 sm:h-14 sm:w-12 rounded-xl border bg-card text-center text-lg font-semibold text-foreground shadow-xs transition-colors',
                  digit ? 'border-primary' : 'border-border',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-ring'
                )}
              />
            ))}
          </div>
        </fieldset>

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
