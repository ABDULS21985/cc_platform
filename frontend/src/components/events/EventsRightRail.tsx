'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  Calendar,
  Clock,
  Compass,
  MapPin,
  Sparkles,
} from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface LiveEvent {
  id: string;
  title: string;
  community: string;
  initial: string;
  startedMinsAgo: number;
  attendees: number;
}

interface SuggestedEvent {
  id: string;
  title: string;
  community: string;
  initial: string;
  date: { day: number; month: string };
  location: string;
  isOnline: boolean;
}

const LIVE: LiveEvent[] = [
  {
    id: 'live-1',
    title: 'Crypto academy · Week 4 — Live',
    community: 'Cryptos NG',
    initial: 'C',
    startedMinsAgo: 8,
    attendees: 124,
  },
  {
    id: 'live-2',
    title: 'AGM streaming · Q&A',
    community: 'Lekki Block 3 HOA',
    initial: 'L',
    startedMinsAgo: 22,
    attendees: 38,
  },
];

const SUGGESTED: SuggestedEvent[] = [
  {
    id: 's-1',
    title: 'Designers networking mixer',
    community: 'UI/UX Africa',
    initial: 'U',
    date: { day: 21, month: 'Jun' },
    location: 'Yaba, Lagos',
    isOnline: false,
  },
  {
    id: 's-2',
    title: 'Tech meetup 2026',
    community: 'Lagos Devs',
    initial: 'L',
    date: { day: 28, month: 'Jun' },
    location: 'Co-Creation Hub',
    isOnline: false,
  },
  {
    id: 's-3',
    title: 'Faith finance Q&A',
    community: 'Grace Assembly',
    initial: 'G',
    date: { day: 30, month: 'Jun' },
    location: 'Online',
    isOnline: true,
  },
];

export function EventsRightRail() {
  return (
    <div className="space-y-6">
      {/* Live now */}
      <Card variant="default" density="compact">
        <CardContent className="space-y-4 px-5">
          <header className="flex items-center justify-between">
            <h3 className="inline-flex items-center gap-2 text-sm font-semibold tracking-tight text-foreground">
              <span
                className="grid size-7 place-items-center rounded-lg bg-success/15 text-success"
                aria-hidden="true"
              >
                <span className="relative flex size-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-70" />
                  <span className="relative inline-flex size-2 rounded-full bg-success" />
                </span>
              </span>
              Live now
              <Badge variant="successSoft" size="sm" className="ml-1 tabular-nums">
                {LIVE.length}
              </Badge>
            </h3>
            <Link
              href="/dashboard/events"
              className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline underline-offset-4"
            >
              See all
              <ArrowRight className="size-3" aria-hidden="true" />
            </Link>
          </header>

          {LIVE.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              Nothing live right now.
            </p>
          ) : (
            <ul role="list" className="space-y-3">
              {LIVE.map((e) => (
                <li key={e.id}>
                  <Link
                    href={`/dashboard/events/${e.id}`}
                    className="flex items-start gap-3 rounded-xl border border-transparent p-2 -mx-2 transition-colors hover:border-border hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <Avatar className="size-9 shrink-0">
                      <AvatarFallback className="bg-success/15 text-xs font-bold text-success">
                        {e.initial}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold tracking-tight text-foreground">
                        {e.title}
                      </p>
                      <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                        {e.community} ·{' '}
                        <span className="inline-flex items-center gap-0.5">
                          <Clock
                            className="size-2.5"
                            aria-hidden="true"
                          />{' '}
                          {e.startedMinsAgo}m ago
                        </span>
                      </p>
                    </div>
                    <Button type="button" size="sm" variant="success" tabIndex={-1}>
                      Join
                    </Button>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Suggested */}
      <Card variant="default" density="compact">
        <CardContent className="space-y-4 px-5">
          <header className="flex items-center justify-between">
            <h3 className="inline-flex items-center gap-2 text-sm font-semibold tracking-tight text-foreground">
              <span
                className="grid size-7 place-items-center rounded-lg bg-brand-soft text-accent-foreground"
                aria-hidden="true"
              >
                <Sparkles className="size-3.5" />
              </span>
              Suggested for you
            </h3>
            <Link
              href="/dashboard/explore"
              className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline underline-offset-4"
            >
              Browse
              <Compass className="size-3" aria-hidden="true" />
            </Link>
          </header>

          <ul role="list" className="space-y-3">
            {SUGGESTED.map((e) => (
              <li key={e.id}>
                <Link
                  href={`/dashboard/events/${e.id}`}
                  className="flex items-start gap-3 rounded-xl border border-transparent p-2 -mx-2 transition-colors hover:border-border hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <div
                    className="grid size-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-brand-soft to-card border border-border text-foreground"
                    aria-hidden="true"
                  >
                    <div className="text-center leading-tight">
                      <p className="text-[8px] font-bold uppercase tracking-widest text-muted-foreground">
                        {e.date.month}
                      </p>
                      <p className="text-sm font-black tabular-nums">
                        {e.date.day}
                      </p>
                    </div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold tracking-tight text-foreground">
                      {e.title}
                    </p>
                    <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                      {e.community}
                    </p>
                    <p className="mt-1 inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                      <MapPin className="size-2.5" aria-hidden="true" />
                      {e.location}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* Add to calendar CTA */}
      <Card variant="outline" density="compact" className="border-dashed">
        <CardContent className="flex flex-col items-start gap-3 px-5">
          <span
            className="grid size-9 place-items-center rounded-xl bg-info/15 text-info"
            aria-hidden="true"
          >
            <Calendar className="size-4" />
          </span>
          <div>
            <p className="text-sm font-semibold tracking-tight text-foreground">
              Sync with your calendar
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Import RSVPs into Google, Apple, or Outlook calendar.
            </p>
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="w-full"
            disabled
          >
            Coming soon
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
