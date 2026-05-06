'use client';

import * as React from 'react';
import {
  Crown,
  Sparkles,
  UserPlus,
  Users,
  Zap,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { FadeIn, SlideUp } from '@/components/ui/motion';
import { cn } from '@/lib/utils';

export interface MembersHeroStats {
  total: number;
  online: number;
  newThisMonth: number;
  topContributors: number;
}

interface MembersHeroProps {
  stats: MembersHeroStats;
  /** Number of communities the user is in. */
  circleCount: number;
}

export function MembersHero({ stats, circleCount }: MembersHeroProps) {
  const items = [
    {
      label: 'Online now',
      value: stats.online,
      icon: Zap,
      tone: 'bg-success/15 text-success',
    },
    {
      label: 'New this month',
      value: stats.newThisMonth,
      icon: UserPlus,
      tone: 'bg-info/15 text-info',
    },
    {
      label: 'Top contributors',
      value: stats.topContributors,
      icon: Crown,
      tone: 'bg-warning/15 text-warning',
    },
  ];

  return (
    <section
      aria-labelledby="members-hero-heading"
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

      <div className="relative">
        <FadeIn>
          <div>
            <Badge variant="soft" size="lg" className="gap-1.5">
              <Users className="size-3" aria-hidden="true" />
              People
            </Badge>
            <h1
              id="members-hero-heading"
              className="mt-3 text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl"
            >
              <span className="bg-gradient-to-br from-brand to-brand-bright bg-clip-text text-transparent">
                {stats.total.toLocaleString()}
              </span>{' '}
              people across your circles.
            </h1>
            <p className="mt-1.5 max-w-xl text-sm text-muted-foreground">
              <Sparkles className="mr-1 inline-block size-3" aria-hidden="true" />
              Members from {circleCount} {circleCount === 1 ? 'community' : 'communities'} you&apos;re part of, in one searchable directory.
            </p>
          </div>
        </FadeIn>
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
