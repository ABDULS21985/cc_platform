'use client';

import * as React from 'react';
import { useMemo, useState } from 'react';
import {
  AlertCircle,
  Check,
  Eye,
  EyeOff,
  Lock,
  RotateCcw,
  ShieldCheck,
  ShieldAlert,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { ApiService } from '@/services/api';
import { toast } from 'sonner';
import { toastAxiosError } from '@/hooks/useAxiosError';
import {
  PasswordStrength,
  passwordScore,
} from '@/components/auth/PasswordStrength';
import { cn } from '@/lib/utils';

interface FieldErrors {
  currentPassword?: string;
  newPassword?: string;
  confirmPassword?: string;
}

export function ChangePasswordForm() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});

  const score = useMemo(() => passwordScore(newPassword), [newPassword]);
  const passwordValid = score >= 3;
  const passwordsMatch =
    newPassword.length > 0 && newPassword === confirmPassword;
  const isReused =
    currentPassword.length > 0 && newPassword.length > 0 && currentPassword === newPassword;

  const validate = (): boolean => {
    const next: FieldErrors = {};
    if (!currentPassword) next.currentPassword = 'Enter your current password';
    if (!newPassword) next.newPassword = 'Choose a new password';
    else if (!passwordValid)
      next.newPassword = 'Password must meet at least 3 of the 4 requirements';
    else if (isReused)
      next.newPassword = 'New password must be different from your current one';
    if (!confirmPassword) next.confirmPassword = 'Re-enter your new password';
    else if (!passwordsMatch) next.confirmPassword = 'Passwords don’t match';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) {
      toast.error('Please fix the highlighted fields');
      return;
    }
    setIsLoading(true);
    try {
      const res = await ApiService.profile.changePassword({
        current_password: currentPassword,
        new_password: newPassword,
        confirm_password: confirmPassword,
      });
      if (res.data.success) {
        toast.success(res.data.message || 'Password updated');
        handleReset();
      }
    } catch (err) {
      const error = err as { response?: { status?: number } };
      if (error.response?.status === 401) {
        setErrors({ currentPassword: 'Current password is incorrect' });
      } else {
        toastAxiosError(err, 'Failed to update password');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setErrors({});
  };

  const isDirty =
    currentPassword.length > 0 ||
    newPassword.length > 0 ||
    confirmPassword.length > 0;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Card variant="default" density="compact" className="border-warning/30 bg-warning/5">
        <CardContent className="flex items-start gap-3 px-5">
          <span
            className="grid size-9 shrink-0 place-items-center rounded-xl bg-warning/15 text-warning"
            aria-hidden="true"
          >
            <ShieldAlert className="size-4" />
          </span>
          <div className="space-y-1">
            <p className="text-sm font-semibold text-foreground">
              Changing your password signs out other sessions.
            </p>
            <p className="text-xs text-muted-foreground">
              You&apos;ll need to sign back in on every device after this.
            </p>
          </div>
        </CardContent>
      </Card>

      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        {/* Current */}
        <div className="space-y-1.5">
          <label
            htmlFor="current-password"
            className="block text-sm font-medium text-foreground"
          >
            Current password
          </label>
          <div className="relative">
            <span
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            >
              <Lock className="size-4" />
            </span>
            <Input
              id="current-password"
              type={showPasswords ? 'text' : 'password'}
              autoComplete="current-password"
              placeholder="Enter your current password"
              value={currentPassword}
              onChange={(e) => {
                setCurrentPassword(e.target.value);
                if (errors.currentPassword)
                  setErrors({ ...errors, currentPassword: undefined });
              }}
              aria-invalid={errors.currentPassword ? 'true' : undefined}
              aria-describedby={
                errors.currentPassword ? 'current-error' : undefined
              }
              required
              className="h-12 pl-10 pr-12"
            />
            <PasswordToggle
              show={showPasswords}
              onToggle={() => setShowPasswords((v) => !v)}
            />
          </div>
          {errors.currentPassword && (
            <ErrorText id="current-error">{errors.currentPassword}</ErrorText>
          )}
        </div>

        {/* New */}
        <div className="space-y-1.5">
          <label
            htmlFor="new-password"
            className="block text-sm font-medium text-foreground"
          >
            New password
          </label>
          <div className="relative">
            <span
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            >
              <ShieldCheck className="size-4" />
            </span>
            <Input
              id="new-password"
              type={showPasswords ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder="At least 8 characters"
              value={newPassword}
              onChange={(e) => {
                setNewPassword(e.target.value);
                if (errors.newPassword)
                  setErrors({ ...errors, newPassword: undefined });
              }}
              aria-invalid={errors.newPassword ? 'true' : undefined}
              aria-describedby={errors.newPassword ? 'new-error' : undefined}
              required
              className="h-12 pl-10 pr-12"
            />
            <PasswordToggle
              show={showPasswords}
              onToggle={() => setShowPasswords((v) => !v)}
            />
          </div>
          {errors.newPassword && <ErrorText id="new-error">{errors.newPassword}</ErrorText>}
        </div>

        <PasswordStrength value={newPassword} />

        {/* Confirm */}
        <div className="space-y-1.5">
          <label
            htmlFor="confirm-password"
            className="block text-sm font-medium text-foreground"
          >
            Confirm new password
          </label>
          <div className="relative">
            <span
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            >
              <ShieldCheck className="size-4" />
            </span>
            <Input
              id="confirm-password"
              type={showPasswords ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder="Re-enter your new password"
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
              className="h-12 pl-10 pr-10"
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
            <ErrorText id="confirm-error">{errors.confirmPassword}</ErrorText>
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

        <div className="flex items-center justify-end gap-3 pt-2">
          <Button
            type="button"
            variant="ghost"
            size="default"
            onClick={handleReset}
            disabled={isLoading || !isDirty}
            leadingIcon={<RotateCcw className="size-4" />}
          >
            Reset
          </Button>
          <Button
            type="submit"
            size="default"
            loading={isLoading}
            disabled={!passwordValid || !passwordsMatch || !currentPassword}
            leadingIcon={!isLoading ? <Lock className="size-4" /> : undefined}
          >
            {isLoading ? 'Updating…' : 'Update password'}
          </Button>
        </div>
      </form>
    </div>
  );
}

// ---------- Helpers ----------

function PasswordToggle({
  show,
  onToggle,
}: {
  show: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={show ? 'Hide passwords' : 'Show passwords'}
      className="absolute right-1.5 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {show ? (
        <EyeOff className="size-4" aria-hidden="true" />
      ) : (
        <Eye className="size-4" aria-hidden="true" />
      )}
    </button>
  );
}

function ErrorText({
  id,
  children,
}: {
  id: string;
  children: React.ReactNode;
}) {
  return (
    <p
      id={id}
      role="alert"
      className="flex items-center gap-1.5 text-xs font-medium text-destructive"
    >
      <AlertCircle className="size-3.5" aria-hidden="true" />
      {children}
    </p>
  );
}
