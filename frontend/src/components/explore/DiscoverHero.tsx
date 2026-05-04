'use client';

import * as React from 'react';
import Link from 'next/link';
import { Search, Sparkles, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { FadeIn, SlideUp } from '@/components/ui/motion';
import { cn } from '@/lib/utils';

const TRENDING_TAGS = [
  'estate-dues',
  'marathon-2026',
  'crypto-academy',
  'wedding-fund',
  'church-tithes',
  'tech-meetup',
  'co-op-savings',
  'event-tickets',
] as const;

interface DiscoverHeroProps {
  /** Initial search value (lifted by the parent so it stays in sync). */
  value: string;
  onChange: (next: string) => void;
}

export function DiscoverHero({ value, onChange }: DiscoverHeroProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);

  return (
    <section
      aria-labelledby="discover-heading"
      className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-card to-brand-soft/40 px-6 py-10 shadow-xs sm:px-10 sm:py-14"
    >
      {/* Ambient orbs */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        <div className="absolute -top-32 left-1/2 h-[420px] w-[420px] -translate-x-1/2 rounded-full bg-brand/15 blur-[120px]" />
        <div className="absolute -bottom-40 -right-32 h-72 w-72 rounded-full bg-brand-bright/15 blur-[120px]" />
        <div className="absolute -bottom-20 -left-12 h-56 w-56 rounded-full bg-info/10 blur-[120px]" />
      </div>

      <div className="relative mx-auto max-w-3xl text-center">
        <FadeIn>
          <Badge variant="soft" size="lg" className="gap-1.5">
            <Sparkles className="size-3" aria-hidden="true" />
            Discover
          </Badge>
        </FadeIn>

        <SlideUp delay={0.05}>
          <h1
            id="discover-heading"
            className="mt-4 text-balance text-3xl font-extrabold leading-tight tracking-tight text-foreground sm:text-4xl lg:text-5xl"
          >
            Find your{' '}
            <span className="bg-gradient-to-br from-brand to-brand-bright bg-clip-text text-transparent">
              circle.
            </span>
          </h1>
        </SlideUp>

        <SlideUp delay={0.1}>
          <p className="mx-auto mt-3 max-w-xl text-pretty text-sm text-muted-foreground sm:text-base">
            Search 5,000+ communities or browse by interest. Public circles are
            free to join — bring your group and start moving money together.
          </p>
        </SlideUp>

        {/* Search */}
        <SlideUp delay={0.18}>
          <div className="relative mx-auto mt-7 max-w-xl">
            <Search
              className="pointer-events-none absolute left-5 top-1/2 size-5 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <input
              ref={inputRef}
              type="search"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder="Search by name, interest, or owner…"
              aria-label="Search communities"
              className={cn(
                'h-14 w-full rounded-2xl border border-border bg-background px-14 text-base text-foreground placeholder:text-muted-foreground shadow-sm',
                'transition-colors outline-none hover:border-input focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30'
              )}
            />
            {value && (
              <button
                type="button"
                onClick={() => {
                  onChange('');
                  inputRef.current?.focus();
                }}
                aria-label="Clear search"
                className="absolute right-3 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            )}
          </div>
        </SlideUp>

        {/* Trending tags */}
        <FadeIn delay={0.25}>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-1.5">
            <span className="mr-1 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
              Trending
            </span>
            {TRENDING_TAGS.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => onChange(tag)}
                className={cn(
                  'inline-flex h-7 items-center rounded-full border border-border bg-card px-2.5 text-xs font-semibold text-muted-foreground transition-colors',
                  'hover:border-input hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
                )}
              >
                <span className="text-muted-foreground/70">#</span>
                {tag}
              </button>
            ))}
          </div>
        </FadeIn>

        {/* Stats / CTA cluster */}
        <FadeIn delay={0.35}>
          <div className="mt-7 inline-flex items-center gap-3 rounded-full border border-border bg-card/80 px-3 py-1.5 backdrop-blur-sm text-xs">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <span className="relative flex size-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-70" />
                <span className="relative inline-flex size-2 rounded-full bg-success" />
              </span>
              <span className="font-medium text-foreground">5,240</span> active circles
            </span>
            <span aria-hidden="true" className="size-1 rounded-full bg-border" />
            <Link
              href="/dashboard/community"
              className="font-semibold text-primary hover:underline underline-offset-4"
            >
              Browse all
            </Link>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}
