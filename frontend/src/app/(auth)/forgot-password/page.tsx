'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  AlertCircle,
  ArrowRight,
  Check,
  CheckCircle2,
  Eye,
  EyeOff,
  Lock,
  Mail,
  RotateCcw,
  ShieldAlert,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ApiService } from '@/services/api';
import { toast } from 'sonner';
import { toastAxiosError } from '@/hooks/useAxiosError';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { AnimatePresence, FadeIn, motion } from '@/components/ui/motion';
import { OtpInput } from '@/components/auth/OtpInput';
import { PasswordStrength, passwordScore } from '@/components/auth/PasswordStrength';
import { cn } from '@/lib/utils';

type StepId = 1 | 2 | 3 | 4;

const OTP_LENGTH = 6;
const RESEND_SECONDS = 30;

const STEPS: Array<{ id: StepId; label: string }> = [
  { id: 1, label: 'Email' },
  { id: 2, label: 'Verify' },
  { id: 3, label: 'New password' },
];

interface StepperProps {
  current: StepId;
}

function Stepper({ current }: StepperProps) {
  return (
    <ol
      role="list"
      aria-label="Password reset progress"
      className="flex items-center gap-2"
    >
      {STEPS.map((s, i) => {
        const done = current > s.id;
        const active = current === s.id;
        return (
          <li key={s.id} className="flex items-center gap-2">
            <span
              aria-current={active ? 'step' : undefined}
              className={cn(
                'flex items-center gap-2 rounded-full px-2.5 py-1 text-xs font-medium transition-colors',
                active && 'bg-brand-soft text-accent-foreground',
                done && 'text-success',
                !active && !done && 'text-muted-foreground'
              )}
            >
              <span
                className={cn(
                  'grid size-5 place-items-center rounded-full text-[10px] font-bold transition-colors',
                  active && 'bg-primary text-primary-foreground',
                  done && 'bg-success/15 text-success',
                  !active && !done && 'bg-muted text-muted-foreground'
                )}
                aria-hidden="true"
              >
                {done ? <Check className="size-3" /> : s.id}
              </span>
              <span className="hidden sm:inline">{s.label}</span>
            </span>
            {i < STEPS.length - 1 && (
              <span
                aria-hidden="true"
                className={cn(
                  'h-px w-4 transition-colors sm:w-6',
                  done ? 'bg-success' : 'bg-border'
                )}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}

function useResendCountdown(seconds: number) {
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    if (remaining <= 0) return;
    const t = window.setInterval(() => {
      setRemaining((r) => (r > 0 ? r - 1 : 0));
    }, 1000);
    return () => window.clearInterval(t);
  }, [remaining]);

  return {
    remaining,
    start: () => setRemaining(seconds),
    canResend: remaining === 0,
  };
}

export default function ForgotPassword() {
  const router = useRouter();

  const [step, setStep] = useState<StepId>(1);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{
    email?: string;
    otp?: string;
    password?: string;
    confirmPassword?: string;
  }>({});

  const resend = useResendCountdown(RESEND_SECONDS);

  const score = useMemo(() => passwordScore(password), [password]);
  const passwordValid = score >= 3;
  const passwordsMatch = password.length > 0 && password === confirmPassword;

  // ── Step 1 — Request reset code ─────────────────────────────────────────
  const handleRequest = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) {
      setErrors({ email: 'Email is required' });
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(trimmed)) {
      setErrors({ email: 'Enter a valid email address' });
      return;
    }
    setErrors({});
    setIsLoading(true);
    try {
      await ApiService.auth.forgotPassword({ email: trimmed });
      // Don't reveal whether the email exists — same UX either way.
      toast.success("If an account exists, we've sent a reset code");
      resend.start();
      setStep(2);
    } catch (error) {
      toastAxiosError(error, 'Failed to send reset code');
    } finally {
      setIsLoading(false);
    }
  };

  // ── Step 2 — Verify code locally ────────────────────────────────────────
  const handleVerify = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (otp.length !== OTP_LENGTH) {
      setErrors({ otp: `Enter the full ${OTP_LENGTH}-digit code` });
      return;
    }
    setErrors({});
    setStep(3);
  };

  // ── Step 3 — Submit new password ────────────────────────────────────────
  const handleReset = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const next: typeof errors = {};
    if (!password) next.password = 'Password is required';
    else if (!passwordValid)
      next.password = 'Password must meet at least 3 of the 4 requirements';
    if (!confirmPassword) next.confirmPassword = 'Please confirm your password';
    else if (!passwordsMatch) next.confirmPassword = 'Passwords don’t match';
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setIsLoading(true);
    try {
      const res = await ApiService.auth.resetPassword({
        email: email.trim(),
        otp,
        new_password: password,
      });
      if (res.data.success) {
        setStep(4);
      } else {
        toast.error(res.data.message || 'Failed to reset password');
      }
    } catch (error) {
      const err = error as { response?: { status?: number; data?: { message?: string } } };
      if (err.response?.status === 400 || err.response?.status === 401) {
        setErrors({ otp: 'Invalid or expired code — request a new one' });
        setStep(2);
      } else {
        toastAxiosError(error, 'Failed to reset password');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (!resend.canResend || !email) return;
    setIsLoading(true);
    try {
      await ApiService.auth.forgotPassword({ email: email.trim() });
      toast.success('A new code is on its way');
      resend.start();
    } catch (error) {
      toastAxiosError(error, 'Failed to resend code');
    } finally {
      setIsLoading(false);
    }
  };

  // ── Layout config per step ─────────────────────────────────────────────
  const titles: Record<StepId, { title: string; subtitle: React.ReactNode }> = {
    // typed map below: each step's heading + lead paragraph.
    1: {
      title: 'Forgot password?',
      subtitle:
        "Enter your email and we'll send a 6-digit code to reset your password.",
    },
    2: {
      title: 'Check your email',
      subtitle: (
        <>
          We sent a code to{' '}
          <span className="font-semibold text-foreground">{email || 'your inbox'}</span>.
          It expires in 10 minutes.
        </>
      ),
    },
    3: {
      title: 'Set a new password',
      subtitle: 'Choose something strong. All other sessions will be signed out.',
    },
    4: {
      title: 'Password updated',
      subtitle: 'You can sign in with your new password.',
    },
  };

  const onBack =
    step === 4
      ? undefined
      : step === 1
        ? () => router.push('/signin')
        : () => setStep((step - 1) as StepId);

  return (
    <AuthLayout
      title={titles[step].title}
      subtitle={titles[step].subtitle}
      onBack={onBack}
      showBack={step !== 4}
      heroTitle={
        <>
          We&apos;ll get you
          <br />
          back in.
        </>
      }
      heroDescription="Resetting your password takes under a minute. Your data stays encrypted at every step."
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
      {step !== 4 && (
        <FadeIn>
          <div className="mb-6">
            <Stepper current={step} />
          </div>
        </FadeIn>
      )}

      {step === 2 && email && (
        <FadeIn delay={0.05}>
          <div className="mb-5 flex items-center justify-between gap-3 rounded-xl border border-border bg-card/60 px-3.5 py-2.5">
            <span className="inline-flex min-w-0 items-center gap-2 text-sm">
              <Mail className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              <span className="truncate text-foreground">{email}</span>
            </span>
            <button
              type="button"
              onClick={() => setStep(1)}
              className="shrink-0 text-xs font-semibold text-primary hover:underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-md px-1"
            >
              Change
            </button>
          </div>
        </FadeIn>
      )}

      <AnimatePresence mode="wait">
        {step === 1 && (
          <motion.form
            key="step-1"
            onSubmit={handleRequest}
            noValidate
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="space-y-5"
          >
            <div className="space-y-1.5">
              <label
                htmlFor="email"
                className="block text-sm font-medium text-foreground"
              >
                Email address
              </label>
              <Input
                id="email"
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                aria-invalid={errors.email ? 'true' : undefined}
                aria-describedby={errors.email ? 'email-error' : undefined}
                required
                autoFocus
                className="h-12"
              />
              {errors.email && (
                <p
                  id="email-error"
                  role="alert"
                  className="flex items-center gap-1.5 text-xs font-medium text-destructive"
                >
                  <AlertCircle className="size-3.5" aria-hidden="true" />
                  {errors.email}
                </p>
              )}
            </div>

            <Button
              type="submit"
              size="xl"
              block
              loading={isLoading}
              trailingIcon={!isLoading ? <ArrowRight className="size-4" /> : undefined}
              className="h-12 text-base"
            >
              {isLoading ? 'Sending…' : 'Send reset code'}
            </Button>

            <p className="text-center text-xs text-muted-foreground">
              For your security, we don&apos;t reveal whether an email is registered.
              You&apos;ll get the next step regardless.
            </p>
          </motion.form>
        )}

        {step === 2 && (
          <motion.form
            key="step-2"
            onSubmit={handleVerify}
            noValidate
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="space-y-5"
          >
            <div className="space-y-2">
              <label className="block text-sm font-medium text-foreground">
                Verification code
              </label>
              <OtpInput
                value={otp}
                onChange={(v) => {
                  setOtp(v);
                  if (errors.otp) setErrors({ ...errors, otp: undefined });
                }}
                length={OTP_LENGTH}
                autoFocus
                invalid={!!errors.otp}
                describedBy={errors.otp ? 'otp-error' : undefined}
                onComplete={() => handleVerify()}
              />
              {errors.otp && (
                <p
                  id="otp-error"
                  role="alert"
                  className="flex items-center gap-1.5 text-xs font-medium text-destructive"
                >
                  <AlertCircle className="size-3.5" aria-hidden="true" />
                  {errors.otp}
                </p>
              )}
            </div>

            <Button
              type="submit"
              size="xl"
              block
              disabled={otp.length !== OTP_LENGTH}
              trailingIcon={<ArrowRight className="size-4" />}
              className="h-12 text-base"
            >
              Continue
            </Button>

            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Didn&apos;t get the code?</span>
              <button
                type="button"
                onClick={handleResend}
                disabled={!resend.canResend || isLoading}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-semibold transition-colors',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  resend.canResend
                    ? 'text-primary hover:bg-accent hover:text-accent-foreground'
                    : 'cursor-not-allowed text-muted-foreground'
                )}
              >
                <RotateCcw className="size-3.5" aria-hidden="true" />
                {resend.canResend ? 'Resend code' : `Resend in ${resend.remaining}s`}
              </button>
            </div>
          </motion.form>
        )}

        {step === 3 && (
          <motion.form
            key="step-3"
            onSubmit={handleReset}
            noValidate
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="space-y-5"
          >
            <div className="space-y-1.5">
              <label
                htmlFor="new-password"
                className="block text-sm font-medium text-foreground"
              >
                New password
              </label>
              <div className="relative">
                <Input
                  id="new-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  placeholder="At least 8 characters"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errors.password) setErrors({ ...errors, password: undefined });
                  }}
                  aria-invalid={errors.password ? 'true' : undefined}
                  aria-describedby={errors.password ? 'password-error' : undefined}
                  required
                  autoFocus
                  className="h-12 pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-1.5 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {showPassword ? (
                    <EyeOff className="size-4" aria-hidden="true" />
                  ) : (
                    <Eye className="size-4" aria-hidden="true" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p
                  id="password-error"
                  role="alert"
                  className="flex items-center gap-1.5 text-xs font-medium text-destructive"
                >
                  <AlertCircle className="size-3.5" aria-hidden="true" />
                  {errors.password}
                </p>
              )}
            </div>

            <PasswordStrength value={password} />

            <div className="space-y-1.5">
              <label
                htmlFor="confirm-password"
                className="block text-sm font-medium text-foreground"
              >
                Confirm password
              </label>
              <div className="relative">
                <Input
                  id="confirm-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  placeholder="Re-enter your password"
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    if (errors.confirmPassword)
                      setErrors({ ...errors, confirmPassword: undefined });
                  }}
                  aria-invalid={
                    errors.confirmPassword || (confirmPassword && !passwordsMatch)
                      ? 'true'
                      : undefined
                  }
                  aria-describedby={
                    errors.confirmPassword
                      ? 'confirm-error'
                      : confirmPassword
                        ? 'confirm-status'
                        : undefined
                  }
                  required
                  className="h-12 pr-10"
                />
                {confirmPassword.length > 0 && (
                  <span
                    className={cn(
                      'absolute right-3 top-1/2 grid size-6 -translate-y-1/2 place-items-center rounded-full transition-colors',
                      passwordsMatch
                        ? 'bg-success/15 text-success'
                        : 'bg-destructive/15 text-destructive'
                    )}
                    aria-hidden="true"
                  >
                    {passwordsMatch ? (
                      <Check className="size-3.5" />
                    ) : (
                      <AlertCircle className="size-3.5" />
                    )}
                  </span>
                )}
              </div>
              {errors.confirmPassword ? (
                <p
                  id="confirm-error"
                  role="alert"
                  className="flex items-center gap-1.5 text-xs font-medium text-destructive"
                >
                  <AlertCircle className="size-3.5" aria-hidden="true" />
                  {errors.confirmPassword}
                </p>
              ) : confirmPassword ? (
                <p
                  id="confirm-status"
                  className={cn(
                    'text-[11px] font-medium',
                    passwordsMatch ? 'text-success' : 'text-destructive'
                  )}
                >
                  {passwordsMatch ? 'Passwords match' : 'Passwords don’t match'}
                </p>
              ) : null}
            </div>

            <div className="flex items-start gap-3 rounded-xl border border-warning/30 bg-warning/10 p-3.5">
              <ShieldAlert
                className="mt-0.5 size-4 shrink-0 text-warning"
                aria-hidden="true"
              />
              <div className="text-xs text-foreground">
                <p className="font-medium">All other sessions will be signed out.</p>
                <p className="text-muted-foreground">
                  You&apos;ll need to sign in again on every other device after resetting.
                </p>
              </div>
            </div>

            <Button
              type="submit"
              size="xl"
              block
              loading={isLoading}
              disabled={!passwordValid || !passwordsMatch}
              trailingIcon={!isLoading ? <Lock className="size-4" /> : undefined}
              className="h-12 text-base"
            >
              {isLoading ? 'Resetting…' : 'Reset password'}
            </Button>
          </motion.form>
        )}

        {step === 4 && (
          <motion.div
            key="step-4"
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="rounded-2xl border border-success/30 bg-success/5 p-6 text-center"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.15, duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
              className="mx-auto mb-4 grid size-14 place-items-center rounded-full bg-success/15 text-success"
            >
              <CheckCircle2 className="size-8" aria-hidden="true" />
            </motion.div>
            <h2 className="text-lg font-semibold tracking-tight text-foreground">
              You&apos;re all set
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Your password was updated successfully.
              {email && (
                <>
                  {' '}You&apos;ll receive a confirmation email at{' '}
                  <span className="font-medium text-foreground">{email}</span>.
                </>
              )}
            </p>
            <Button
              size="xl"
              block
              onClick={() => router.push('/signin')}
              trailingIcon={<ArrowRight className="size-4" />}
              className="mt-5 h-12 text-base"
            >
              Continue to sign in
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </AuthLayout>
  );
}
