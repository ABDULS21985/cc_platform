'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, MapPin, Users } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ApiService, type EventApi } from '@/services/api';

interface EventsTabProps {
  communityId: number;
  communityName: string;
}

type TabValue = 'ongoing' | 'upcoming' | 'past';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  });
}

function emptyCopy(tab: TabValue): string {
  if (tab === 'ongoing') return 'No live events at the moment';
  if (tab === 'upcoming') return 'No upcoming events at the moment';
  return 'No past events to display';
}

export function EventsTab({ communityId, communityName }: EventsTabProps) {
  const [activeTab, setActiveTab] = useState<TabValue>('ongoing');
  const [events, setEvents] = useState<EventApi[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      try {
        const res = await ApiService.events.list({
          scope: 'all',
          community_id: communityId,
          limit: 100,
        });
        if (!cancelled) {
          setEvents(res.data?.data?.events ?? []);
        }
      } catch {
        if (!cancelled) setEvents([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [communityId]);

  const filtered = useMemo(
    () =>
      events.filter((event) => {
        if (activeTab === 'ongoing') return event.status === 'live';
        if (activeTab === 'upcoming') return event.status === 'upcoming';
        return event.status === 'past';
      }),
    [activeTab, events],
  );

  const counts = useMemo(
    () => ({
      ongoing: events.filter((event) => event.status === 'live').length,
      upcoming: events.filter((event) => event.status === 'upcoming').length,
      past: events.filter((event) => event.status === 'past').length,
    }),
    [events],
  );

  return (
    <div className="space-y-6 bg-white p-4 sm:p-3">
      <div className="rounded-lg">
        <div className="mb-4 flex items-center justify-between">
          <Tabs
            value={activeTab}
            onValueChange={(v) => setActiveTab(v as TabValue)}
          >
            <TabsList className="bg-gray-100 p-1">
              {(['ongoing', 'upcoming', 'past'] as const).map((tab) => (
                <TabsTrigger
                  key={tab}
                  value={tab}
                  className="text-xs capitalize data-[state=active]:bg-white data-[state=active]:text-[#000000] data-[state=active]:shadow-sm data-[state=inactive]:text-[#525252] data-[state=inactive]:hover:text-[#000000] sm:text-sm"
                >
                  {tab === 'ongoing' ? 'Live' : tab}
                  {counts[tab] > 0 && (
                    <span className="ml-1 tabular-nums">({counts[tab]})</span>
                  )}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          <Button
            asChild
            className="rounded-full bg-[#0E9DA5] px-4 py-2 text-white hover:bg-[#0E9DA5]/90"
          >
            <Link href="/dashboard/events">Create event</Link>
          </Button>
        </div>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as TabValue)}
      >
        <TabsContent value={activeTab} className="space-y-6">
          {loading ? (
            <div className="rounded-lg bg-[#fafafb] p-6 text-center">
              <p className="text-sm text-[#525252]">Loading events...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-lg bg-[#fafafb] p-6 text-center">
              <p className="text-sm text-[#525252]">{emptyCopy(activeTab)}</p>
            </div>
          ) : (
            filtered.map((event) => (
              <Link
                href={`/dashboard/events/${event.id}`}
                key={event.id}
                className="block overflow-hidden rounded-lg border border-[#f2f2f3] bg-[#fafafb] p-3 transition-colors hover:border-[#0E9DA5]/40"
              >
                <div className="flex">
                  <div className="w-1/3 p-4">
                    {event.cover_image ? (
                      <img
                        src={event.cover_image}
                        alt=""
                        className="h-full w-full rounded object-cover"
                      />
                    ) : (
                      <div className="flex h-full min-h-24 w-full items-center justify-center rounded bg-[#eef8f8] text-[#0E9DA5]">
                        <Calendar className="size-8" aria-hidden="true" />
                      </div>
                    )}
                  </div>

                  <div className="w-full p-4 sm:p-3">
                    <div className="mb-2 flex items-center gap-2">
                      <span className="text-sm text-[#525252]">
                        <span className="text-sm font-medium text-[#000000]">
                          {event.community_name || communityName}
                        </span>{' '}
                        is hosting
                      </span>
                      {event.is_private && (
                        <span className="rounded-full bg-[#fbefe8] px-2 py-1 text-xs text-[#ff984f]">
                          Private
                        </span>
                      )}
                    </div>

                    <h3 className="mb-4 text-base font-bold text-[#000000]">
                      {event.title}
                    </h3>

                    <div className="flex flex-wrap items-center gap-3 text-sm text-[#959595]">
                      <div className="flex items-center gap-2">
                        <Calendar className="size-4" aria-hidden="true" />
                        <span>{formatDate(event.starts_at)}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <Clock className="size-4" aria-hidden="true" />
                        <span>{formatTime(event.starts_at)}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <MapPin className="size-4" aria-hidden="true" />
                        <span>{event.location || (event.is_online ? 'Online' : 'TBA')}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <Users className="size-4" aria-hidden="true" />
                        <span>{event.attendees} attendees</span>
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
