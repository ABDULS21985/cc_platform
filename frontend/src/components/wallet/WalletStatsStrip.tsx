'use client';

import * as React from 'react';
import {
  ArrowDownRight,
  ArrowUpRight,
  PiggyBank,
  Receipt,
  TrendingUp,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { motion } from '@/components/ui/motion';
import { cn } from '@/lib/utils';
import { ApiService } from '@/services/api';

interface Metric {
  label: string;
  value: number;
  /** Pretty NGN-formatted number; we keep the raw value for the spark proportion. */
  display: string;
  delta: number; // percentage change vs previous period (positive or negative)
  icon: React.ComponentType<{ className?: string }>;
  tone: string;
  /** Spark bars (last 7 days, 0-100 scaled). */
  spark: number[];
}

const NGN = (n: number) =>
  '₦' +
  n.toLocaleString('en-NG', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });

interface ApiTx {
  signed_amount?: number | string;
  status?: string;
  transaction_type?: string;
  type?: string;
  completed_at?: string;
  created_at?: string;
}

/**
 * Walk a list of transactions and bucket them into:
 *   - dailyIn / dailyOut: 7 day-buckets (Mon..Sun, last 7 days) for sparklines
 *   - thisMonthIn / thisMonthOut / lastMonthIn / lastMonthOut: deltas
 *   - billsPaid: count of completed bill_payment transactions this month
 */
function aggregate(items: ApiTx[]) {
  const now = new Date();
  const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).getTime();
  const sevenDaysAgo = now.getTime() - 7 * 24 * 60 * 60 * 1000;

  let thisIn = 0;
  let thisOut = 0;
  let lastIn = 0;
  let lastOut = 0;
  let billsPaid = 0;
  // 7 buckets, each one day; index 0 = oldest, 6 = today.
  const sparkIn = [0, 0, 0, 0, 0, 0, 0];
  const sparkOut = [0, 0, 0, 0, 0, 0, 0];

  for (const t of items) {
    const status = String(t.status ?? '').toLowerCase();
    if (status && status !== 'successful' && status !== 'completed') continue;
    const ts = new Date(t.completed_at ?? t.created_at ?? '').getTime();
    if (Number.isNaN(ts)) continue;
    const signed = Number(t.signed_amount ?? 0);

    // Month buckets
    if (ts >= startOfThisMonth) {
      if (signed > 0) thisIn += signed;
      else if (signed < 0) thisOut += -signed;
      if ((t.transaction_type ?? '').toLowerCase() === 'bill_payment') {
        billsPaid += 1;
      }
    } else if (ts >= startOfLastMonth) {
      if (signed > 0) lastIn += signed;
      else if (signed < 0) lastOut += -signed;
    }

    // 7-day spark
    if (ts >= sevenDaysAgo) {
      const dayOffset = Math.min(
        6,
        Math.max(0, 6 - Math.floor((now.getTime() - ts) / (24 * 60 * 60 * 1000))),
      );
      if (signed > 0) sparkIn[dayOffset] += signed;
      else if (signed < 0) sparkOut[dayOffset] += -signed;
    }
  }

  // Normalize sparks to 0..100 so the visual works regardless of magnitude.
  const norm = (arr: number[]) => {
    const max = Math.max(...arr, 1);
    return arr.map((v) => Math.round((v / max) * 100));
  };

  // Deltas in percent vs last month — fall back to 0 if we have no prior data.
  const pct = (cur: number, prev: number) => {
    if (prev <= 0) return cur > 0 ? 100 : 0;
    return ((cur - prev) / prev) * 100;
  };

  return {
    thisIn,
    thisOut,
    saved: thisIn - thisOut,
    billsPaid,
    deltaIn: pct(thisIn, lastIn),
    deltaOut: pct(thisOut, lastOut),
    deltaSaved: pct(thisIn - thisOut, lastIn - lastOut),
    sparkIn: norm(sparkIn),
    sparkOut: norm(sparkOut),
  };
}

interface SparklineProps {
  values: number[];
  positive: boolean;
}

/**
 * Tiny inline bar sparkline rendered with token colors.
 * Keeps fixed height so it never affects card geometry.
 */
