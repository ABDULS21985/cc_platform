'use client';

import * as React from 'react';
import {
  Activity as ActivityIcon,
  ArrowDownRight,
  ArrowUpRight,
  Hash,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { FadeIn, SlideUp, motion } from '@/components/ui/motion';
import { cn } from '@/lib/utils';
import type { ActivityPeriod } from './types';

interface PeriodOption {
  value: ActivityPeriod;
  label: string;
}

const PERIOD_OPTIONS: PeriodOption[] = [
  { value: 'today', label: 'Today' },
  { value: '7d', label: '7 days' },
  { value: '30d', label: '30 days' },
  { value: '90d', label: '90 days' },
  { value: 'all', label: 'All time' },
];

export interface ActivityHeroStats {
  totalIn: number;
  totalOut: number;
  count: number;
}

interface ActivityHeroProps {
  period: ActivityPeriod;
  onPeriodChange: (next: ActivityPeriod) => void;
  stats: ActivityHeroStats;
}

function fmt(n: number): string {
  return n.toLocaleString('en-NG', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

export function ActivityHero({
  period,
  onPeriodChange,
  stats,
}: ActivityHeroProps) {
  const net = stats.totalIn - stats.totalOut;
  const netPositive = net >= 0;

  const items = [
    {
      label: 'Money in',
      value: `+₦${fmt(stats.totalIn)}`,
      icon: ArrowDownRight,
      tone: 'bg-success/15 text-success',
    },
    {
      label: 'Money out',
      value: `−₦${fmt(stats.totalOut)}`,
      icon: ArrowUpRight,
      tone: 'bg-warning/15 text-warning',
    },
    {
      label: 'Net change',
      value: `${netPositive ? '+' : '−'}₦${fmt(Math.abs(net))}`,
      icon: TrendingUp,
      tone: netPositive
        ? 'bg-success/15 text-success'
        : 'bg-destructive/15 text-destructive',
    },
    {
      label: 'Transactions',
      value: stats.count.toLocaleString(),
      icon: Hash,
      tone: 'bg-brand-soft text-accent-foreground',
    },
  ];

  return (
    <section
      aria-labelledby="activity-hero-heading"
      className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-card to-brand-soft/30 p-6 shadow-xs sm:p-8"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-24 -right-24 h-64 w-64 rounded-full bg-brand/15 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-32 -left-16 h-56 w-56 rounded-full bg-info/10 blur-3xl"
      />

      <div className="relative flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <FadeIn>
          <div>
            <Badge variant="soft" size="lg" className="gap-1.5">
              <ActivityIcon className="size-3" aria-hidden="true" />
              Activity
            </Badge>
            <h1
              id="activity-hero-heading"
              className="mt-3 text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl"
            >
              Every Naira, accounted for.
            </h1>
            <p className="mt-1.5 max-w-xl text-sm text-muted-foreground">
              <Sparkles
                className="mr-1 inline-block size-3"
                aria-hidden="true"
              />
              A complete log of money in and out across all your circles. Filter,
              search, export.
            </p>
          </div>
        </FadeIn>

        {/* Period chips */}
        <SlideUp delay={0.05}>
          <div
            role="radiogroup"
            aria-label="Time period"
            className="flex w-full items-center gap-1 overflow-x-auto rounded-full border border-border bg-card p-1 shadow-xs lg:w-auto"
          >
            {PERIOD_OPTIONS.map((opt) => {
              const active = period === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => onPeriodChange(opt.value)}
                  className={cn(
                    'relative inline-flex h-8 shrink-0 items-center rounded-full px-3 text-xs font-semibold transition-colors',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    active
                      ? 'text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  {active && (
                    <motion.span
                      layoutId="activity-period-pill"
                      className="absolute inset-0 -z-10 rounded-full bg-primary shadow-sm"
                      transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                    />
                  )}
                  {opt.label}
                </button>
              );
            })}
          </div>
        </SlideUp>
      </div>

      <SlideUp delay={0.1}>
        <dl className="relative mt-6 grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
          {items.map((it) => (
            <div
              key={it.label}
              className="flex items-center gap-3 rounded-2xl border border-border bg-card/80 p-3.5 backdrop-blur-sm"
            >
              <span
                className={cn(
                  'grid size-9 shrink-0 place-items-center rounded-xl',
                  it.tone
                )}
                aria-hidden="true"
              >
                <it.icon className="size-4" />
              </span>
              <div className="min-w-0">
                <dt className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  {it.label}
                </dt>
                <dd className="text-lg font-extrabold tracking-tight tabular-nums text-foreground sm:text-xl">
                  {it.value}
                </dd>
              </div>
            </div>
          ))}
        </dl>
      </SlideUp>
    </section>
  );
}

