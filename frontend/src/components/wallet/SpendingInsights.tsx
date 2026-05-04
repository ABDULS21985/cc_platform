'use client';

import * as React from 'react';
import {
  Briefcase,
  Calendar,
  HeartHandshake,
  Home,
  PiggyBank,
  Receipt,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { motion } from '@/components/ui/motion';
import { cn } from '@/lib/utils';

interface CategorySpend {
  id: string;
  label: string;
  amount: number;
  /** Token-driven bg + foreground tone for the icon tile + bar. */
  tone: { tile: string; bar: string };
  icon: React.ComponentType<{ className?: string }>;
}

const CATEGORIES: CategorySpend[] = [
  {
    id: 'estate',
    label: 'Estate dues',
    amount: 28_500,
    tone: { tile: 'bg-info/15 text-info', bar: 'bg-info' },
    icon: Home,
  },
  {
    id: 'events',
    label: 'Events & tickets',
    amount: 24_200,
    tone: { tile: 'bg-warning/15 text-warning', bar: 'bg-warning' },
    icon: Calendar,
  },
  {
    id: 'co-op',
    label: 'Co-op contributions',
    amount: 18_400,
    tone: { tile: 'bg-success/15 text-success', bar: 'bg-success' },
    icon: HeartHandshake,
  },
  {
    id: 'business',
    label: 'Business expenses',
    amount: 14_900,
    tone: { tile: 'bg-brand-soft text-accent-foreground', bar: 'bg-primary' },
    icon: Briefcase,
  },
  {
    id: 'misc',
    label: 'Other',
    amount: 10_400,
    tone: { tile: 'bg-muted text-muted-foreground', bar: 'bg-muted-foreground' },
    icon: Receipt,
  },
];

function fmt(n: number): string {
  return n.toLocaleString();
}

export function SpendingInsights() {
  const total = CATEGORIES.reduce((s, c) => s + c.amount, 0);
  const top = CATEGORIES[0];
  const topShare = Math.round((top.amount / total) * 100);

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
            {CATEGORIES.map((c, i) => {
              const pct = (c.amount / total) * 100;
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
          {CATEGORIES.map((c, i) => {
            const pct = Math.round((c.amount / total) * 100);
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
