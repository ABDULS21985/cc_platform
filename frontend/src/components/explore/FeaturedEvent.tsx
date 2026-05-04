'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  Calendar,
  Clock,
  MapPin,
  Sparkles,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FadeIn } from '@/components/ui/motion';

interface FeaturedEventCardProps {
  title: string;
  community: string;
  date: { day: number; month: string };
  time: string;
  location: string;
  attendees: number;
  capacity: number;
  ticketPrice: string;
  href: string;
  category: string;
}

const FEATURED_EVENT: FeaturedEventCardProps = {
  title: 'Lagos Half Marathon 2026',
  community: 'Lekki Runners',
  date: { day: 14, month: 'Jun' },
  time: '06:00',
  location: 'Lekki Phase 1, Lagos',
  attendees: 184,
  capacity: 300,
  ticketPrice: '₦12,500',
  href: '/dashboard/events/1',
  category: 'Sports & fitness',
};

export function FeaturedEvent() {
  const e = FEATURED_EVENT;
  const pct = Math.min(100, Math.round((e.attendees / e.capacity) * 100));

  return (
    <FadeIn>
      <section
        aria-labelledby="featured-event-heading"
        className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-brand to-[oklch(0.18_0.025_220)] p-7 text-white shadow-2xl sm:p-9"
      >
        {/* Decorative orbs */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-16 -right-16 h-56 w-56 rounded-full bg-white/15 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-24 -left-12 h-72 w-72 rounded-full bg-white/10 blur-3xl"
        />

        <div className="relative grid grid-cols-1 items-center gap-8 lg:grid-cols-[auto_1fr_auto]">
          {/* Date tile */}
          <div
            className="flex size-24 items-center justify-center rounded-3xl border border-white/15 bg-white/10 backdrop-blur-md sm:size-28"
            aria-hidden="true"
          >
            <div className="text-center leading-tight">
              <p className="text-[11px] font-bold uppercase tracking-widest text-white/80">
                {e.date.month}
              </p>
              <p className="text-4xl font-black tabular-nums sm:text-5xl">
                {e.date.day}
              </p>
            </div>
          </div>

          {/* Content */}
          <div className="min-w-0">
            <Badge
              variant="outline"
              className="border-white/30 bg-white/10 text-white backdrop-blur-md"
            >
              <Sparkles className="size-3" aria-hidden="true" />
              Featured · {e.category}
            </Badge>
            <h2
              id="featured-event-heading"
              className="mt-3 text-balance text-2xl font-extrabold leading-tight tracking-tight sm:text-3xl"
            >
              {e.title}
            </h2>
            <p className="mt-1 text-sm font-medium text-white/80">
              Hosted by{' '}
              <span className="font-bold text-white">{e.community}</span>
            </p>

            {/* Meta */}
            <ul
              className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-medium text-white/85"
              aria-label="Event details"
            >
              <li className="inline-flex items-center gap-1.5">
                <Clock className="size-3.5" aria-hidden="true" />
                <time>{e.time}</time>
              </li>
              <li className="inline-flex items-center gap-1.5">
                <MapPin className="size-3.5" aria-hidden="true" />
                {e.location}
              </li>
              <li className="inline-flex items-center gap-1.5">
                <Users className="size-3.5" aria-hidden="true" />
                <span className="tabular-nums">
                  {e.attendees}/{e.capacity}
                </span>{' '}
                going
              </li>
            </ul>

            {/* Progress */}
            <div className="mt-4 max-w-md">
              <div
                className="h-1.5 w-full overflow-hidden rounded-full bg-white/15"
                role="progressbar"
                aria-valuenow={pct}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="Tickets sold"
              >
                <div
                  className="h-full rounded-full bg-gradient-to-r from-success to-white"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <p className="mt-1.5 text-[11px] font-semibold uppercase tracking-widest text-white/70">
                {pct}% sold · {e.capacity - e.attendees} tickets left
              </p>
            </div>
          </div>

          {/* CTA */}
          <div className="flex flex-col items-stretch gap-3 sm:items-end">
            <div className="text-right">
              <p className="text-[10px] font-bold uppercase tracking-widest text-white/70">
                Ticket
              </p>
              <p className="text-2xl font-black tabular-nums">
                {e.ticketPrice}
              </p>
            </div>
            <Link href={e.href} className="contents">
              <Button
                size="lg"
                className="h-12 bg-white text-foreground shadow-md hover:bg-white/90"
                trailingIcon={<ArrowRight className="size-4" />}
              >
                Get tickets
              </Button>
            </Link>
            <Link
              href={`/dashboard/community/${e.community.toLowerCase().replace(/\s+/g, '-')}`}
              className="text-center text-xs font-medium text-white/70 hover:text-white sm:text-right"
            >
              <Calendar className="mr-1 inline-block size-3" aria-hidden="true" />
              View community
            </Link>
          </div>
        </div>
      </section>
    </FadeIn>
  );
}
