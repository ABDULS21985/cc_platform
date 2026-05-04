'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Clock,
  Receipt,
  ShieldCheck,
  X,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { motion, AnimatePresence, FadeIn } from '@/components/ui/motion';
import { cn } from '@/lib/utils';
import { ApiService } from '@/services/api';

type PendingTone = 'destructive' | 'warning' | 'info';

interface PendingItem {
  id: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  meta: string;
  tone: PendingTone;
  cta: { label: string; href: string };
}

const NGN = (n: number) =>
  n.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const TONE_STYLES: Record<
  PendingTone,
  {
    border: string;
    bg: string;
    icon: string;
    badge: 'destructiveSoft' | 'warningSoft' | 'infoSoft';
  }
> = {
  destructive: {
    border: 'border-destructive/30',
    bg: 'bg-destructive/5',
    icon: 'bg-destructive/15 text-destructive',
    badge: 'destructiveSoft',
  },
  warning: {
    border: 'border-warning/30',
    bg: 'bg-warning/5',
    icon: 'bg-warning/15 text-warning',
    badge: 'warningSoft',
  },
  info: {
    border: 'border-info/30',
    bg: 'bg-info/5',
    icon: 'bg-info/15 text-info',
    badge: 'infoSoft',
  },
};

const STORAGE_KEY = 'pending-dismissed';

