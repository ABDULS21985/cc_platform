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
import { motion } from '@/components/ui/motion';
import { cn } from '@/lib/utils';

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

const METRICS: Metric[] = [
  {
    label: 'Spent this month',
    value: 96_400,
    display: '₦96,400',
    delta: -8.2,
    icon: ArrowUpRight,
    tone: 'bg-warning/15 text-warning',
    spark: [40, 60, 30, 70, 55, 85, 50],
  },
  {
    label: 'Received this month',
    value: 184_200,
    display: '₦184,200',
    delta: 12.4,
    icon: ArrowDownRight,
    tone: 'bg-success/15 text-success',
    spark: [30, 35, 50, 65, 75, 80, 95],
  },
  {
    label: 'Bills settled',
    value: 12,
    display: '12 bills',
    delta: 25,
    icon: Receipt,
    tone: 'bg-brand-soft text-accent-foreground',
    spark: [20, 35, 40, 55, 60, 70, 90],
  },
  {
    label: 'Saved',
    value: 87_800,
    display: '₦87,800',
    delta: 5.6,
    icon: PiggyBank,
    tone: 'bg-info/15 text-info',
    spark: [10, 20, 35, 30, 50, 65, 80],
  },
];

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
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
      {METRICS.map((m, i) => {
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
