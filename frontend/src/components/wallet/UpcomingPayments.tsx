'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  AlertCircle,
  ArrowRight,
  CalendarClock,
  Receipt,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { motion } from '@/components/ui/motion';
import { cn } from '@/lib/utils';
import { ApiService } from '@/services/api';

interface UpcomingPayment {
  id: string;
  title: string;
  community: string;
  amount: string | null;
  /** Days until due (negative = overdue). */
  dueInDays: number;
  itemsCount?: number;
}

interface ApiBill {
  id: number;
  title: string;
  amount: number;
  status: string;
  due_date: string;
}

const NGN = (n: number) =>
  n.toLocaleString('en-NG', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });

/**
 * Walk all the user's joined communities, fetch their bills, and surface
 * any that are still open (status not paid/cancelled). Sort by due date
 * with overdue first; cap at 12 entries.
 */
async function fetchUpcoming(): Promise<UpcomingPayment[]> {
  const joinedRes = await ApiService.communities.joined({ limit: 50 });
  const joined = joinedRes.data?.data?.communities ?? [];
  if (joined.length === 0) return [];

  const lists = await Promise.allSettled(
    joined.map(async (c) => ({
      community: c,
      res: await ApiService.communities.getBills(c.id, { limit: 100 }),
    })),
  );

  const out: UpcomingPayment[] = [];
  for (const r of lists) {
    if (r.status !== 'fulfilled') continue;
    const community = r.value.community;
    const bills = ((r.value.res.data?.data as { bills?: ApiBill[] })?.bills ?? []) as ApiBill[];
    for (const bill of bills) {
      const status = String(bill.status ?? '').toLowerCase();
      if (status === 'paid' || status === 'completed' || status === 'cancelled') continue;
      const dueMs = new Date(bill.due_date ?? '').getTime();
      if (Number.isNaN(dueMs)) continue;
      const dueInDays = Math.round(
        (dueMs - Date.now()) / (24 * 60 * 60 * 1000),
      );
      out.push({
        id: `bill-${bill.id}`,
        title: bill.title,
        community: community.name,
        amount: NGN(Number(bill.amount ?? 0)),
        dueInDays,
      });
    }
  }
  // Most-overdue first, then nearest-due.
  out.sort((a, b) => a.dueInDays - b.dueInDays);
  return out.slice(0, 12);
}

function tone(days: number) {
  if (days < 0) {
    return {
      label: `${Math.abs(days)}d overdue`,
      badge: 'destructiveSoft' as const,
      dot: 'bg-destructive',
      pulse: true,
    };
  }
  if (days <= 3) {
    return {
      label: `Due in ${days}d`,
      badge: 'warningSoft' as const,
      dot: 'bg-warning',
      pulse: true,
    };
  }
  return {
    label: `Due in ${days}d`,
    badge: 'soft' as const,
    dot: 'bg-muted-foreground',
    pulse: false,
  };
}

export default function UpcomingPayments() {
  const [payments, setPayments] = React.useState<UpcomingPayment[] | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const list = await fetchUpcoming();
        if (!cancelled) setPayments(list);
      } catch {
        if (!cancelled) setPayments([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (payments === null) {
    return (
      <Card variant="default" density="compact" className="flex flex-col">
        <CardContent className="flex flex-1 flex-col space-y-4 px-5">
          <header className="flex items-center justify-between">
            <Skeleton className="h-4 w-44" />
            <Skeleton className="h-5 w-16 rounded-full" />
          </header>
          <ul className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <li
                key={i}
                className="rounded-xl border border-border bg-card p-3"
              >
                <div className="space-y-1.5">
                  <Skeleton className="h-3.5 w-3/4" />
                  <Skeleton className="h-2.5 w-1/2" />
                  <Skeleton className="h-4 w-16 rounded-full" />
                </div>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card variant="default" density="compact" className="flex flex-col">
      <CardContent className="flex flex-1 flex-col space-y-4 px-5">
        <header className="flex items-center justify-between">
          <h3 className="inline-flex items-center gap-2 text-sm font-semibold tracking-tight text-foreground">
            <span
              className="grid size-7 place-items-center rounded-lg bg-warning/15 text-warning"
              aria-hidden="true"
            >
              <CalendarClock className="size-3.5" />
            </span>
            Upcoming payments
          </h3>
          {payments.length > 0 && (
            <Badge variant="warningSoft" size="sm" className="tabular-nums">
              {payments.length} pending
            </Badge>
          )}
        </header>

        {payments.length === 0 ? (
          <EmptyState
            icon={<Receipt className="size-5" aria-hidden="true" />}
            title="You're all paid up"
            description="No bills or dues are coming up. Nice."
          />
        ) : (
          <ul
            role="list"
            className="custom-scrollbar -mr-2 max-h-[420px] space-y-2 overflow-y-auto pr-2"
          >
            {payments.map((p, i) => {
              const t = tone(p.dueInDays);
              return (
                <motion.li
                  key={p.id}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    delay: 0.04 * i,
                    duration: 0.3,
                    ease: [0.16, 1, 0.3, 1],
                  }}
                >
                  <Link
                    href="/dashboard/community"
                    className={cn(
                      'group flex items-start justify-between gap-3 rounded-xl border p-3 transition-colors',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                      p.dueInDays < 0
                        ? 'border-destructive/30 bg-destructive/5 hover:border-destructive/50'
                        : 'border-border bg-card hover:border-input hover:bg-muted/30'
                    )}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold tracking-tight text-foreground transition-colors group-hover:text-primary">
                        {p.title}
                      </p>
                      <p className="truncate text-[11px] text-muted-foreground">
                        {p.community}
                      </p>
                      <div className="mt-1.5 flex items-center gap-2">
                        <span
                          aria-hidden="true"
                          className="relative flex size-1.5"
                        >
                          {t.pulse && (
                            <span
                              className={cn(
                                'absolute inline-flex h-full w-full animate-ping rounded-full opacity-70',
                                t.dot
                              )}
                            />
                          )}
                          <span
                            className={cn(
                              'relative inline-flex size-1.5 rounded-full',
                              t.dot
                            )}
                          />
                        </span>
                        <Badge variant={t.badge} size="sm">
                          {p.dueInDays < 0 && (
                            <AlertCircle
                              className="size-2.5"
                              aria-hidden="true"
                            />
                          )}
                          {t.label}
                        </Badge>
                      </div>
                    </div>

                    <div className="text-right">
                      {p.amount ? (
                        <p className="text-sm font-bold tabular-nums text-foreground">
                          ₦{p.amount}
                        </p>
                      ) : (
                        <Badge variant="soft" size="sm" className="tabular-nums">
                          {p.itemsCount} items
                        </Badge>
                      )}
                      <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                        {p.dueInDays < 0 ? 'Pay now' : 'Pay'}
                      </p>
                    </div>
                  </Link>
                </motion.li>
              );
            })}
          </ul>
        )}

        <Button
          asChild
          size="sm"
          variant="outline"
          block
          trailingIcon={<ArrowRight className="size-3.5" />}
          className="mt-auto"
        >
          <Link href="/dashboard/community">Settle all bills</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