function Sparkline({ values, positive }: SparklineProps) {
  return (
    <div
      aria-hidden="true"
      className="flex h-7 items-end gap-0.5 mt-3"
    >
      {values.map((v, i) => (
        <motion.span
          key={i}
          initial={{ scaleY: 0, transformOrigin: 'bottom' }}
          animate={{ scaleY: 1 }}
          transition={{
            delay: 0.05 * i + 0.1,
            duration: 0.4,
            ease: [0.16, 1, 0.3, 1],
          }}
          className={cn(
            'w-1 rounded-sm',
            positive ? 'bg-success/60' : 'bg-warning/60'
          )}
          style={{ height: `${Math.max(8, v)}%` }}
        />
      ))}
    </div>
  );
}

export function WalletStatsStrip() {
  const [metrics, setMetrics] = React.useState<Metric[] | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await ApiService.wallet.getTransactions({ limit: 200 });
        const items =
          ((res.data?.data as { transactions?: ApiTx[] })?.transactions ?? []) ||
          [];
        const agg = aggregate(items);
        if (cancelled) return;
        setMetrics([
          {
            label: 'Spent this month',
            value: agg.thisOut,
            display: NGN(agg.thisOut),
            delta: agg.deltaOut,
            icon: ArrowUpRight,
            tone: 'bg-warning/15 text-warning',
            spark: agg.sparkOut,
          },
          {
            label: 'Received this month',
            value: agg.thisIn,
            display: NGN(agg.thisIn),
            delta: agg.deltaIn,
            icon: ArrowDownRight,
            tone: 'bg-success/15 text-success',
            spark: agg.sparkIn,
          },
          {
            label: 'Bills settled',
            value: agg.billsPaid,
            display:
              agg.billsPaid === 1 ? '1 bill' : `${agg.billsPaid} bills`,
            delta: 0, // bills delta isn't meaningful without a prior month bills count
            icon: Receipt,
            tone: 'bg-brand-soft text-accent-foreground',
            spark: agg.sparkOut.map((v) => Math.round(v * 0.6)), // rough fill
          },
          {
            label: 'Saved',
            value: agg.saved,
            display: NGN(Math.max(0, agg.saved)),
            delta: agg.deltaSaved,
            icon: PiggyBank,
            tone: 'bg-info/15 text-info',
            spark: agg.sparkIn.map((v, i) =>
              Math.max(0, v - (agg.sparkOut[i] ?? 0)),
            ),
          },
        ]);
      } catch {
        // empty render — page already shows other content
        if (!cancelled) setMetrics([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (metrics === null) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} variant="default" density="compact" className="h-full">
            <CardContent className="space-y-3 px-5">
              <div className="flex items-center justify-between">
                <Skeleton className="size-9 rounded-xl" />
                <Skeleton className="h-5 w-12 rounded-full" />
              </div>
              <Skeleton className="h-2.5 w-2/3" />
              <Skeleton className="h-7 w-1/2" />
              <Skeleton className="h-7 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
      {metrics.map((m, i) => {
        const positive = m.delta >= 0;
        const Icon = m.icon;
        // For "Spent this month", a negative delta means less spent — that's good news
        // so we render it in success tone. Everything else: positive delta = good.
        const goodNews =
          m.label === 'Spent this month' ? !positive : positive;
        return (
          <motion.div
            key={m.label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              delay: 0.04 * i,
              duration: 0.3,
              ease: [0.16, 1, 0.3, 1],
            }}
          >
            <Card variant="default" density="compact" className="h-full">
              <CardContent className="space-y-2 px-5">
                <div className="flex items-center justify-between">
                  <span
                    className={cn(
                      'grid size-9 place-items-center rounded-xl',
                      m.tone
                    )}
                    aria-hidden="true"
                  >
                    <Icon className="size-4" />
                  </span>
                  <Badge
                    variant={goodNews ? 'successSoft' : 'destructiveSoft'}
                    size="sm"
                    className="gap-0.5 tabular-nums"
                  >
                    <TrendingUp
                      className={cn(
                        'size-3',
                        !positive && 'rotate-180'
                      )}
                      aria-hidden="true"
                    />
                    {Math.abs(m.delta).toFixed(1)}%
                  </Badge>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    {m.label}
                  </p>
                  <p className="mt-1 text-xl font-extrabold tabular-nums tracking-tight text-foreground">
                    {m.display}
                  </p>
                </div>
                <Sparkline values={m.spark} positive={goodNews} />
              </CardContent>
            </Card>
          </motion.div>
        );
      })}
    </div>
  );
}
