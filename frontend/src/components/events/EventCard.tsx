'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowRight,
  Bookmark,
  Check,
  Clock,
  Globe,
  Lock,
  MapPin,
  Ticket,
  Users,
} from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { motion } from '@/components/ui/motion';
import { cn } from '@/lib/utils';

export interface EventItem {
  id: string;
  title: string;
  community: string;
  communityInitial: string;
  isPrivate: boolean;
  /** ISO timestamp. */
  startsAt: string;
  duration: string;
  location: string;
  isOnline: boolean;
  attendees: number;
  capacity: number;
  ticketPrice: string | null; // null = free
  status: 'live' | 'upcoming' | 'past';
  isAttending: boolean;
  isHosting: boolean;
  /** Optional category label rendered as a small chip. */
  category?: string;
}

interface EventCardProps {
  event: EventItem;
  onToggleAttend?: (id: string) => void;
}

const STATUS_CONFIG: Record<
  EventItem['status'],
  {
    label: string;
    variant: 'successSoft' | 'warningSoft' | 'soft';
    pulse?: boolean;
  }
> = {
  live: { label: 'Live now', variant: 'successSoft', pulse: true },
  upcoming: { label: 'Upcoming', variant: 'soft' },
  past: { label: 'Past', variant: 'soft' },
};

function formatDateTime(iso: string): { day: string; month: string; time: string } {
  const date = new Date(iso);
  const day = date.toLocaleDateString(undefined, { day: '2-digit' });
  const month = date.toLocaleDateString(undefined, { month: 'short' }).toUpperCase();
  const time = date.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
    hour12: false,
  });
  return { day, month, time };
}

