'use client';

import * as React from 'react';
import { CheckCheck, Inbox, Sparkles, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FadeIn, SlideUp } from '@/components/ui/motion';
import { cn } from '@/lib/utils';

interface InboxStats {
  unread: number;
  today: number;
  thisWeek: number;
}

interface InboxHeroProps {
  stats: InboxStats;
  onMarkAllRead: () => void;
}

export function InboxHero({ stats, onMarkAllRead }: InboxHeroProps) {
  const items = [
    {
      label: 'Unread',
      value: stats.unread,
      icon: Inbox,
      tone: 'bg-warning/15 text-warning',
    },
    {
      label: 'Today',
      value: stats.today,
      icon: Sparkles,
      tone: 'bg-brand-soft text-accent-foreground',
    },
    {
      label: 'This week',
      value: stats.thisWeek,
      icon: TrendingUp,
      tone: 'bg-info/15 text-info',
    },
  ];

  return (
    <section
      aria-labelledby="inbox-hero-heading"
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

      <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <FadeIn>
          <div>
            <Badge variant="soft" size="lg" className="gap-1.5">
              <Inbox className="size-3" aria-hidden="true" />
              Inbox
            </Badge>
            <h1
              id="inbox-hero-heading"
              className="mt-3 text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl"
            >
              {stats.unread > 0 ? (
                <>
                  You have{' '}
                  <span className="bg-gradient-to-br from-brand to-brand-bright bg-clip-text text-transparent">
                    {stats.unread} unread
                  </span>{' '}
                  notifications.
                </>
              ) : (
                <>You&apos;re all caught up.</>
              )}
            </h1>
            <p className="mt-1.5 max-w-xl text-sm text-muted-foreground">
              Money, bills, communities, events, and security — every signal
              that matters in one place.
            </p>
          </div>
        </FadeIn>

        <SlideUp delay={0.05}>
          <Button
            type="button"
            size="default"
            variant="outline"
            disabled={stats.unread === 0}
            onClick={onMarkAllRead}
            leadingIcon={<CheckCheck className="size-4" />}
          >
            Mark all read
          </Button>
        </SlideUp>
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
