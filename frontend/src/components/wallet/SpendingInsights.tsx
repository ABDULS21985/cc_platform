'use client';

import * as React from 'react';
import {
  ArrowUpRight,
  Briefcase,
  Building2,
  HeartHandshake,
  PiggyBank,
  Receipt,
  Wallet as WalletIcon,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { motion } from '@/components/ui/motion';
import { cn } from '@/lib/utils';
import { ApiService } from '@/services/api';

interface CategorySpend {
  id: string;
  label: string;
  amount: number;
  /** Token-driven bg + foreground tone for the icon tile + bar. */
  tone: { tile: string; bar: string };
  icon: React.ComponentType<{ className?: string }>;
}

interface ApiTx {
  signed_amount?: number | string;
  status?: string;
  transaction_type?: string;
  type?: string;
  community_id?: number | null;
  destination_account_name?: string | null;
  completed_at?: string;
  created_at?: string;
}

/**
 * Each backend `transaction_type` maps to one display category. Anything
 * we don't recognize lands in "Other" so the chart always sums to total.
 */
const TYPE_CATEGORY: Record<string, { id: string; label: string; tone: CategorySpend['tone']; icon: CategorySpend['icon'] }> = {
  bill_payment: {
    id: 'bills',
    label: 'Community bills',
    tone: { tile: 'bg-info/15 text-info', bar: 'bg-info' },
    icon: Building2,
  },
  withdrawal: {
    id: 'withdrawals',
    label: 'Withdrawals',
    tone: { tile: 'bg-warning/15 text-warning', bar: 'bg-warning' },
    icon: ArrowUpRight,
  },
  transfer: {
    id: 'transfers',
    label: 'Transfers',
    tone: { tile: 'bg-success/15 text-success', bar: 'bg-success' },
    icon: HeartHandshake,
  },
  payment: {
    id: 'payments',
    label: 'Payments',
    tone: { tile: 'bg-brand-soft text-accent-foreground', bar: 'bg-primary' },
    icon: Briefcase,
  },
};

const OTHER: Pick<CategorySpend, 'id' | 'label' | 'tone' | 'icon'> = {
  id: 'misc',
  label: 'Other',
  tone: { tile: 'bg-muted text-muted-foreground', bar: 'bg-muted-foreground' },
  icon: Receipt,
};

function deriveCategories(items: ApiTx[]): CategorySpend[] {
  const start = new Date();
  start.setDate(1);
  start.setHours(0, 0, 0, 0);
  const startMs = start.getTime();

  const buckets = new Map<string, CategorySpend>();
  for (const t of items) {
    const status = String(t.status ?? '').toLowerCase();
    if (status && status !== 'successful' && status !== 'completed') continue;
    const ts = new Date(t.completed_at ?? t.created_at ?? '').getTime();
    if (Number.isNaN(ts) || ts < startMs) continue;
    const signed = Number(t.signed_amount ?? 0);
    if (signed >= 0) continue; // only outflows count toward "spending"
    const amount = -signed;
    const tt = String(t.transaction_type ?? '').toLowerCase();
    const cfg = TYPE_CATEGORY[tt] ?? OTHER;
    const cur = buckets.get(cfg.id);
    if (cur) {
      cur.amount += amount;
    } else {
      buckets.set(cfg.id, { ...cfg, amount });
    }
  }
  // Sort largest first.
  return [...buckets.values()].sort((a, b) => b.amount - a.amount);
}

const SEED_CATEGORIES: CategorySpend[] = [
  {
    id: 'misc',
    label: 'No spending yet',
    amount: 1, // 1 so the bar still renders thinly; total stays > 0
    tone: { tile: 'bg-muted text-muted-foreground', bar: 'bg-muted-foreground' },
    icon: WalletIcon,
  },
];

function fmt(n: number): string {
  return n.toLocaleString();
}

export function SpendingInsights() {
  const [categories, setCategories] = React.useState<CategorySpend[] | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await ApiService.wallet.getTransactions({ limit: 200 });
        const txs =
          ((res.data?.data as { transactions?: ApiTx[] })?.transactions ?? []) ||
          [];
        const derived = deriveCategories(txs);
        if (!cancelled) setCategories(derived.length > 0 ? derived : SEED_CATEGORIES);
      } catch {
        if (!cancelled) setCategories(SEED_CATEGORIES);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (categories === null) {
    return (
      <Card variant="default" density="compact">
        <CardContent className="space-y-5 px-5">
          <header className="flex items-start justify-between gap-3">
            <div className="space-y-2">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-2.5 w-56" />
            </div>
            <Skeleton className="h-5 w-16 rounded-full" />
          </header>
          <Skeleton className="h-3 w-full rounded-full" />
          <ul className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <li key={i} className="flex items-center gap-3">
                <Skeleton className="size-7 rounded-lg" />
                <Skeleton className="h-3 flex-1" />
                <Skeleton className="h-3 w-12" />
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    );
  }

  const total = categories.reduce((s, c) => s + c.amount, 0);
  const top = categories[0];
  const topShare = total > 0 ? Math.round((top.amount / total) * 100) : 0;

  return (
    <Card variant="default" density="compact">
      <CardContent className="space-y-5 px-5">
        <header className="flex items-start justify-between gap-3">
          <div>
            <h3 className="inline-flex items-center gap-2 text-sm font-semibold tracking-tight text-foreground">
              <span
                className="grid size-7 place-items-center rounded-lg bg-brand-soft text-accent-foreground"
                aria-hidden="true"
              >
                <PiggyBank className="size-3.5" />
              </span>
              Spending breakdown
            </h3>
            <p className="text-xs text-muted-foreground">
              Where your money went this month.
            </p>
          </div>
          <Badge variant="soft" size="sm" className="tabular-nums">
            ₦{fmt(total)}
          </Badge>
        </header>

        {/* Stacked bar */}
        <div>
          <div
            className="flex h-3 w-full overflow-hidden rounded-full bg-muted/60"
            role="img"
            aria-label="Spending categories"
          >
            {categories.map((c, i) => {
              const pct = total > 0 ? (c.amount / total) * 100 : 0;
              return (
                <motion.span
                  key={c.id}
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{
                    delay: 0.05 * i + 0.1,
                    duration: 0.5,
                    ease: [0.16, 1, 0.3, 1],
                  }}
                  className={cn('h-full', c.tone.bar)}
                  title={`${c.label} · ₦${fmt(c.amount)}`}
                />
              );
            })}
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">
            Top category:{' '}
            <span className="font-semibold text-foreground">{top.label}</span>{' '}
            at {topShare}% of total.
          </p>
        </div>

        {/* Legend / list */}
        <ul role="list" className="space-y-2">
          {categories.map((c, i) => {
            const pct = total > 0 ? Math.round((c.amount / total) * 100) : 0;
            return (
              <motion.li
                key={c.id}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  delay: 0.05 * i,
                  duration: 0.3,
                  ease: [0.16, 1, 0.3, 1],
                }}
                className="flex items-center gap-3"
              >
                <span
                  className={cn(
                    'grid size-7 shrink-0 place-items-center rounded-lg',
                    c.tone.tile
                  )}
                  aria-hidden="true"
                >
                  <c.icon className="size-3.5" />
                </span>
                <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
                  {c.label}
                </span>
                <span className="text-xs font-semibold tabular-nums text-muted-foreground">
                  {pct}%
                </span>
                <span className="w-20 text-right text-sm font-bold tabular-nums text-foreground">
                  ₦{fmt(c.amount)}
                </span>
              </motion.li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}
