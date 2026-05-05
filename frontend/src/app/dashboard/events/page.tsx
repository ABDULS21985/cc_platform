'use client';

import * as React from 'react';
import { useEffect, useMemo, useState } from 'react';
import { ApiService, type EventApi } from '@/services/api';
import {
  Calendar as CalendarIcon,
  Compass,
  Filter,
  Search,
  Sparkles,
  Ticket,
  Users,
} from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { motion, AnimatePresence } from '@/components/ui/motion';
import { EventsHero } from '@/components/events/EventsHero';
import { EventCard, type EventItem } from '@/components/events/EventCard';
import { EventsRightRail } from '@/components/events/EventsRightRail';
import { CreateEventDialog } from '@/components/community/CreateEventDialog';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export const dynamic = 'force-dynamic';

type TabValue = 'upcoming' | 'live' | 'hosting' | 'past';

interface TabMeta {
  value: TabValue;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
}

const TABS: TabMeta[] = [
  {
    value: 'upcoming',
    label: 'Upcoming',
    icon: CalendarIcon,
    description: 'Events in the next few weeks across your circles.',
  },
  {
    value: 'live',
    label: 'Live now',
    icon: Sparkles,
    description: 'Streaming or running right now — jump in.',
  },
  {
    value: 'hosting',
    label: 'Hosting',
    icon: Users,
    description: 'Events you organize across your circles.',
  },
  {
    value: 'past',
    label: 'Past',
    icon: Ticket,
    description: 'Recordings, recaps, and receipts.',
  },
];

// Realistic mock until the events API surface lands.
const today = new Date();
const iso = (offsetDays: number, hour = 18, minute = 0) => {
  const d = new Date(today);
  d.setDate(d.getDate() + offsetDays);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
};

const MOCK_EVENTS: EventItem[] = [
  {
    id: '1',
    title: 'Lagos Half Marathon — Race day',
    community: 'Lekki Runners',
    communityInitial: 'L',
    isPrivate: false,
    startsAt: iso(-1, 6, 0), // started 30 min ago
    duration: '4 hr',
    location: 'Lekki Phase 1',
    isOnline: false,
    attendees: 184,
    capacity: 300,
    ticketPrice: '12,500',
    status: 'live',
    isAttending: true,
    isHosting: false,
    category: 'Sports',
  },
  {
    id: '2',
    title: 'Crypto academy · Week 4 — Live class',
    community: 'Cryptos NG',
    communityInitial: 'C',
    isPrivate: true,
    startsAt: iso(0, 18, 0),
    duration: '90 min',
    location: 'Online · Zoom',
    isOnline: true,
    attendees: 124,
    capacity: 150,
    ticketPrice: null,
    status: 'live',
    isAttending: false,
    isHosting: false,
    category: 'Education',
  },
  {
    id: '3',
    title: 'AGM · Q2 financial review',
    community: 'Lekki Block 3 HOA',
    communityInitial: 'L',
    isPrivate: true,
    startsAt: iso(0, 20, 0),
    duration: '2 hr',
    location: 'Block 3 Clubhouse',
    isOnline: false,
    attendees: 38,
    capacity: 60,
    ticketPrice: null,
    status: 'upcoming',
    isAttending: true,
    isHosting: true,
    category: 'Estate',
  },
  {
    id: '4',
    title: 'Designers networking mixer',
    community: 'UI/UX Africa',
    communityInitial: 'U',
    isPrivate: false,
    startsAt: iso(2, 17, 30),
    duration: '3 hr',
    location: 'Yaba, Lagos',
    isOnline: false,
    attendees: 72,
    capacity: 120,
    ticketPrice: '5,000',
    status: 'upcoming',
    isAttending: false,
    isHosting: false,
    category: 'Design',
  },
  {
    id: '5',
    title: 'Tech meetup 2026',
    community: 'Lagos Devs',
    communityInitial: 'L',
    isPrivate: false,
    startsAt: iso(7, 10, 0),
    duration: '6 hr',
    location: 'Co-Creation Hub',
    isOnline: false,
    attendees: 218,
    capacity: 250,
    ticketPrice: '0',
    status: 'upcoming',
    isAttending: true,
    isHosting: false,
    category: 'Tech',
  },
  {
    id: '6',
    title: 'Faith finance Q&A',
    community: 'Grace Assembly',
    communityInitial: 'G',
    isPrivate: false,
    startsAt: iso(9, 19, 0),
    duration: '60 min',
    location: 'Online · YouTube Live',
    isOnline: true,
    attendees: 540,
    capacity: 1000,
    ticketPrice: null,
    status: 'upcoming',
    isAttending: false,
    isHosting: false,
    category: 'Faith',
  },
  {
    id: '7',
    title: 'Co-op rotation #14 · Payout',
    community: 'Trinity Co-op',
    communityInitial: 'T',
    isPrivate: true,
    startsAt: iso(14, 12, 0),
    duration: '30 min',
    location: 'Online',
    isOnline: true,
    attendees: 24,
    capacity: 24,
    ticketPrice: null,
    status: 'upcoming',
    isAttending: true,
    isHosting: true,
    category: 'Co-op',
  },
  // Past events
  {
    id: '8',
    title: 'Fundraiser concert · Kids in tech',
    community: 'Lagos Devs',
    communityInitial: 'L',
    isPrivate: false,
    startsAt: iso(-7, 18, 0),
    duration: '4 hr',
    location: 'Hard Rock Café, VI',
    isOnline: false,
    attendees: 312,
    capacity: 350,
    ticketPrice: '7,500',
    status: 'past',
    isAttending: true,
    isHosting: false,
    category: 'Music',
  },
];

