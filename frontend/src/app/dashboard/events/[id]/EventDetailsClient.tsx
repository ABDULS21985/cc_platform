'use client';

import * as React from 'react';
import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import {
  Calendar,
  Clock,
  MapPin,
  Globe,
  Lock,
  Ticket,
  Users,
  ArrowLeft,
} from 'lucide-react';
import { PaymentDialog } from '@/components/events/PaymentDialog';
import { ApiService, type EventApi } from '@/services/api';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

export default function EventDetailsClient() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const eventId = useMemo(() => Number(params?.id), [params?.id]);

  const [event, setEvent] = useState<EventApi | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!Number.isFinite(eventId)) {
      setError('Invalid event id');
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const res = await ApiService.events.get(eventId);
        if (cancelled) return;
        const e = res.data?.data?.event;
        if (!e) {
          setError('Event not found');
        } else {
          setEvent(e);
        }
      } catch {
        if (!cancelled) setError('Could not load event');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [eventId]);

  const isPaid = !!(event?.ticket_price && event.ticket_price !== '0' && event.ticket_price !== '');
  const paidTicketingUnavailable = isPaid && event?.payment_supported !== true;
  const isAttending = !!event?.is_attending;

  const handleJoin = async () => {
    if (!event) return;
    if (paidTicketingUnavailable && !isAttending) {
      setPaymentOpen(true);
      return;
    }
    await commitAttendance();
  };

  const commitAttendance = async () => {
    if (!event) return;
    if (!isAttending && isPaid && event.payment_supported !== true) {
      setPaymentOpen(true);
      return;
    }
    setSubmitting(true);
    try {
      const res = isAttending
        ? await ApiService.events.cancelAttendance(event.id)
        : await ApiService.events.attend(event.id);
      const updated = res.data?.data?.event;
      if (updated) setEvent(updated);
      toast.success(isAttending ? 'Removed from your events' : 'Added to your events');
    } catch {
      toast.error('Could not update attendance');
    } finally {
      setSubmitting(false);
      setPaymentOpen(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout pageTitle="Event">
        <div className="space-y-4">
          <Skeleton className="h-48 w-full rounded-2xl" />
          <Skeleton className="h-8 w-2/3 rounded" />
          <Skeleton className="h-4 w-1/2 rounded" />
          <Skeleton className="h-32 w-full rounded-2xl" />
        </div>
      </DashboardLayout>
    );
  }

  if (error || !event) {
    return (
      <DashboardLayout pageTitle="Event">
        <EmptyState
          icon={<Calendar className="size-5" aria-hidden="true" />}
          title={error ?? 'Event not found'}
          description="This event may have been cancelled or removed."
          action={
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push('/dashboard/events')}
              leadingIcon={<ArrowLeft className="size-4" />}
            >
              Back to events
            </Button>
          }
        />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout pageTitle="Event">
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          {/* Cover */}
          <div className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-brand-soft to-brand/15 aspect-[16/7]">
            {event.cover_image ? (
              <img
                src={event.cover_image}
                alt={event.title}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="grid h-full place-items-center text-6xl font-extrabold text-brand/30 select-none">
                {event.community_initial || event.title.charAt(0).toUpperCase()}
              </div>
            )}
            <Badge
              variant={
                event.status === 'live'
                  ? 'destructiveSoft'
                  : event.status === 'past'
                    ? 'soft'
                    : 'soft'
              }
              size="sm"
              className="absolute left-4 top-4 capitalize"
            >
              {event.status}
            </Badge>
          </div>

          {/* Title + Join */}
          <div className="rounded-2xl border border-border bg-card p-6 space-y-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  {event.is_private ? (
                    <Lock className="size-3" aria-hidden="true" />
                  ) : (
                    <Globe className="size-3" aria-hidden="true" />
                  )}
                  <span>{event.is_private ? 'Private' : 'Public'}</span>
                  {event.community_name && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span>{event.community_name}</span>
                    </>
                  )}
                  {event.category && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span>{event.category}</span>
                    </>
                  )}
                </div>
                <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-foreground">
                  {event.title}
                </h1>
              </div>
              <Button
                type="button"
                size="default"
                disabled={submitting || event.status === 'past'}
                variant={isAttending ? 'soft' : 'default'}
                onClick={handleJoin}
              >
                {isAttending
                  ? "You're going"
                  : paidTicketingUnavailable
                    ? 'Paid tickets unavailable'
                    : isPaid
                      ? `Get ticket · ₦${event.ticket_price}`
                    : 'Join event'}
              </Button>
            </div>

            {/* Metadata */}
            <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 text-sm">
              <div>
                <dt className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Date
                </dt>
                <dd className="mt-1 flex items-center gap-2 text-foreground">
                  <Calendar className="size-4 text-muted-foreground" aria-hidden="true" />
                  {formatDate(event.starts_at)}
                </dd>
              </div>
              <div>
                <dt className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Time
                </dt>
                <dd className="mt-1 flex items-center gap-2 text-foreground">
                  <Clock className="size-4 text-muted-foreground" aria-hidden="true" />
                  {formatTime(event.starts_at)}
                  {event.duration_label ? ` · ${event.duration_label}` : ''}
                </dd>
              </div>
              <div>
                <dt className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Location
                </dt>
                <dd className="mt-1 flex items-center gap-2 text-foreground">
                  <MapPin className="size-4 text-muted-foreground" aria-hidden="true" />
                  {event.location || (event.is_online ? 'Online' : '—')}
                </dd>
              </div>
              <div>
                <dt className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Fee
                </dt>
                <dd className="mt-1 flex items-center gap-2 text-foreground">
                  <Ticket className="size-4 text-muted-foreground" aria-hidden="true" />
                  {isPaid ? `₦${event.ticket_price}` : 'Free'}
                </dd>
              </div>
            </dl>

            {/* Description */}
            {event.description && (
              <div>
                <h2 className="text-sm font-semibold text-foreground">About</h2>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                  {event.description}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right rail */}
        <aside className="space-y-4">
          <div className="rounded-2xl border border-border bg-card p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-foreground">Attendees</h3>
              <Badge variant="soft" size="sm" className="tabular-nums">
                {event.attendees}
              </Badge>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              {event.capacity > 0
                ? `${event.attendees}/${event.capacity} going`
                : `${event.attendees} going`}
            </p>
            {event.community_name && (
              <div className="mt-4 flex items-center gap-3 rounded-xl border border-border bg-muted/30 p-3">
                <Avatar className="size-10">
                  <AvatarFallback className="bg-brand/15 text-brand">
                    {event.community_initial || event.community_name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    Hosted by
                  </p>
                  <p className="truncate text-sm font-semibold text-foreground">
                    {event.community_name}
                  </p>
                </div>
              </div>
            )}
          </div>
        </aside>
      </div>

      <PaymentDialog
        isOpen={paymentOpen}
        onClose={() => setPaymentOpen(false)}
        amount={event.ticket_price ?? '0'}
      />
    </DashboardLayout>
  );
}