export function PendingActions() {
  const [dismissed, setDismissed] = React.useState<Set<string>>(() => new Set());
  const [items, setItems] = React.useState<PendingItem[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = window.sessionStorage.getItem(STORAGE_KEY);
      if (raw) setDismissed(new Set(JSON.parse(raw)));
    } catch {
      /* ignore */
    }
  }, []);

  // Build the pending list from real signals: overdue bills across joined
  // communities + identity verification status. We don't have a unified
  // /v2/me/pending endpoint — derived client-side from existing data.
  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      const next: PendingItem[] = [];
      const [verificationRes, joinedRes] = await Promise.allSettled([
        ApiService.verification.getStatus(),
        ApiService.communities.joined({ limit: 50 }),
      ]);

      // 1. Identity verification — if not verified, show the action.
      if (verificationRes.status === 'fulfilled') {
        const v = verificationRes.value.data?.data;
        if (v && !v.verified) {
          next.push({
            id: 'kyc-not-verified',
            icon: ShieldCheck,
            title: 'Verify your identity to unlock the wallet',
            meta: 'Takes about 60 seconds',
            tone: 'warning',
            cta: { label: 'Verify', href: '/dashboard/settings?tab=verification' },
          });
        }
      }

      // 2. Overdue bills across all joined communities.
      if (joinedRes.status === 'fulfilled') {
        const joined = joinedRes.value.data?.data?.communities ?? [];
        const billLists = await Promise.allSettled(
          joined.map(async (c) => ({
            community: c,
            res: await ApiService.communities.getBills(c.id, { limit: 50 }),
          })),
        );
        const now = Date.now();
        for (const r of billLists) {
          if (r.status !== 'fulfilled') continue;
          const community = r.value.community;
          const bills = ((r.value.res.data?.data as { bills?: unknown[] })?.bills ?? []) as Array<
            Record<string, unknown>
          >;
          for (const bill of bills) {
            const status = String(bill.status ?? '').toLowerCase();
            if (status === 'paid' || status === 'completed' || status === 'cancelled') continue;
            const due = String(bill.due_date ?? '');
            if (!due) continue;
            const dueMs = new Date(due).getTime();
            if (Number.isNaN(dueMs) || dueMs >= now) continue;

            const daysAgo = Math.max(1, Math.floor((now - dueMs) / 86_400_000));
            next.push({
              id: `bill-${bill.id}`,
              icon: Receipt,
              title: `${bill.title} · ${community.name}`,
              meta: `Due ${daysAgo} day${daysAgo === 1 ? '' : 's'} ago · ₦${NGN(Number(bill.amount ?? 0))}`,
              tone: 'destructive',
              cta: { label: 'Pay now', href: '/dashboard/bills' },
            });
          }
        }
      }

      if (!cancelled) {
        setItems(next.slice(0, 5));
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const persist = React.useCallback((set: Set<string>) => {
    if (typeof window === 'undefined') return;
    try {
      window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify([...set]));
    } catch {
      /* ignore */
    }
  }, []);

  const dismiss = (id: string) => {
    setDismissed((prev) => {
      const next = new Set(prev);
      next.add(id);
      persist(next);
      return next;
    });
  };

  const visible = items.filter((it) => !dismissed.has(it.id));

  // Show the "all caught up" state when:
  //   - we've finished loading, AND
  //   - there are no pending items (either zero from API or all dismissed).
  const allClear = !loading && visible.length === 0;
  // When loading and we have no items yet, render a small skeleton row.
  const showSkeletons = loading && visible.length === 0;
  if (!loading && items.length === 0 && dismissed.size === 0) {
    // Truly nothing pending and nothing was dismissed — hide the whole
    // section to avoid showing an empty banner on a brand-new account.
    return null;
  }

  return (
    <FadeIn>
      <section
        aria-labelledby="pending-heading"
        className="rounded-2xl border border-border bg-card p-5 shadow-xs sm:p-6"
      >
        <header className="mb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="grid size-9 place-items-center rounded-xl bg-warning/15 text-warning">
              <AlertCircle className="size-4" aria-hidden="true" />
            </span>
            <div>
              <h2
                id="pending-heading"
                className="text-base font-semibold tracking-tight text-foreground"
              >
                Needs your attention
              </h2>
              <p className="text-xs text-muted-foreground">
                {showSkeletons
                  ? 'Checking your account…'
                  : allClear
                    ? "You're all caught up"
                    : `${visible.length} item${visible.length === 1 ? '' : 's'} pending`}
              </p>
            </div>
          </div>
          {!allClear && (
            <Badge variant="warningSoft" size="lg">
              <Clock className="size-3" aria-hidden="true" />
              Today
            </Badge>
          )}
        </header>

        {allClear ? (
          <div className="flex items-center gap-3 rounded-xl border border-success/30 bg-success/5 p-4">
            <span className="grid size-9 place-items-center rounded-full bg-success/15 text-success">
              <CheckCircle2 className="size-4" aria-hidden="true" />
            </span>
            <p className="text-sm text-foreground">
              No pending bills, approvals, or verifications. Nice.
            </p>
          </div>
        ) : (
          <ul className="space-y-2.5" role="list">
            <AnimatePresence initial={false}>
              {visible.map((item) => {
                const tone = TONE_STYLES[item.tone];
                return (
                  <motion.li
                    key={item.id}
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: 24, height: 0, marginTop: 0 }}
                    transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                    className={cn(
                      'flex items-center gap-3 rounded-xl border p-3.5',
                      tone.border,
                      tone.bg
                    )}
                  >
                    <span
                      className={cn(
                        'grid size-9 shrink-0 place-items-center rounded-full',
                        tone.icon
                      )}
                      aria-hidden="true"
                    >
                      <item.icon className="size-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-foreground">
                        {item.title}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {item.meta}
                      </p>
                    </div>
                    <Link href={item.cta.href} className="shrink-0">
                      <Button
                        size="sm"
                        variant={item.tone === 'destructive' ? 'destructive' : 'default'}
                        trailingIcon={<ArrowRight className="size-3.5" />}
                      >
                        {item.cta.label}
                      </Button>
                    </Link>
                    <button
                      type="button"
                      onClick={() => dismiss(item.id)}
                      aria-label={`Dismiss ${item.title}`}
                      className="grid size-8 shrink-0 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <X className="size-3.5" aria-hidden="true" />
                    </button>
                  </motion.li>
                );
              })}
            </AnimatePresence>
          </ul>
        )}
      </section>
    </FadeIn>
  );
}
