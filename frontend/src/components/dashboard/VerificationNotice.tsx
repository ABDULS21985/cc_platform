'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowRight,
  Check,
  Fingerprint,
  ShieldAlert,
  ShieldCheck,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { motion, AnimatePresence } from '@/components/ui/motion';
import { cn } from '@/lib/utils';
import { ApiService } from '@/services/api';

interface VerificationData {
  bvn_verified?: boolean;
  nin_verified?: boolean;
  email_verified?: boolean;
}

const STORAGE_KEY = 'verification-notice-dismissed';

export default function VerificationNotice() {
  const router = useRouter();
  const [verification, setVerification] = React.useState<VerificationData | null>(
    null
  );
  const [dismissed, setDismissed] = React.useState(false);

  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    // Seed from localStorage so the banner doesn't flash on initial mount;
    // we'll refresh from the API right after.
    try {
      const stored = window.localStorage.getItem('verification_data');
      if (stored) setVerification(JSON.parse(stored));
    } catch {
      /* ignore */
    }
    const closed = window.sessionStorage.getItem(STORAGE_KEY) === '1';
    setDismissed(closed);

    // Authoritative refresh: pull current status from the backend so the
    // banner reflects verifications completed in another tab/device.
    let cancelled = false;
    (async () => {
      try {
        const res = await ApiService.verification.getStatus();
        if (cancelled) return;
        const data = res.data?.data;
        if (!data) return;
        // The endpoint returns a single combined record; `verified=true`
        // means the user has at least one successful verification (BVN
        // or NIN). For a richer signal we keep any localStorage-sourced
        // per-type flags and overlay the API truth on top.
        const verificationType = (data.verification_type ?? '').toLowerCase();
        setVerification((prev) => {
          const merged: VerificationData = {
            ...(prev ?? {}),
          };
          if (data.verified && verificationType === 'bvn') {
            merged.bvn_verified = true;
          } else if (data.verified && verificationType === 'nin') {
            merged.nin_verified = true;
          } else if (data.verified) {
            // Type unknown but verified — assume both for the banner UX.
            merged.bvn_verified = true;
            merged.nin_verified = true;
          }
          return merged;
        });
        // Persist for next mount so we don't re-fetch.
        try {
          window.localStorage.setItem(
            'verification_data',
            JSON.stringify({
              bvn_verified:
                data.verified && verificationType === 'bvn' ? true : undefined,
              nin_verified:
                data.verified && verificationType === 'nin' ? true : undefined,
            }),
          );
        } catch {
          /* storage may be full or unavailable */
        }
      } catch {
        // Network error or 401 — keep the localStorage-sourced view.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!verification || dismissed) return null;

  const { bvn_verified, nin_verified } = verification;
  if (bvn_verified && nin_verified) return null;

  const completed = [bvn_verified, nin_verified].filter(Boolean).length;
  const total = 2;
  const pct = Math.round((completed / total) * 100);

  const dismiss = () => {
    setDismissed(true);
    if (typeof window !== 'undefined') {
      window.sessionStorage.setItem(STORAGE_KEY, '1');
    }
  };

  return (
    <AnimatePresence>
      <motion.section
        layout
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        aria-labelledby="verification-heading"
        className={cn(
          'relative overflow-hidden rounded-2xl border border-warning/30 bg-warning/5 p-5 sm:p-6'
        )}
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-16 -right-16 h-40 w-40 rounded-full bg-warning/15 blur-3xl"
        />

        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-start">
          <span
            className="grid size-11 shrink-0 place-items-center rounded-xl bg-warning/15 text-warning"
            aria-hidden="true"
          >
            <ShieldAlert className="size-5" />
          </span>

          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3
                  id="verification-heading"
                  className="text-base font-semibold tracking-tight text-foreground"
                >
                  Complete your verification
                </h3>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  Unlock higher transaction limits and full feature access — about 60 seconds.
                </p>
              </div>
              <Badge variant="warningSoft" size="lg" className="shrink-0">
                {completed}/{total} done
              </Badge>
            </div>

            {/* Progress */}
            <div className="mt-4 flex items-center gap-2">
              <div
                className="h-1 flex-1 overflow-hidden rounded-full bg-warning/15"
                role="progressbar"
                aria-valuenow={pct}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="Verification progress"
              >
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                  className="h-full rounded-full bg-gradient-to-r from-warning to-success"
                />
              </div>
              <span className="text-[11px] font-bold tabular-nums text-foreground">
                {pct}%
              </span>
            </div>

            {/* Steps */}
            <ul className="mt-4 grid gap-2 sm:grid-cols-2">
              <li>
                <Button
                  type="button"
                  size="sm"
                  variant={bvn_verified ? 'soft' : 'outline'}
                  block
                  disabled={bvn_verified}
                  leadingIcon={
                    bvn_verified ? (
                      <Check className="size-3.5" />
                    ) : (
                      <Fingerprint className="size-3.5" />
                    )
                  }
                  trailingIcon={!bvn_verified ? <ArrowRight className="size-3.5" /> : undefined}
                  onClick={() => router.push('/dashboard/settings?tab=verification')}
                >
                  {bvn_verified ? 'BVN verified' : 'Verify BVN'}
                </Button>
              </li>
              <li>
                <Button
                  type="button"
                  size="sm"
                  variant={nin_verified ? 'soft' : 'outline'}
                  block
                  disabled={nin_verified}
                  leadingIcon={
                    nin_verified ? (
                      <Check className="size-3.5" />
                    ) : (
                      <ShieldCheck className="size-3.5" />
                    )
                  }
                  trailingIcon={!nin_verified ? <ArrowRight className="size-3.5" /> : undefined}
                  onClick={() => router.push('/dashboard/settings?tab=verification')}
                >
                  {nin_verified ? 'NIN verified' : 'Verify NIN'}
                </Button>
              </li>
            </ul>
          </div>

          <button
            type="button"
            onClick={dismiss}
            aria-label="Dismiss verification notice"
            className="absolute right-3 top-3 grid size-8 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:static"
          >
            <X className="size-3.5" aria-hidden="true" />
          </button>
        </div>
      </motion.section>
    </AnimatePresence>
  );
}
