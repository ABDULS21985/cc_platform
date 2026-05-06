'use client';

import * as React from 'react';
import { useEffect, useState } from 'react';
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
import { Skeleton } from '@/components/ui/skeleton';
import { ApiService, type EventApi } from '@/services/api';

function minsAgo(iso: string | null): number {
  if (!iso) return 0;
  return Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60_000));
}

function dateChip(iso: string): { day: number; month: string } {
  const d = new Date(iso);
  return {
    day: d.getDate(),
    month: d.toLocaleDateString(undefined, { month: 'short' }).toUpperCase(),
  };
}

export function EventsRightRail() {
  const [live, setLive] = useState<EventApi[]>([]);
  const [suggested, setSuggested] = useState<EventApi[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [liveRes, suggestedRes] = await Promise.all([
          ApiService.events.list({ scope: 'live', limit: 5 }),
          ApiService.events.list({ scope: 'suggested', limit: 5 }),
        ]);
        if (cancelled) return;
        setLive(liveRes.data?.data?.events ?? []);
        setSuggested(suggestedRes.data?.data?.events ?? []);
      } catch {
        if (!cancelled) {
          setLive([]);
          setSuggested([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-40 rounded-2xl" />
        <Skeleton className="h-40 rounded-2xl" />
      </div>
    );
  }

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
                {live.length}
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

          {live.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              Nothing live right now.
            </p>
          ) : (
            <ul role="list" className="space-y-3">
              {live.map((e) => (
                <li key={e.id}>
                  <Link
                    href={`/dashboard/events/${e.id}`}
                    className="flex items-start gap-3 rounded-xl border border-transparent p-2 -mx-2 transition-colors hover:border-border hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <Avatar className="size-9 shrink-0">
                      <AvatarFallback className="bg-success/15 text-xs font-bold text-success">
                        {e.community_initial || e.title.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold tracking-tight text-foreground">
                        {e.title}
                      </p>
                      <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                        {e.community_name || 'Public'} ·{' '}
                        <span className="inline-flex items-center gap-0.5">
                          <Clock className="size-2.5" aria-hidden="true" />{' '}
                          {minsAgo(e.starts_at)}m ago
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

          {suggested.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              Nothing to suggest right now — explore communities to discover events.
            </p>
          ) : (
            <ul role="list" className="space-y-3">
              {suggested.map((e) => {
                const chip = dateChip(e.starts_at);
                return (
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
                            {chip.month}
                          </p>
                          <p className="text-sm font-black tabular-nums">
                            {chip.day}
                          </p>
                        </div>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold tracking-tight text-foreground">
                          {e.title}
                        </p>
                        <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                          {e.community_name || 'Public'}
                        </p>
                        <p className="mt-1 inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                          <MapPin className="size-2.5" aria-hidden="true" />
                          {e.location || (e.is_online ? 'Online' : '')}
                        </p>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
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
