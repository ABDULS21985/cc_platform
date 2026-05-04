'use client';

import * as React from 'react';
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Clock,
  Receipt,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FadeIn, SlideUp } from '@/components/ui/motion';
import { cn } from '@/lib/utils';

export interface BillsHeroStats {
  totalOutstanding: number;
  overdueCount: number;
  /** Days until next bill is due — 0 means today, negative for overdue. */
  daysUntilNext: number | null;
  settledThisMonth: number;
}

interface BillsHeroProps {
  stats: BillsHeroStats;
  onSettleAll: () => void;
}

function fmtNgn(n: number): string {
  return n.toLocaleString('en-NG', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

export function BillsHero({ stats, onSettleAll }: BillsHeroProps) {
  const hasOutstanding = stats.totalOutstanding > 0;

  const items = [
    {
      label: 'Overdue',
      value: stats.overdueCount,
      icon: AlertCircle,
      tone: 'bg-destructive/15 text-destructive',
    },
    {
      label: 'Soonest due',
      value:
        stats.daysUntilNext === null
          ? '—'
          : stats.daysUntilNext < 0
            ? `${Math.abs(stats.daysUntilNext)}d late`
            : stats.daysUntilNext === 0
              ? 'Today'
              : `In ${stats.daysUntilNext}d`,
      icon: Clock,
      tone: 'bg-warning/15 text-warning',
    },
    {
      label: 'Settled this month',
      value: stats.settledThisMonth,
      icon: CheckCircle2,
      tone: 'bg-success/15 text-success',
    },
  ];

  return (
    <section
      aria-labelledby="bills-hero-heading"
      className={cn(
        'relative overflow-hidden rounded-3xl border p-6 shadow-xs sm:p-8',
        hasOutstanding
          ? 'border-border bg-gradient-to-br from-card to-warning/10'
          : 'border-border bg-gradient-to-br from-card to-success/10'
      )}
    >
      <div
        aria-hidden="true"
        className={cn(
          'pointer-events-none absolute -top-24 -right-24 h-64 w-64 rounded-full blur-3xl',
          hasOutstanding ? 'bg-warning/20' : 'bg-success/20'
        )}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-32 -left-16 h-56 w-56 rounded-full bg-info/10 blur-3xl"
      />

      <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <FadeIn>
          <div>
            <Badge variant="soft" size="lg" className="gap-1.5">
              <Receipt className="size-3" aria-hidden="true" />
              Bills
            </Badge>
            <h1
              id="bills-hero-heading"
              className="mt-3 text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl"
            >
              {hasOutstanding ? (
                <>
                  You owe{' '}
                  <span
                    className={cn(
                      'tabular-nums',
                      stats.overdueCount > 0
                        ? 'text-destructive'
                        : 'bg-gradient-to-br from-brand to-brand-bright bg-clip-text text-transparent'
                    )}
                  >
                    ₦{fmtNgn(stats.totalOutstanding)}
                  </span>
                </>
              ) : (
                'All settled. 🎉'
              )}
            </h1>
            <p className="mt-1.5 max-w-xl text-sm text-muted-foreground">
              {hasOutstanding
                ? 'Across all your circles. Settle individually or in one go.'
                : 'No outstanding bills across your communities. Treat yourself.'}
            </p>
          </div>
        </FadeIn>

        {hasOutstanding && (
          <SlideUp delay={0.05}>
            <Button
              type="button"
              size="default"
              onClick={onSettleAll}
              trailingIcon={<ArrowRight className="size-4" />}
            >
              Settle all
            </Button>
          </SlideUp>
        )}
      </div>

      <SlideUp delay={0.1}>
        <dl className="relative mt-6 grid grid-cols-3 gap-2 sm:gap-3">
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
                <dd className="text-xl font-extrabold tracking-tight tabular-nums text-foreground">
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