function dateBucket(iso: string): 'today' | 'tomorrow' | 'this-week' | 'later' {
  const d = new Date(iso);
  const now = new Date();
  const startOfDay = (date: Date) => {
    const c = new Date(date);
    c.setHours(0, 0, 0, 0);
    return c;
  };
  const dayDiff = Math.round(
    (startOfDay(d).getTime() - startOfDay(now).getTime()) / (1000 * 60 * 60 * 24)
  );
  if (dayDiff <= 0) return 'today';
  if (dayDiff === 1) return 'tomorrow';
  if (dayDiff <= 7) return 'this-week';
  return 'later';
}

const BUCKET_LABEL: Record<ReturnType<typeof dateBucket>, string> = {
  today: 'Today',
  tomorrow: 'Tomorrow',
  'this-week': 'This week',
  later: 'Later',
};

const BUCKET_ORDER: Array<ReturnType<typeof dateBucket>> = [
  'today',
  'tomorrow',
  'this-week',
  'later',
];

function mapApiEvent(e: EventApi): EventItem {
  return {
    id: `srv-${e.id}`,
    title: e.title,
    community: e.community_name ?? 'Public',
    communityInitial: e.community_initial,
    isPrivate: e.is_private,
    startsAt: e.starts_at,
    duration: e.duration_label ?? '',
    location: e.location || (e.is_online ? 'Online' : ''),
    isOnline: e.is_online,
    attendees: e.attendees,
    capacity: e.capacity,
    ticketPrice: e.ticket_price ?? null,
    status: e.status,
    isAttending: e.is_attending,
    isHosting: e.is_hosting,
    category: e.category ?? undefined,
  };
}

const SRV_PREFIX = 'srv-';
const isServerId = (id: string) => id.startsWith(SRV_PREFIX);
const serverIdNum = (id: string) => Number(id.slice(SRV_PREFIX.length));

