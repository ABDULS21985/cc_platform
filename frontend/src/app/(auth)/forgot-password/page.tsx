'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  Mail,
  RotateCcw,
  ShieldAlert,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ApiService } from '@/services/api';
import { toast } from 'sonner';
import { toastAxiosError } from '@/hooks/useAxiosError';
import {
  AnimatePresence,
  FadeIn,
  motion,
} from '@/components/ui/motion';
import { OtpInput } from '@/components/auth/OtpInput';
import {
  PasswordStrength,
  passwordScore,
} from '@/components/auth/PasswordStrength';
import { ThemeSwitcher } from '@/components/layout/ThemeSwitcher';
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

/**
 * WebOTP API — auto-fills the OTP from an SMS without the user copying.
 * Chrome on Android only; cleanly no-ops elsewhere. Requires the SMS to
 * include `@<origin> #<code>` per the WebOTP spec; harmless if absent.
 */
function useWebOtp(active: boolean, onCode: (code: string) => void) {
  useEffect(() => {
    if (!active || typeof window === 'undefined') return;
    type OtpCredential = Credential & { code: string };
    type OtpCredentialsContainer = CredentialsContainer & {
      get?: (options: { otp: { transport: string[] }; signal: AbortSignal }) =>
        Promise<OtpCredential | null>;
    };
    const creds = navigator.credentials as OtpCredentialsContainer | undefined;
    if (!creds || typeof creds.get !== 'function') return;
    const ac = new AbortController();
    creds
      .get({ otp: { transport: ['sms'] }, signal: ac.signal })
      .then((cred: OtpCredential | null) => {
        if (cred?.code) onCode(cred.code);
      })
      .catch(() => {
        /* user cancelled or unsupported — silent */
      });
    return () => ac.abort();
  }, [active, onCode]);
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

  // Focus management between AnimatePresence steps.
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (step === 1) emailRef.current?.focus();
    else if (step === 3) passwordRef.current?.focus();
    // step 2 (OTP) auto-focuses its first cell internally; step 4 has no input
  }, [step]);

  // SR announcement for step transitions.
  const announcement = `Step ${step} of ${STEPS.length}, ${
    STEPS.find((s) => s.id === step)?.label ?? 'Done'
  }`;

  // Wire WebOTP only on the verify step.
  useWebOtp(step === 2, (code) => {
    setOtp(code.replace(/\D/g, '').slice(0, OTP_LENGTH));
  });

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
      toast.success("If an account exists, we've sent a reset code");
      resend.start();
      setStep(2);
    } catch (error) {
      toastAxiosError(error, 'Failed to send reset code');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerify = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (otp.length !== OTP_LENGTH) {
      setErrors({ otp: `Enter the full ${OTP_LENGTH}-digit code` });
      return;
    }
    setErrors({});
    setStep(3);
  };

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
      const err = error as {
        response?: { status?: number; data?: { message?: string } };
      };
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

  const heading: Record<StepId, { title: string; subtitle: React.ReactNode }> = {
    1: {
      title: 'Forgot password?',
      subtitle: 'Enter your email and we’ll send a 6-digit code to reset it.',
    },
    2: {
      title: 'Check your email',
      subtitle: (
        <>
          We sent a code to{' '}
          <span className="font-semibold text-foreground">
            {email || 'your inbox'}
          </span>
          . It expires in 10 minutes.
        </>
      ),
    },
    3: {
      title: 'Set a new password',
      subtitle: 'Choose something strong. All other sessions will be signed out.',
    },
    4: {
      title: 'You’re all set',
      subtitle: 'Your password has been updated.',
    },
  };

  const handleBack = () => {
    if (step === 1) router.push('/signin');
    else if (step !== 4) setStep((step - 1) as StepId);
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground">
      {/* SR-only live region for step announcements */}
      <p
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {announcement}
      </p>

      {/* Ambient brand glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
      >
        <div className="absolute -top-40 left-1/2 h-[640px] w-[640px] -translate-x-1/2 rounded-full bg-brand/20 blur-[120px]" />
        <div className="absolute -right-40 top-1/2 h-[480px] w-[480px] -translate-y-1/2 rounded-full bg-brand-bright/20 blur-[120px]" />
        <div className="absolute -bottom-40 left-0 h-[360px] w-[360px] rounded-full bg-info/15 blur-[120px]" />
      </div>

      {/* Top bar */}
      <header className="relative z-10 mx-auto flex w-full max-w-7xl items-center justify-between px-5 py-5 sm:px-8 lg:px-10">
        <Link href="/" aria-label="CCPay home" className="inline-flex items-center gap-2">
          <Image
            src="/images/main-logo.svg"
            alt=""
            width={36}
            height={36}
            className="h-9 w-9"
            aria-hidden="true"
          />
          <span className="text-base font-semibold tracking-tight">CCPay</span>
        </Link>
        <div className="flex items-center gap-3">
          <ThemeSwitcher />
          <Link
            href="/signin"
            className="hidden text-sm font-medium text-muted-foreground transition-colors hover:text-foreground sm:inline"
          >
            Remembered it?{' '}
            <span className="font-semibold text-primary underline-offset-4 hover:underline">
              Sign in
            </span>
          </Link>
        </div>
      </header>

      {/* Main grid */}
      <main className="relative z-10 mx-auto grid w-full max-w-7xl grid-cols-1 gap-12 px-5 pb-16 pt-4 sm:px-8 lg:grid-cols-[1.05fr_1fr] lg:gap-16 lg:px-10 lg:pt-8">
        {/* Form column */}
        <section
          className="flex flex-col justify-center"
          aria-labelledby="recovery-heading"
        >
          <FadeIn>
            <Badge variant="soft" size="lg" className="gap-1.5">
              <KeyRound className="size-3" aria-hidden="true" />
              Account recovery
            </Badge>
          </FadeIn>

          <FadeIn delay={0.05}>
            <h1
              id="recovery-heading"
              className="mt-5 text-balance text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-5xl"
            >
              We’ll get you{' '}
              <span className="bg-gradient-to-br from-brand to-brand-bright bg-clip-text text-transparent">
                back in.
              </span>
            </h1>
          </FadeIn>

          <FadeIn delay={0.1}>
            <p className="mt-4 max-w-lg text-pretty text-base text-muted-foreground sm:text-lg">
              Resetting your password takes under a minute. Your data stays encrypted
              at every step.
            </p>
          </FadeIn>

          {/* CTA card */}
          <FadeIn delay={0.18}>
            <div className="mt-8 rounded-2xl border border-border bg-card/80 p-5 shadow-sm backdrop-blur-md sm:p-6">
              <div className="mb-5 flex items-center justify-between gap-3">
                <Stepper current={step} />
                {step !== 1 && step !== 4 && (
                  <button
                    type="button"
                    onClick={handleBack}
                    className="inline-flex h-8 items-center gap-1 rounded-full px-2 text-xs font-semibold text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <ArrowLeft className="size-3.5" aria-hidden="true" /> Back
                  </button>
                )}
              </div>

              <header className="mb-5">
                <h2 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                  {heading[step].title}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {heading[step].subtitle}
                </p>
              </header>

              {step === 2 && email && (
                <div className="mb-5 flex items-center justify-between gap-3 rounded-xl border border-border bg-muted/40 px-3.5 py-2.5">
                  <span className="inline-flex min-w-0 items-center gap-2 text-sm">
                    <Mail
                      className="size-4 shrink-0 text-muted-foreground"
                      aria-hidden="true"
                    />
                    <span className="truncate text-foreground">{email}</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="shrink-0 rounded-md px-1 text-xs font-semibold text-primary hover:underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    Change
                  </button>
                </div>
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
                        ref={emailRef}
                        type="email"
                        inputMode="email"
                        autoComplete="email"
                        placeholder="name@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        aria-invalid={errors.email ? 'true' : undefined}
                        aria-describedby={errors.email ? 'email-error' : undefined}
                        required
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
                      trailingIcon={
                        !isLoading ? <ArrowRight className="size-4" /> : undefined
                      }
                      className="h-12 text-base"
                    >
                      {isLoading ? 'Sending…' : 'Send reset code'}
                    </Button>

                    <p className="text-center text-xs text-muted-foreground">
                      For your security, we don’t reveal whether an email is registered.
                      You’ll get the next step regardless.
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
                      <span className="text-muted-foreground">
                        Didn’t get the code?
                      </span>
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
                        {resend.canResend
                          ? 'Resend code'
                          : `Resend in ${resend.remaining}s`}
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
                          ref={passwordRef}
                          type={showPassword ? 'text' : 'password'}
                          autoComplete="new-password"
                          placeholder="At least 8 characters"
                          value={password}
                          onChange={(e) => {
                            setPassword(e.target.value);
                            if (errors.password)
                              setErrors({ ...errors, password: undefined });
                          }}
                          aria-invalid={errors.password ? 'true' : undefined}
                          aria-describedby={
                            errors.password ? 'password-error' : undefined
                          }
                          required
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
                            errors.confirmPassword ||
                            (confirmPassword && !passwordsMatch)
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
                          {passwordsMatch
                            ? 'Passwords match'
                            : 'Passwords don’t match'}
                        </p>
                      ) : null}
                    </div>

                    <div className="flex items-start gap-3 rounded-xl border border-warning/30 bg-warning/10 p-3.5">
                      <ShieldAlert
                        className="mt-0.5 size-4 shrink-0 text-warning"
                        aria-hidden="true"
                      />
                      <div className="text-xs text-foreground">
                        <p className="font-medium">
                          All other sessions will be signed out.
                        </p>
                        <p className="text-muted-foreground">
                          You’ll need to sign in again on every other device after
                          resetting.
                        </p>
                      </div>
                    </div>

                    <Button
                      type="submit"
                      size="xl"
                      block
                      loading={isLoading}
                      disabled={!passwordValid || !passwordsMatch}
                      trailingIcon={
                        !isLoading ? <Lock className="size-4" /> : undefined
                      }
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
                      transition={{
                        delay: 0.15,
                        duration: 0.5,
                        ease: [0.34, 1.56, 0.64, 1],
                      }}
                      className="mx-auto mb-4 grid size-14 place-items-center rounded-full bg-success/15 text-success"
                    >
                      <CheckCircle2 className="size-8" aria-hidden="true" />
                    </motion.div>
                    <h2 className="text-lg font-semibold tracking-tight text-foreground">
                      You’re all set
                    </h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Your password was updated successfully.
                      {email && (
                        <>
                          {' '}
                          You’ll receive a confirmation email at{' '}
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
            </div>
          </FadeIn>

          {/* Mobile sign-in echo */}
          <p className="mt-6 text-center text-sm text-muted-foreground sm:hidden">
            Remembered it?{' '}
            <Link
              href="/signin"
              className="font-semibold text-primary underline-offset-4 hover:underline"
            >
              Sign in
            </Link>
          </p>
        </section>

        {/* Hero / mockup column */}
        <section
          aria-hidden="true"
          className="relative hidden min-h-[560px] items-center justify-center lg:flex"
        >
          <div className="relative aspect-[4/5] w-full max-w-[460px]">
            <div className="absolute inset-0 rounded-[2.5rem] bg-gradient-to-br from-brand via-brand to-[oklch(0.18_0.025_220)] shadow-2xl" />
            <div className="absolute inset-0 rounded-[2.5rem] bg-[radial-gradient(circle_at_30%_15%,rgba(255,255,255,0.18),transparent_60%)]" />
            <div className="pointer-events-none absolute -top-10 -right-10 size-44 rounded-full bg-white/10 blur-2xl" />

            {/* Card 1 — Email arriving (Step 1) */}
            <motion.div
              initial={{ opacity: 0, y: 24, rotate: -3 }}
              animate={{ opacity: step >= 1 ? 1 : 0.4, y: 0, rotate: -3 }}
              transition={{ delay: 0.15, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className={cn(
                'absolute left-6 top-12 w-[68%] rounded-2xl border border-white/15 bg-white/10 p-4 text-white shadow-xl backdrop-blur-xl transition-opacity',
                step > 1 && 'ring-1 ring-success/50'
              )}
            >
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-widest text-white/80">
                  <Mail className="size-3" aria-hidden="true" />
                  Inbox
                </span>
                <span
                  className={cn(
                    'grid size-5 place-items-center rounded-full text-[10px] font-bold transition-colors',
                    step > 1
                      ? 'bg-success text-white'
                      : 'bg-white/20 text-white/80'
                  )}
                >
                  {step > 1 ? <Check className="size-3" /> : '1'}
                </span>
              </div>
              <p className="mt-3 text-sm font-semibold leading-tight">
                CCPay · Reset code
              </p>
              <p className="mt-0.5 text-[11px] text-white/70">
                Use this 6-digit code to reset your password
              </p>
              <p className="mt-3 font-mono text-2xl font-black tracking-[0.3em]">
                4&nbsp;7&nbsp;2&nbsp;8&nbsp;1&nbsp;9
              </p>
            </motion.div>

            {/* Card 2 — OTP entry (Step 2) */}
            <motion.div
              initial={{ opacity: 0, y: 24, rotate: 4 }}
              animate={{ opacity: step >= 2 ? 1 : 0.4, y: 0, rotate: 4 }}
              transition={{ delay: 0.3, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className={cn(
                'absolute right-3 top-44 w-[60%] rounded-2xl border border-white/15 bg-white/15 p-4 text-white shadow-xl backdrop-blur-xl transition-opacity',
                step > 2 && 'ring-1 ring-success/50'
              )}
            >
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-widest text-white/80">
                  <KeyRound className="size-3" aria-hidden="true" />
                  Verify
                </span>
                <span
                  className={cn(
                    'grid size-5 place-items-center rounded-full text-[10px] font-bold transition-colors',
                    step > 2
                      ? 'bg-success text-white'
                      : 'bg-white/20 text-white/80'
                  )}
                >
                  {step > 2 ? <Check className="size-3" /> : '2'}
                </span>
              </div>
              <div className="mt-3 grid grid-cols-6 gap-1">
                {['4', '7', '2', '8', '1', '9'].map((d, i) => (
                  <span
                    key={i}
                    className="grid h-7 place-items-center rounded-md border border-white/20 bg-white/10 text-xs font-bold"
                  >
                    {step >= 2 ? d : ''}
                  </span>
                ))}
              </div>
              {step >= 2 && (
                <div className="mt-2 inline-flex items-center gap-1.5 text-[10px] font-semibold text-white/80">
                  <span className="relative flex size-1.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-75" />
                    <span className="relative inline-flex size-1.5 rounded-full bg-success" />
                  </span>
                  Code matched
                </div>
              )}
            </motion.div>

            {/* Card 3 — Lock secured (Step 3+) */}
            <motion.div
              initial={{ opacity: 0, y: 24, rotate: -2 }}
              animate={{ opacity: step >= 3 ? 1 : 0.4, y: 0, rotate: -2 }}
              transition={{ delay: 0.45, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className={cn(
                'absolute bottom-12 left-8 w-[78%] rounded-2xl border border-white/15 bg-white/10 p-4 text-white shadow-xl backdrop-blur-xl transition-opacity',
                step >= 4 && 'ring-1 ring-success/50'
              )}
            >
              <div className="flex items-center gap-3">
                <span
                  className={cn(
                    'grid size-10 place-items-center rounded-full transition-colors',
                    step >= 4
                      ? 'bg-success/30 text-white'
                      : 'bg-white/15 text-white'
                  )}
                >
                  {step >= 4 ? (
                    <CheckCircle2 className="size-5" aria-hidden="true" />
                  ) : (
                    <Lock className="size-5" aria-hidden="true" />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">
                    {step >= 4 ? 'Account secured' : 'Awaiting new password'}
                  </p>
                  <p className="text-[11px] text-white/70">
                    {step >= 4
                      ? '256-bit encrypted · just now'
                      : 'All other sessions will sign out'}
                  </p>
                </div>
              </div>
              <div className="mt-3 flex items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-semibold">
                  <Sparkles className="size-3" aria-hidden="true" />
                  Strong
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-semibold">
                  <Lock className="size-3" aria-hidden="true" />
                  Encrypted
                </span>
              </div>
            </motion.div>
          </div>
        </section>
      </main>

      <footer className="relative z-10 mx-auto w-full max-w-7xl border-t border-border px-5 py-6 sm:px-8 lg:px-10">
        <p className="text-center text-xs text-muted-foreground sm:text-left">
          End-to-end encrypted recovery · Bell MFB &amp; SafeHaven settlement partners ·{' '}
          <span className="font-medium text-foreground">256-bit secured</span>.
        </p>
      </footer>
    </div>
  );
}