export function EventCard({ event, onToggleAttend }: EventCardProps) {
  const router = useRouter();
  const dt = formatDateTime(event.startsAt);
  const status = STATUS_CONFIG[event.status];
  const pct = Math.min(100, Math.round((event.attendees / event.capacity) * 100));
  const isFull = event.attendees >= event.capacity;

  const navigate = () => router.push(`/dashboard/events/${event.id}`);

  return (
    <Card
      variant="default"
      interactive
      role="article"
      onClick={navigate}
      onKeyDown={(e) => {
        if (e.key === 'Enter') navigate();
      }}
      aria-label={`${event.title}, ${dt.day} ${dt.month}`}
      className={cn(
        'group/card overflow-hidden',
        event.status === 'past' && 'opacity-80'
      )}
    >
      <CardContent className="px-0">
        <div className="flex flex-col gap-4 sm:flex-row">
          {/* Date tile */}
          <div className="flex shrink-0 items-start px-5 pt-5 sm:pl-6 sm:pr-0">
            <div
              className={cn(
                'flex size-20 flex-col items-center justify-center rounded-2xl shadow-sm',
                event.status === 'live'
                  ? 'bg-gradient-to-br from-brand to-brand-bright text-white'
                  : 'bg-gradient-to-br from-brand-soft to-card border border-border text-foreground'
              )}
              aria-hidden="true"
            >
              <span
                className={cn(
                  'text-[10px] font-bold uppercase tracking-widest',
                  event.status === 'live'
                    ? 'text-white/80'
                    : 'text-muted-foreground'
                )}
              >
                {dt.month}
              </span>
              <span className="text-3xl font-black tabular-nums tracking-tight">
                {dt.day}
              </span>
            </div>
          </div>

          {/* Body */}
          <div className="min-w-0 flex-1 px-5 pb-5 pt-5 sm:pl-0 sm:pr-6">
            {/* Top meta */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 text-xs">
                <Avatar className="size-5">
                  <AvatarFallback className="bg-primary text-[9px] font-bold text-primary-foreground">
                    {event.communityInitial}
                  </AvatarFallback>
                </Avatar>
                <span className="font-medium text-muted-foreground">
                  Hosted by{' '}
                  <span className="font-semibold text-foreground">
                    {event.community}
                  </span>
                </span>
              </span>

              <Badge
                variant={event.isPrivate ? 'warningSoft' : 'successSoft'}
                size="sm"
                className="gap-1"
              >
                {event.isPrivate ? (
                  <Lock className="size-2.5" aria-hidden="true" />
                ) : (
                  <Globe className="size-2.5" aria-hidden="true" />
                )}
                {event.isPrivate ? 'Private' : 'Public'}
              </Badge>

              <Badge variant={status.variant} size="sm" className="gap-1.5">
                {status.pulse && (
                  <span className="relative flex size-1.5" aria-hidden="true">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-70" />
                    <span className="relative inline-flex size-1.5 rounded-full bg-success" />
                  </span>
                )}
                {status.label}
              </Badge>

              {event.category && (
                <span className="hidden text-[10px] font-semibold uppercase tracking-widest text-muted-foreground sm:inline">
                  · {event.category}
                </span>
              )}
            </div>

            {/* Title */}
            <h3 className="mt-2 text-base font-bold tracking-tight text-foreground transition-colors group-hover/card:text-primary sm:text-lg">
              {event.title}
            </h3>

            {/* Meta row */}
            <ul
              className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground"
              aria-label="Event details"
            >
              <li className="inline-flex items-center gap-1">
                <Clock className="size-3.5" aria-hidden="true" />
                <time dateTime={event.startsAt}>
                  {dt.time} · {event.duration}
                </time>
              </li>
              <li className="inline-flex items-center gap-1">
                <MapPin className="size-3.5" aria-hidden="true" />
                {event.isOnline ? 'Online' : event.location}
              </li>
              <li className="inline-flex items-center gap-1">
                <Users className="size-3.5" aria-hidden="true" />
                <span className="tabular-nums">
                  {event.attendees}/{event.capacity}
                </span>
              </li>
              {event.ticketPrice !== null && (
                <li className="inline-flex items-center gap-1 font-semibold text-foreground">
                  <Ticket className="size-3.5" aria-hidden="true" />
                  {event.ticketPrice === '0' ? 'Free' : `₦${event.ticketPrice}`}
                </li>
              )}
            </ul>

            {/* Capacity bar */}
            {event.status !== 'past' && (
              <div className="mt-3 max-w-md">
                <div
                  className="h-1 w-full overflow-hidden rounded-full bg-muted"
                  role="progressbar"
                  aria-valuenow={pct}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label="Tickets sold"
                >
                  <div
                    className={cn(
                      'h-full rounded-full transition-all',
                      isFull
                        ? 'bg-warning'
                        : 'bg-gradient-to-r from-brand to-brand-bright'
                    )}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <p className="mt-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                  {isFull
                    ? 'Sold out · Waitlist open'
                    : `${pct}% sold · ${event.capacity - event.attendees} tickets left`}
                </p>
              </div>
            )}

            {/* Actions */}
            <div
              className="mt-4 flex flex-wrap items-center justify-between gap-2"
              onClick={(e) => e.stopPropagation()}
            >
              {event.isHosting ? (
                <Badge variant="infoSoft" size="lg" className="gap-1.5">
                  <Users className="size-3" aria-hidden="true" />
                  You&apos;re hosting
                </Badge>
              ) : event.status === 'past' ? (
                <span className="text-xs text-muted-foreground">
                  This event has ended.
                </span>
              ) : (
                <motion.div whileTap={{ scale: 0.97 }}>
                  <Button
                    type="button"
                    size="sm"
                    variant={event.isAttending ? 'soft' : 'default'}
                    onClick={() => onToggleAttend?.(event.id)}
                    leadingIcon={
                      event.isAttending ? (
                        <Check className="size-3.5" />
                      ) : (
                        <Ticket className="size-3.5" />
                      )
                    }
                  >
                    {event.isAttending ? "You're going" : 'Get ticket'}
                  </Button>
                </motion.div>
              )}

              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  size="icon-sm"
                  variant="ghost"
                  aria-label="Save event"
                  onClick={(e) => {
                    e.stopPropagation();
                    /* todo: wire bookmarks API */
                  }}
                >
                  <Bookmark className="size-4" aria-hidden="true" />
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  trailingIcon={<ArrowRight className="size-3.5" />}
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate();
                  }}
                >
                  Details
                </Button>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
