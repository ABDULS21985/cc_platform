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
  UserPlus,
  X,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence, FadeIn } from '@/components/ui/motion';
import { cn } from '@/lib/utils';

type PendingTone = 'destructive' | 'warning' | 'info';

interface PendingItem {
  id: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  meta: string;
  tone: PendingTone;
  cta: { label: string; href: string };
}

/**
 * Realistic placeholder items until the backend exposes a unified
 * `/v2/me/pending` endpoint. Each item is independently dismissible
 * for the session — dismissed IDs persist in sessionStorage.
 */
const ITEMS: PendingItem[] = [
  {
    id: 'bill-overdue-april-dues',
    icon: Receipt,
    title: 'Estate dues — April',
    meta: 'Due 2 days ago · ₦18,500',
    tone: 'destructive',
    cta: { label: 'Pay now', href: '/dashboard/community' },
  },
  {
    id: 'kyc-bvn-pending',
    icon: ShieldCheck,
    title: 'Verify your BVN to unlock transfers above ₦200k',
    meta: 'Takes about 60 seconds',
    tone: 'warning',
    cta: { label: 'Verify', href: '/bvn-verification' },
  },
  {
    id: 'member-request-runners',
    icon: UserPlus,
    title: '3 new join requests for Lekki Runners',
    meta: 'Awaiting your approval as admin',
    tone: 'info',
    cta: { label: 'Review', href: '/dashboard/community' },
  },
];

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

  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = window.sessionStorage.getItem(STORAGE_KEY);
      if (raw) setDismissed(new Set(JSON.parse(raw)));
    } catch {
      /* ignore */
    }
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

  const visible = ITEMS.filter((it) => !dismissed.has(it.id));

  // When everything is cleared, show a calm "all caught up" state once.
  const allClear = visible.length === 0 && ITEMS.length > 0;

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
                {allClear
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
