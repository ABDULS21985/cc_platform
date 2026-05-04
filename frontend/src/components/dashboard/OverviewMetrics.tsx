'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  ArrowDownRight,
  ArrowUpRight,
  Eye,
  EyeOff,
  Receipt,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { ApiService } from '@/services/api';
import { motion, FadeIn } from '@/components/ui/motion';
import { cn } from '@/lib/utils';

interface WalletSummary {
  balance: string | number;
  currency?: string;
  change_pct?: number;
  bills_due_count?: number;
  bills_due_amount?: string | number;
  weekly_in?: string | number;
  weekly_out?: string | number;
}

function fmtNgn(n: number): string {
  return n.toLocaleString('en-NG', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function OverviewMetrics() {
  const [data, setData] = React.useState<WalletSummary | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [hide, setHide] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      // Kick off the three sources in parallel — wallet summary, recent
      // transactions for the weekly window, joined communities (then
      // their bills) for the bills-due tally.
      const [walletRes, txRes, joinedRes] = await Promise.allSettled([
        ApiService.wallet.getSummary(),
        ApiService.wallet.getTransactions({ limit: 200 }),
        ApiService.communities.joined({ limit: 50 }),
      ]);
      if (cancelled) return;

      // Wallet balance
      let balance: string | number = 0;
      let currency = 'NGN';
      if (walletRes.status === 'fulfilled') {
        const w = walletRes.value.data?.data?.wallet;
        if (w) {
          balance = w.balance;
          currency = w.currency ?? 'NGN';
        }
      }

      // Weekly in/out from the last 7 days of transactions
      let weeklyIn = 0;
      let weeklyOut = 0;
      if (txRes.status === 'fulfilled') {
        const items = ((txRes.value.data?.data as { transactions?: unknown[] })?.transactions ?? []) as Array<
          Record<string, unknown>
        >;
        const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
        for (const t of items) {
          const ts = String(t.completed_at ?? t.created_at ?? '');
          if (!ts || new Date(ts).getTime() < cutoff) continue;
          const status = String(t.status ?? '').toLowerCase();
          if (status && status !== 'successful' && status !== 'completed') continue;
          const signed = Number(t.signed_amount ?? 0);
          if (signed > 0) weeklyIn += signed;
          else if (signed < 0) weeklyOut += -signed;
        }
      }

      // Bills due across joined communities
      let billsDueCount = 0;
      let billsDueAmount = 0;
      if (joinedRes.status === 'fulfilled') {
        const joined = joinedRes.value.data?.data?.communities ?? [];
        const billLists = await Promise.allSettled(
          joined.map((c) => ApiService.communities.getBills(c.id, { limit: 100 })),
        );
        for (const b of billLists) {
          if (b.status !== 'fulfilled') continue;
          const items = ((b.value.data?.data as { bills?: unknown[] })?.bills ?? []) as Array<
            Record<string, unknown>
          >;
          for (const bill of items) {
            const status = String(bill.status ?? '').toLowerCase();
            if (status === 'paid' || status === 'completed' || status === 'cancelled') continue;
            billsDueCount += 1;
            billsDueAmount += Number(bill.amount ?? 0);
          }
        }
      }

      if (!cancelled) {
        setData({
          balance,
          currency,
          bills_due_count: billsDueCount,
          bills_due_amount: billsDueAmount,
          weekly_in: weeklyIn,
          weekly_out: weeklyOut,
        });
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const balanceNumber = Number(data?.balance ?? 0);
  const billsDueCount = data?.bills_due_count ?? 0;
  const billsDueAmount = Number(data?.bills_due_amount ?? 0);
  const weeklyIn = Number(data?.weekly_in ?? 0);
  const weeklyOut = Number(data?.weekly_out ?? 0);
  const weeklyDelta = weeklyIn - weeklyOut;
  const weeklyPositive = weeklyDelta >= 0;

  return (
    <FadeIn>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* Wallet balance */}
        <Card variant="default" className="overflow-hidden">
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                <Wallet className="size-3.5" aria-hidden="true" />
                Wallet balance
              </span>
              <button
                type="button"
                onClick={() => setHide((v) => !v)}
                aria-label={hide ? 'Show balance' : 'Hide balance'}
                aria-pressed={hide}
                className="grid size-7 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {hide ? (
                  <EyeOff className="size-3.5" aria-hidden="true" />
                ) : (
                  <Eye className="size-3.5" aria-hidden="true" />
                )}
              </button>
            </div>
            {loading ? (
              <Skeleton className="h-9 w-40 rounded-md" />
            ) : (
              <motion.p
                key={hide ? 'hidden' : 'shown'}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className="flex items-baseline gap-1 text-foreground"
                aria-live="polite"
              >
                <span className="text-base font-bold text-muted-foreground">
                  ₦
                </span>
                <span
                  className={cn(
                    'text-3xl font-black tabular-nums tracking-tight',
                    hide && 'tracking-[0.1em]'
                  )}
                >
                  {hide ? '••••••' : fmtNgn(balanceNumber)}
                </span>
              </motion.p>
            )}
            <Link
              href="/dashboard/wallet"
              className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline underline-offset-4"
            >
              View wallet
              <ArrowUpRight className="size-3" aria-hidden="true" />
            </Link>
          </CardContent>
        </Card>

        {/* Bills due */}
        <Card variant="default" className="overflow-hidden">
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                <Receipt className="size-3.5" aria-hidden="true" />
                Bills due
              </span>
              {billsDueCount > 0 && (
                <Badge variant="warningSoft" size="sm">
                  {billsDueCount} pending
                </Badge>
              )}
            </div>
            {loading ? (
              <Skeleton className="h-9 w-32 rounded-md" />
            ) : (
              <p className="flex items-baseline gap-1 text-foreground">
                <span className="text-base font-bold text-muted-foreground">
                  ₦
                </span>
                <span className="text-3xl font-black tabular-nums tracking-tight">
                  {fmtNgn(billsDueAmount)}
                </span>
              </p>
            )}
            <Link
              href="/dashboard/community"
              className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline underline-offset-4"
            >
              Settle bills
              <ArrowUpRight className="size-3" aria-hidden="true" />
            </Link>
          </CardContent>
        </Card>

        {/* This week */}
        <Card variant="default" className="overflow-hidden sm:col-span-2 lg:col-span-1">
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                <TrendingUp className="size-3.5" aria-hidden="true" />
                This week
              </span>
              <Badge
                variant={weeklyPositive ? 'successSoft' : 'destructiveSoft'}
                size="sm"
                className="gap-0.5"
              >
                {weeklyPositive ? (
                  <ArrowUpRight className="size-3" aria-hidden="true" />
                ) : (
                  <ArrowDownRight className="size-3" aria-hidden="true" />
                )}
                Net {weeklyPositive ? '+' : '−'}₦
                {fmtNgn(Math.abs(weeklyDelta))}
              </Badge>
            </div>
            {loading ? (
              <Skeleton className="h-9 w-44 rounded-md" />
            ) : (
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="rounded-lg bg-muted/50 p-2.5">
                  <p className="font-semibold uppercase tracking-widest text-muted-foreground">
                    In
                  </p>
                  <p className="mt-1 font-bold tabular-nums text-success">
                    +₦{fmtNgn(weeklyIn)}
                  </p>
                </div>
                <div className="rounded-lg bg-muted/50 p-2.5">
                  <p className="font-semibold uppercase tracking-widest text-muted-foreground">
                    Out
                  </p>
                  <p className="mt-1 font-bold tabular-nums text-foreground">
                    −₦{fmtNgn(weeklyOut)}
                  </p>
                </div>
              </div>
            )}
            <Link
              href="/dashboard/wallet"
              className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline underline-offset-4"
            >
              View activity
              <ArrowUpRight className="size-3" aria-hidden="true" />
            </Link>
          </CardContent>
        </Card>
      </div>
    </FadeIn>
  );
}
