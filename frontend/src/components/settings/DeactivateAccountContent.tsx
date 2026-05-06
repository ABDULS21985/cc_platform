'use client';

import * as React from 'react';
import { useEffect, useState } from 'react';
import { AlertTriangle, ShieldAlert, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { ApiService } from '@/services/api';
import { toast } from 'sonner';

interface Blocker {
  kind: string;
  message: string;
  [key: string]: unknown;
}

export function DeactivateAccountContent() {
  const [loading, setLoading] = useState(true);
  const [blockers, setBlockers] = useState<Blocker[]>([]);
  const [canDeactivate, setCanDeactivate] = useState(false);
  const [graceDays, setGraceDays] = useState(30);

  const [confirmEmail, setConfirmEmail] = useState('');
  const [password, setPassword] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [userEmail, setUserEmail] = useState('');

  const runPreflight = async () => {
    setLoading(true);
    try {
      const res = await ApiService.auth.deactivation.preflight();
      const data = res.data?.data;
      setBlockers(data?.blockers ?? []);
      setCanDeactivate(!!data?.can_deactivate);
      setGraceDays(data?.grace_days ?? 30);
    } catch {
      toast.error('Could not check deactivation status');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    ApiService.profile.get()
      .then((res) => {
        if (!cancelled) setUserEmail(res.data?.data?.email ?? '');
      })
      .catch(() => {
        if (!cancelled) setUserEmail('');
      });
    runPreflight();
    return () => {
      cancelled = true;
    };
  }, []);

  const emailMatches = confirmEmail.trim().toLowerCase() === userEmail.toLowerCase();
  const canSubmit =
    canDeactivate && emailMatches && password.length > 0 && !submitting;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      await ApiService.auth.deactivation.deactivate({
        password,
        reason: reason.trim() || undefined,
      });
      setSubmitted(true);
      toast.success('Account deactivated');
      // Best-effort: redirect to login after a beat.
      setTimeout(() => {
        window.location.href = '/login';
      }, 1500);
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 401) {
        toast.error('Incorrect password');
      } else if (status === 400) {
        toast.error('State changed — refresh to see updated blockers');
        runPreflight();
      } else {
        toast.error('Deactivation failed');
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 rounded-2xl" />
        <Skeleton className="h-32 rounded-2xl" />
      </div>
    );
  }

  if (submitted) {
    return (
      <Card variant="default" density="compact">
        <CardContent className="space-y-3 px-6">
          <div className="grid size-12 place-items-center rounded-full bg-warning/15 text-warning">
            <ShieldAlert className="size-6" aria-hidden="true" />
          </div>
          <h2 className="text-xl font-bold tracking-tight">Account deactivated</h2>
          <p className="text-sm text-muted-foreground">
            Sign in again any time within the next {graceDays} days to reactivate.
            After that, your personal info will be permanently removed.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card
        variant="outline"
        density="compact"
        className="border-destructive/40 bg-destructive/5"
      >
        <CardContent className="space-y-3 px-6">
          <div className="flex items-start gap-3">
            <span
              className="grid size-9 shrink-0 place-items-center rounded-xl bg-destructive/15 text-destructive"
              aria-hidden="true"
            >
              <AlertTriangle className="size-4" />
            </span>
            <div>
              <h2 className="text-base font-bold tracking-tight text-foreground">
                Deactivate your account
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                You'll be signed out everywhere. You have {graceDays} days to
                change your mind by signing in again. After {graceDays} days,
                your personal data is removed and the account cannot be
                recovered.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {blockers.length > 0 && (
        <Card variant="default" density="compact">
          <CardContent className="space-y-3 px-6">
            <h3 className="text-sm font-bold tracking-tight text-foreground">
              Resolve these first
            </h3>
            <ul role="list" className="space-y-2">
              {blockers.map((b, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <Wallet
                    className="mt-0.5 size-4 shrink-0 text-warning"
                    aria-hidden="true"
                  />
                  <span className="text-foreground">{b.message}</span>
                </li>
              ))}
            </ul>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={runPreflight}
            >
              Re-check
            </Button>
          </CardContent>
        </Card>
      )}

      <Card variant="default" density="compact">
        <CardContent className="space-y-4 px-6">
          <div>
            <label
              htmlFor="confirm-email"
              className="text-xs font-bold uppercase tracking-widest text-muted-foreground"
            >
              Type your email to confirm
            </label>
            <Input
              id="confirm-email"
              autoComplete="off"
              placeholder={userEmail || 'you@example.com'}
              value={confirmEmail}
              onChange={(e) => setConfirmEmail(e.target.value)}
              className="mt-2"
            />
            {confirmEmail.length > 0 && !emailMatches && (
              <p className="mt-1 text-xs text-destructive">
                Doesn't match the email on file.
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="confirm-password"
              className="text-xs font-bold uppercase tracking-widest text-muted-foreground"
            >
              Password
            </label>
            <Input
              id="confirm-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-2"
            />
          </div>

          <div>
            <label
              htmlFor="reason"
              className="text-xs font-bold uppercase tracking-widest text-muted-foreground"
            >
              Reason (optional)
            </label>
            <Input
              id="reason"
              placeholder="What made you decide to leave?"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="mt-2"
              maxLength={500}
            />
          </div>

          <div className="flex items-center justify-between gap-3 pt-2">
            <Badge variant="warningSoft" size="sm">
              Soft delete · {graceDays}-day grace
            </Badge>
            <Button
              type="button"
              variant="destructive"
              size="default"
              disabled={!canSubmit}
              onClick={handleSubmit}
            >
              {submitting ? 'Deactivating…' : 'Deactivate account'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
