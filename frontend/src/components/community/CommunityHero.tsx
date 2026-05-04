'use client';

import * as React from 'react';
import Link from 'next/link';
import { ArrowRight, Crown, Plus, ShieldCheck, Sparkles, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FadeIn, SlideUp } from '@/components/ui/motion';
import { cn } from '@/lib/utils';

export interface CommunityHeroStats {
  /** Total communities the user is in (joined OR owned). */
  total: number;
  /** Communities the user owns. */
  owned: number;
  /** Communities the user is just a member of. */
  member: number;
  /** Optional total pending bills across all communities. */
  pendingBills?: number;
}

interface CommunityHeroProps {
  stats?: CommunityHeroStats;
  loading?: boolean;
  onCreate?: () => void;
}

export function CommunityHero({ stats, loading, onCreate }: CommunityHeroProps) {
  const items = [
    {
      label: 'Total circles',
      value: stats?.total ?? 0,
      icon: Users,
      tone: 'bg-brand-soft text-accent-foreground',
    },
    {
      label: 'You own',
      value: stats?.owned ?? 0,
      icon: Crown,
      tone: 'bg-warning/15 text-warning',
    },
    {
      label: 'Member of',
      value: stats?.member ?? 0,
      icon: ShieldCheck,
      tone: 'bg-success/15 text-success',
    },
  ];

  return (
    <section
      aria-labelledby="community-hero-heading"
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

      <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <FadeIn>
          <div>
            <Badge variant="soft" size="lg" className="gap-1.5">
              <Sparkles className="size-3" aria-hidden="true" />
              Your circles
            </Badge>
            <h1
              id="community-hero-heading"
              className="mt-3 text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl"
            >
              Find, join, and run communities.
            </h1>
            <p className="mt-1.5 max-w-xl text-sm text-muted-foreground">
              Browse circles you&apos;re part of, discover new ones, or start
              your own — and let CCPay handle the money.
            </p>
          </div>
        </FadeIn>

        <SlideUp delay={0.05}>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="default"
              onClick={onCreate}
              leadingIcon={<Plus className="size-4" />}
            >
              New community
            </Button>
            <Link href="/dashboard/explore" className="hidden sm:inline-flex">
              <Button
                type="button"
                size="default"
                variant="outline"
                trailingIcon={<ArrowRight className="size-4" />}
              >
                Discover
              </Button>
            </Link>
          </div>
        </SlideUp>
      </div>

      {/* Stats */}
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
                <dd
                  className={cn(
                    'text-xl font-extrabold tracking-tight tabular-nums text-foreground',
                    loading && 'opacity-40'
                  )}
                >
                  {loading ? '—' : it.value}
                </dd>
              </div>
            </div>
          ))}
        </dl>
      </SlideUp>
    </section>
  );
}
