'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AlertCircle, Check, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ApiService, SignupPayload } from '@/services/api';
import { toast } from 'sonner';
import { toastAxiosError } from '@/hooks/useAxiosError';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { FadeIn, SlideUp } from '@/components/ui/motion';
import { cn } from '@/lib/utils';

type FieldKey =
  | 'firstName'
  | 'lastName'
  | 'email'
  | 'phoneNumber'
  | 'gender'
  | 'dateOfBirth'
  | 'password';

interface FieldProps {
  id: string;
  label: string;
  required?: boolean;
  error?: string;
  hint?: string;
  children: (slot: {
    'aria-invalid'?: 'true';
    'aria-describedby'?: string;
  }) => React.ReactNode;
}

function Field({ id, label, required, error, hint, children }: FieldProps) {
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;
  const describedBy = [error ? errorId : null, hint && !error ? hintId : null]
    .filter(Boolean)
    .join(' ') || undefined;

  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-medium text-foreground">
        {label}
        {required && (
          <span className="ml-0.5 text-destructive" aria-hidden="true">
            *
          </span>
        )}
      </label>
      {children({
        'aria-invalid': error ? 'true' : undefined,
        'aria-describedby': describedBy,
      })}
      {error ? (
        <p
          id={errorId}
          role="alert"
          className="flex items-center gap-1.5 text-xs font-medium text-destructive"
        >
          <AlertCircle className="size-3.5 shrink-0" aria-hidden="true" />
          {error}
        </p>
      ) : hint ? (
        <p id={hintId} className="text-xs text-muted-foreground">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

interface PasswordCheck {
  test: (v: string) => boolean;
  label: string;
}

const PASSWORD_CHECKS: PasswordCheck[] = [
  { test: (v) => v.length >= 8, label: 'At least 8 characters' },
  { test: (v) => /[A-Z]/.test(v), label: 'One uppercase letter' },
  { test: (v) => /\d/.test(v), label: 'One number' },
  { test: (v) => /[^A-Za-z0-9]/.test(v), label: 'One symbol' },
];

function passwordScore(value: string): number {
  return PASSWORD_CHECKS.reduce((acc, c) => acc + (c.test(value) ? 1 : 0), 0);
}

function PasswordStrength({ value }: { value: string }) {
  const score = passwordScore(value);
  const visible = value.length > 0;

  const strength =
    score <= 1
      ? { label: 'Too weak', tone: 'bg-destructive', text: 'text-destructive' }
      : score === 2
        ? { label: 'Fair', tone: 'bg-warning', text: 'text-warning' }
        : score === 3
          ? { label: 'Good', tone: 'bg-info', text: 'text-info' }
          : { label: 'Strong', tone: 'bg-success', text: 'text-success' };

  return (
    <div className={cn('mt-2 space-y-2', !visible && 'opacity-50')} aria-live="polite">
      <div className="flex gap-1.5">
        {[0, 1, 2, 3].map((i) => (
          <span
            key={i}
            className={cn(
              'h-1 flex-1 rounded-full bg-muted transition-colors',
              i < score && strength.tone
            )}
          />
        ))}
      </div>
      <ul className="grid grid-cols-2 gap-1 text-[11px]">
        {PASSWORD_CHECKS.map((c) => {
          const passed = c.test(value);
          return (
            <li
              key={c.label}
              className={cn(
                'flex items-center gap-1.5 transition-colors',
                passed ? 'text-success' : 'text-muted-foreground'
              )}
            >
              <span
                className={cn(
                  'grid size-4 place-items-center rounded-full transition-colors',
                  passed ? 'bg-success/15' : 'bg-muted'
                )}
                aria-hidden="true"
              >
                <Check className="size-2.5" />
              </span>
              {c.label}
            </li>
          );
        })}
      </ul>
      {visible && (
        <p className={cn('text-[11px] font-semibold', strength.text)}>
          {strength.label}
        </p>
      )}
    </div>
  );
}

export default function AccountSetupForm() {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    dateOfBirth: '',
    email: '',
    phoneNumber: '',
    gender: '',
    password: '',
  });

  const [fieldErrors, setFieldErrors] = useState<Partial<Record<FieldKey, string>>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const router = useRouter();

  const score = useMemo(() => passwordScore(formData.password), [formData.password]);
  const passwordValid = score >= 3;

  const handleInputChange = (field: FieldKey, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (fieldErrors[field]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const validateLocally = (): boolean => {
    const next: Partial<Record<FieldKey, string>> = {};
    if (!formData.firstName) next.firstName = 'First name is required';
    if (!formData.lastName) next.lastName = 'Last name is required';
    if (!formData.email) next.email = 'Email is required';
    else if (!/^\S+@\S+\.\S+$/.test(formData.email)) next.email = 'Enter a valid email';
    if (!formData.password) next.password = 'Password is required';
    else if (!passwordValid)
      next.password = 'Password must meet at least 3 of the 4 requirements';
    setFieldErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleContinue = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!validateLocally()) {
      toast.error('Please fix the highlighted fields');
      return;
    }

    setIsLoading(true);
    try {
      const payload: SignupPayload = {
        email: formData.email,
        password: formData.password,
        firstname: formData.firstName,
        lastname: formData.lastName,
        phone_number: formData.phoneNumber || null,
        date_of_birth: formData.dateOfBirth,
        nin: null,
        role: 'user',
      };

      await ApiService.auth.signup(payload);
      toast.success('Account created — verify your email');
      router.push(`/verify-otp?email=${encodeURIComponent(formData.email)}`);
    } catch (error: unknown) {
      const err = error as {
        response?: { status?: number; data?: { errors?: { json?: Record<string, string[]> } } };
      };
      if (err.response?.status === 422 && err.response?.data?.errors?.json) {
        const apiErrors = err.response.data.errors.json;
        const newFieldErrors: Partial<Record<FieldKey, string>> = {};
        if (apiErrors.firstname) newFieldErrors.firstName = apiErrors.firstname[0];
        if (apiErrors.lastname) newFieldErrors.lastName = apiErrors.lastname[0];
        if (apiErrors.date_of_birth)
          newFieldErrors.dateOfBirth = apiErrors.date_of_birth[0];
        if (apiErrors.email) newFieldErrors.email = apiErrors.email[0];
        if (apiErrors.phone_number)
          newFieldErrors.phoneNumber = apiErrors.phone_number[0];
        if (apiErrors.password) newFieldErrors.password = apiErrors.password[0];
        if (apiErrors.gender) newFieldErrors.gender = apiErrors.gender[0];
        setFieldErrors(newFieldErrors);
        toast.error('Please fix the errors in the form');
      } else {
        toastAxiosError(error, 'Signup failed. Please try again.');
      }
      console.error('Signup error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Set up your account"
      subtitle="A few details to get you started — KYC happens in the next step."
      heroTitle={
        <>
          Create your profile
          <br />
          and belong.
        </>
      }
      heroDescription="Your details are encrypted in transit and at rest. We never share your data with third parties."
      footer={
        <>
          Already have an account?{' '}
          <Link
            href="/signin"
            className="font-semibold text-primary hover:underline underline-offset-4"
          >
            Sign in
          </Link>
        </>
      }
    >
      <FadeIn>
        <div className="mb-5 flex items-center justify-between">
          <Badge variant="soft" size="lg" className="gap-1.5">
            <span
              className="grid size-4 place-items-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground"
              aria-hidden="true"
            >
              1
            </span>
            Step 1 of 3 · Account
          </Badge>
          <span className="hidden text-xs text-muted-foreground sm:inline">
            ~2 min to complete
          </span>
        </div>
      </FadeIn>

      <SlideUp delay={0.05}>
        <form onSubmit={handleContinue} noValidate className="space-y-5">
          <fieldset className="space-y-4">
            <legend className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Personal information
            </legend>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field id="first-name" label="First name" required error={fieldErrors.firstName}>
                {(slotProps) => (
                  <Input
                    id="first-name"
                    type="text"
                    autoComplete="given-name"
                    placeholder="Ada"
                    value={formData.firstName}
                    onChange={(e) => handleInputChange('firstName', e.target.value)}
                    className="h-11"
                    {...slotProps}
                  />
                )}
              </Field>

              <Field id="last-name" label="Last name" required error={fieldErrors.lastName}>
                {(slotProps) => (
                  <Input
                    id="last-name"
                    type="text"
                    autoComplete="family-name"
                    placeholder="Lovelace"
                    value={formData.lastName}
                    onChange={(e) => handleInputChange('lastName', e.target.value)}
                    className="h-11"
                    {...slotProps}
                  />
                )}
              </Field>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field id="gender" label="Gender" error={fieldErrors.gender}>
                {(slotProps) => (
                  <Select
                    value={formData.gender}
                    onValueChange={(v) => handleInputChange('gender', v)}
                  >
                    <SelectTrigger
                      id="gender"
                      className="h-11"
                      aria-invalid={slotProps['aria-invalid']}
                      aria-describedby={slotProps['aria-describedby']}
                    >
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Male">Male</SelectItem>
                      <SelectItem value="Female">Female</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                      <SelectItem value="PreferNotToSay">Prefer not to say</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </Field>

              <Field
                id="dob"
                label="Date of birth"
                error={fieldErrors.dateOfBirth}
                hint="You must be 18 or older."
              >
                {(slotProps) => (
                  <Input
                    id="dob"
                    type="date"
                    autoComplete="bday"
                    value={formData.dateOfBirth}
                    onChange={(e) => handleInputChange('dateOfBirth', e.target.value)}
                    className="h-11"
                    max={new Date().toISOString().split('T')[0]}
                    {...slotProps}
                  />
                )}
              </Field>
            </div>
          </fieldset>

          <fieldset className="space-y-4">
            <legend className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Contact &amp; security
            </legend>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field id="email" label="Email" required error={fieldErrors.email}>
                {(slotProps) => (
                  <Input
                    id="email"
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    placeholder="ada@example.com"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    className="h-11"
                    {...slotProps}
                  />
                )}
              </Field>

              <Field id="phone" label="Phone number" error={fieldErrors.phoneNumber}>
                {(slotProps) => (
                  <Input
                    id="phone"
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    placeholder="+234..."
                    value={formData.phoneNumber}
                    onChange={(e) => handleInputChange('phoneNumber', e.target.value)}
                    className="h-11"
                    {...slotProps}
                  />
                )}
              </Field>
            </div>

            <Field id="password" label="Password" required error={fieldErrors.password}>
              {(slotProps) => (
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    placeholder="Create a strong password"
                    value={formData.password}
                    onChange={(e) => handleInputChange('password', e.target.value)}
                    className="h-11 pr-12"
                    {...slotProps}
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
              )}
            </Field>

            <PasswordStrength value={formData.password} />
          </fieldset>

          {/* Privacy reassurance */}
          <div className="flex items-start gap-3 rounded-xl border border-border bg-card/50 p-3.5">
            <ShieldCheck
              className="mt-0.5 size-5 shrink-0 text-success"
              aria-hidden="true"
            />
            <div className="text-xs text-muted-foreground">
              <p className="font-medium text-foreground">Your data is safe.</p>
              <p>
                Encrypted at rest and in transit. We use it only for KYC and account
                recovery — never sold, never shared with third parties.
              </p>
            </div>
          </div>

          <Button
            type="submit"
            size="xl"
            block
            loading={isLoading}
            className="h-12 text-base"
          >
            {isLoading ? 'Creating account…' : 'Continue'}
          </Button>

          <p className="text-center text-xs text-muted-foreground">
            By continuing you agree to our{' '}
            <Link
              href="/terms"
              className="font-semibold text-primary hover:underline underline-offset-4"
            >
              Terms of Service
            </Link>{' '}
            and{' '}
            <Link
              href="/privacy"
              className="font-semibold text-primary hover:underline underline-offset-4"
            >
              Privacy Policy
            </Link>
            .
          </p>
        </form>
      </SlideUp>
    </AuthLayout>
  );
}