export default function EventsPage() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [usingMock, setUsingMock] = useState(false);
  const [activeTab, setActiveTab] = useState<TabValue>('upcoming');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<'soonest' | 'popular' | 'newest'>('soonest');
  const [createOpen, setCreateOpen] = useState(false);
  const [rightRailOpen, setRightRailOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await ApiService.events.list({ scope: 'all', limit: 200 });
        const list = res.data?.data?.events ?? [];
        if (cancelled) return;
        if (list.length === 0) {
          setEvents(MOCK_EVENTS);
          setUsingMock(true);
        } else {
          setEvents(list.map(mapApiEvent));
          setUsingMock(false);
        }
      } catch {
        if (!cancelled) {
          setEvents(MOCK_EVENTS);
          setUsingMock(true);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const stats = useMemo(
    () => ({
      thisMonth: events.length,
      attending: events.filter((e) => e.isAttending && e.status !== 'past').length,
      hosting: events.filter((e) => e.isHosting && e.status !== 'past').length,
    }),
    [events]
  );

  const counts = useMemo<Record<TabValue, number>>(
    () => ({
      upcoming: events.filter((e) => e.status === 'upcoming').length,
      live: events.filter((e) => e.status === 'live').length,
      hosting: events.filter((e) => e.isHosting).length,
      past: events.filter((e) => e.status === 'past').length,
    }),
    [events]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return events
      .filter((e) => {
        switch (activeTab) {
          case 'upcoming':
            return e.status === 'upcoming';
          case 'live':
            return e.status === 'live';
          case 'hosting':
            return e.isHosting;
          case 'past':
            return e.status === 'past';
          default:
            return true;
        }
      })
      .filter((e) => {
        if (!q) return true;
        return (
          e.title.toLowerCase().includes(q) ||
          e.community.toLowerCase().includes(q) ||
          (e.category?.toLowerCase().includes(q) ?? false)
        );
      })
      .sort((a, b) => {
        if (sort === 'soonest') {
          return new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime();
        }
        if (sort === 'popular') {
          return b.attendees - a.attendees;
        }
        return new Date(b.startsAt).getTime() - new Date(a.startsAt).getTime();
      });
  }, [events, activeTab, search, sort]);

  const grouped = useMemo(() => {
    const map = new Map<ReturnType<typeof dateBucket>, EventItem[]>();
    for (const e of filtered) {
      const b = dateBucket(e.startsAt);
      const list = map.get(b) ?? [];
      list.push(e);
      map.set(b, list);
    }
    // Preserve sort order within each bucket; respect bucket display order.
    return BUCKET_ORDER.filter((b) => map.has(b)).map((b) => ({
      bucket: b,
      label: BUCKET_LABEL[b],
      items: map.get(b) ?? [],
    }));
  }, [filtered]);

  const toggleAttend = (id: string) => {
    setEvents((prev) =>
      prev.map((e) =>
        e.id === id
          ? {
              ...e,
              isAttending: !e.isAttending,
              attendees: e.isAttending ? e.attendees - 1 : e.attendees + 1,
            }
          : e
      )
    );
    const event = events.find((e) => e.id === id);
    if (!usingMock && isServerId(id)) {
      const numericId = serverIdNum(id);
      const promise = event?.isAttending
        ? ApiService.events.cancelAttendance(numericId)
        : ApiService.events.attend(numericId);
      promise.catch(() => {
        // revert on failure
        setEvents((prev) =>
          prev.map((e) =>
            e.id === id
              ? {
                  ...e,
                  isAttending: !e.isAttending,
                  attendees: e.isAttending ? e.attendees - 1 : e.attendees + 1,
                }
              : e
          )
        );
        toast.error('Could not update attendance');
      });
    }
    toast.success(
      event?.isAttending ? 'Removed from your events' : 'Added to your events'
    );
  };

  return (
    <DashboardLayout pageTitle="Events">
      <div className="space-y-6">
        <EventsHero stats={stats} onCreate={() => setCreateOpen(true)} />

        {/* Mobile right-rail trigger */}
        <div className="flex justify-end lg:hidden">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setRightRailOpen(true)}
            leadingIcon={<Sparkles className="size-4" />}
          >
            Live &amp; suggested
          </Button>
        </div>

        <div className="flex flex-col gap-6 lg:flex-row">
          {/* Main column */}
          <div className="min-w-0 flex-1 space-y-5">
            {/* Tabs */}
            <div
              role="tablist"
              aria-label="Event sections"
              className="-mx-1 overflow-x-auto px-1"
            >
              <div className="inline-flex items-center gap-1 rounded-full border border-border bg-card p-1 shadow-xs">
                {TABS.map((t) => {
                  const isActive = activeTab === t.value;
                  const Icon = t.icon;
                  return (
                    <button
                      key={t.value}
                      type="button"
                      role="tab"
                      aria-selected={isActive}
                      aria-controls={`events-panel-${t.value}`}
                      id={`events-tab-${t.value}`}
                      onClick={() => setActiveTab(t.value)}
                      className={cn(
                        'relative inline-flex items-center gap-2 whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition-colors',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                        isActive
                          ? 'text-primary-foreground'
                          : 'text-muted-foreground hover:text-foreground'
                      )}
                    >
                      {isActive && (
                        <motion.span
                          layoutId="events-tab-pill"
                          className="absolute inset-0 -z-10 rounded-full bg-primary shadow-sm"
                          transition={{
                            type: 'spring',
                            stiffness: 400,
                            damping: 32,
                          }}
                        />
                      )}
                      <Icon className="size-4" aria-hidden="true" />
                      {t.label}
                      <Badge
                        variant={isActive ? 'outline' : 'soft'}
                        size="sm"
                        className={cn(
                          'tabular-nums',
                          isActive &&
                            'border-primary-foreground/30 bg-primary-foreground/15 text-primary-foreground'
                        )}
                      >
                        {counts[t.value]}
                      </Badge>
                    </button>
                  );
                })}
              </div>
            </div>

            <p className="-mt-2 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <Sparkles className="size-3" aria-hidden="true" />
              {TABS.find((t) => t.value === activeTab)?.description}
            </p>

            {/* Search + sort */}
            <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-3 shadow-xs sm:flex-row sm:items-center sm:p-4">
              <div className="relative flex-1">
                <Search
                  className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden="true"
                />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search events by title, community, or category…"
                  className="h-11 rounded-xl pl-11"
                  aria-label="Search events"
                />
              </div>
              <Select
                value={sort}
                onValueChange={(v) =>
                  setSort(v as typeof sort)
                }
              >
                <SelectTrigger
                  className="h-11 w-full rounded-xl px-3 sm:w-48"
                  aria-label="Sort events"
                >
                  <span className="inline-flex items-center gap-2">
                    <Filter
                      className="size-4 text-muted-foreground"
                      aria-hidden="true"
                    />
                    <SelectValue placeholder="Sort" />
                  </span>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="soonest">Soonest first</SelectItem>
                  <SelectItem value="popular">Most popular</SelectItem>
                  <SelectItem value="newest">Newest</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* List */}
            <div
              role="tabpanel"
              id={`events-panel-${activeTab}`}
              aria-labelledby={`events-tab-${activeTab}`}
            >
              <AnimatePresence mode="wait">
                <motion.div
                  key={`${activeTab}-${search}-${sort}`}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                  className="space-y-7"
                >
                  {filtered.length === 0 ? (
                    <EmptyState
                      icon={<CalendarIcon className="size-5" aria-hidden="true" />}
                      title={
                        search
                          ? 'No matches'
                          : activeTab === 'live'
                            ? 'Nothing live right now'
                            : activeTab === 'hosting'
                              ? 'You aren’t hosting any events'
                              : activeTab === 'past'
                                ? 'No past events yet'
                                : 'No upcoming events'
                      }
                      description={
                        search
                          ? 'Try a different search or change tabs.'
                          : activeTab === 'hosting'
                            ? 'Spin up an event in any community where you’re an admin.'
                            : activeTab === 'past'
                              ? 'Once you attend or host an event, it’ll show here.'
                              : 'Check back soon — your circles add events all the time.'
                      }
                      action={
                        activeTab !== 'past' ? (
                          <Button
                            onClick={() => setCreateOpen(true)}
                            leadingIcon={<CalendarIcon className="size-4" />}
                          >
                            Create an event
                          </Button>
                        ) : undefined
                      }
                    />
                  ) : (
                    grouped.map((group) => (
                      <section
                        key={group.bucket}
                        aria-labelledby={`bucket-${group.bucket}`}
                        className="space-y-3"
                      >
                        <div className="flex items-center gap-2">
                          <h2
                            id={`bucket-${group.bucket}`}
                            className="text-xs font-bold uppercase tracking-widest text-muted-foreground"
                          >
                            {group.label}
                          </h2>
                          <span
                            aria-hidden="true"
                            className="h-px flex-1 bg-border"
                          />
                          <Badge variant="soft" size="sm" className="tabular-nums">
                            {group.items.length}
                          </Badge>
                        </div>
                        <ul className="space-y-3" role="list">
                          {group.items.map((event, i) => (
                            <motion.li
                              key={event.id}
                              initial={{ opacity: 0, y: 8 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{
                                delay: 0.04 * i,
                                duration: 0.3,
                                ease: [0.16, 1, 0.3, 1],
                              }}
                            >
                              <EventCard
                                event={event}
                                onToggleAttend={toggleAttend}
                              />
                            </motion.li>
                          ))}
                        </ul>
                      </section>
                    ))
                  )}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Bottom CTA */}
            <Card variant="outline" density="compact" className="border-dashed">
              <CardContent className="flex flex-col items-start gap-3 px-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <span
                    className="grid size-9 shrink-0 place-items-center rounded-xl bg-brand-soft text-accent-foreground"
                    aria-hidden="true"
                  >
                    <Compass className="size-4" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold tracking-tight text-foreground">
                      Looking for more?
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Discover events from communities you&apos;re not a member of yet.
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => (window.location.href = '/dashboard/explore')}
                >
                  Explore events
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Desktop right rail */}
          <aside
            className="hidden w-80 flex-shrink-0 lg:block"
            aria-label="Live now and suggested events"
          >
            <div className="sticky top-6">
              <EventsRightRail />
            </div>
          </aside>
        </div>

        {/* Mobile right rail */}
        <Sheet open={rightRailOpen} onOpenChange={setRightRailOpen}>
          <SheetContent
            side="right"
            title="Live & suggested"
            description="What's happening right now and what to attend next"
          >
            <EventsRightRail />
          </SheetContent>
        </Sheet>

        <CreateEventDialog
          isOpen={createOpen}
          onClose={() => setCreateOpen(false)}
          onSubmit={async (data) => {
            setCreateOpen(false);
            try {
              const res = await ApiService.events.create({
                title: data.title,
                description: data.description,
                starts_at: new Date(data.startsAt).toISOString(),
                location: data.location,
                is_private: data.isPrivate,
                ticket_price: data.fee?.trim() ? data.fee.trim() : null,
              });
              const created = res.data?.data?.event;
              if (created) {
                setEvents((prev) => [mapApiEvent(created), ...prev]);
                setUsingMock(false);
              }
              toast.success('Event scheduled');
            } catch {
              toast.error('Could not create event');
            }
          }}
        />
      </div>
    </DashboardLayout>
  );
}
