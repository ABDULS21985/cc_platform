'use client';

import * as React from 'react';
import Link from 'next/link';
import { ArrowRight, Calendar, Clock, MapPin, Users } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { ApiService, type EventApi } from '@/services/api';

interface CommunityEvent {
  id: number;
  title: string;
  community: string;
  date: { day: number; month: string };
  time: string;
  location: string;
  attendees: number;
  capacity: number;
  status: 'live' | 'upcoming' | 'starting-soon';
}

const EVENTS: CommunityEvent[] = [
  {
    id: 1,
    title: 'Crypto academy · Week 4',
    community: 'Cryptos NG',
    date: { day: 14, month: 'Jun' },
    time: '18:00',
    location: 'Online',
    attendees: 14,
    capacity: 30,
    status: 'live',
  },
  {
    id: 2,
    title: 'Designers Networking Mixer',
    community: 'UI/UX Africa',
    date: { day: 21, month: 'Jun' },
    time: '17:30',
    location: 'Yaba, Lagos',
    attendees: 8,
    capacity: 20,
    status: 'upcoming',
  },
  {
    id: 3,
    title: 'Tech Meetup 2026',
    community: 'Lagos Devs',
    date: { day: 28, month: 'Jun' },
    time: '10:00',
    location: 'Co-Creation Hub',
    attendees: 23,
    capacity: 50,
    status: 'starting-soon',
  },
];

const statusBadge: Record<
  CommunityEvent['status'],
  {
    variant: 'successSoft' | 'warningSoft' | 'soft';
    label: string;
    pulse?: boolean;
  }
> = {
  live: { variant: 'successSoft', label: 'Live', pulse: true },
  'starting-soon': { variant: 'warningSoft', label: 'Soon' },
  upcoming: { variant: 'soft', label: 'Upcoming' },
};

const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function mapApi(e: EventApi): CommunityEvent {
  const d = new Date(e.starts_at);
  const time = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  let s: CommunityEvent['status'] = 'upcoming';
  if (e.status === 'live') s = 'live';
  else if (e.status === 'upcoming') {
    const ms = d.getTime() - Date.now();
    if (ms < 1000 * 60 * 60 * 24 * 2) s = 'starting-soon';
  }
  return {
    id: e.id,
    title: e.title,
    community: e.community_name ?? 'Public',
    date: { day: d.getDate(), month: MONTHS_SHORT[d.getMonth()] },
    time,
    location: e.location || (e.is_online ? 'Online' : 'TBA'),
    attendees: e.attendees,
    capacity: e.capacity || Math.max(e.attendees, 1),
    status: s,
  };
}

export default function OngoingEvents({ loading: loadingProp = false }: { loading?: boolean }) {
  const [items, setItems] = React.useState<CommunityEvent[]>(EVENTS);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await ApiService.events.list({ scope: 'all', limit: 20 });
        const list = res.data?.data?.events ?? [];
        if (cancelled) return;
        const ongoing = list
          .filter((e) => e.status !== 'past')
          .slice(0, 3);
        if (ongoing.length === 0) {
          setItems(EVENTS);
        } else {
          setItems(ongoing.map(mapApi));
        }
      } catch {
        if (!cancelled) setItems(EVENTS);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  void loadingProp;
  return (
    <Card variant="default" density="compact">
      <CardContent className="space-y-4 px-5">
        <header className="flex items-center justify-between">
          <h3 className="inline-flex items-center gap-2 text-sm font-semibold tracking-tight text-foreground">
            <span className="grid size-7 place-items-center rounded-lg bg-brand-soft text-accent-foreground">
              <Calendar className="size-3.5" aria-hidden="true" />
            </span>
            Ongoing events
          </h3>
          <Link
            href="/dashboard/events"
            className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline underline-offset-4"
          >
            See all
            <ArrowRight className="size-3" aria-hidden="true" />
          </Link>
        </header>

        {loading ? (
          <ul className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <li key={i} className="flex items-start gap-3">
                <Skeleton className="size-12 rounded-xl" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-3.5 w-3/4" />
                  <Skeleton className="h-2.5 w-1/2" />
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <ul role="list" className="space-y-3">
            {items.map((e) => {
              const status = statusBadge[e.status];
              const pct = (e.attendees / e.capacity) * 100;
              return (
                <li key={e.id}>
                  <Link
                    href={`/dashboard/events/${e.id}`}
                    className={cn(
                      'group flex items-start gap-3 rounded-xl border border-transparent p-2 transition-colors',
                      '-mx-2 hover:border-border hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
                    )}
                  >
                    {/* Date tile */}
                    <div className="grid size-12 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-brand to-[oklch(0.18_0.025_220)] text-white shadow-sm">
                      <div className="text-center leading-tight">
                        <p className="text-[8px] font-bold uppercase tracking-widest text-white/80">
                          {e.date.month}
                        </p>
                        <p className="text-base font-black tabular-nums">
                          {e.date.day}
                        </p>
                      </div>
                    </div>

                    {/* Body */}
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-semibold tracking-tight text-foreground transition-colors group-hover:text-primary">
                          {e.title}
                        </p>
                        <Badge
                          variant={status.variant}
                          size="sm"
                          className="shrink-0 gap-1"
                        >
                          {status.pulse && (
                            <span className="relative flex size-1.5" aria-hidden="true">
                              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-70" />
                              <span className="relative inline-flex size-1.5 rounded-full bg-success" />
                            </span>
                          )}
                          {status.label}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2.5 text-[11px] text-muted-foreground">
                        <span className="inline-flex items-center gap-1">
                          <Clock className="size-3" aria-hidden="true" />
                          {e.time}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="size-3" aria-hidden="true" />
                          {e.location}
                        </span>
                      </div>
                      <div className="mt-1.5 flex items-center gap-2">
                        <div className="h-1 flex-1 overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-brand to-brand-bright transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold tabular-nums text-muted-foreground">
                          <Users className="size-3" aria-hidden="true" />
                          {e.attendees}/{e.capacity}
                        </span>
                      </div>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
