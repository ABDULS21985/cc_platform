'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Calendar, Clock, MapPin, Users } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

interface EventsTabProps {
  communityName: string;
}

interface Event {
  id: string;
  title: string;
  host: string;
  isPrivate: boolean;
  date: string;
  time: string;
  location: string;
  attendees: number;
  imagePlaceholder: string;
  attendeesAvatars: string[];
}

export function EventsTab({ communityName }: EventsTabProps) {
  const [activeTab, setActiveTab] = useState<'ongoing' | 'upcoming' | 'past'>(
    'ongoing'
  );

  const events: Event[] = [
    {
      id: '1',
      title: 'Virtual Coffee Chat: Networking for Designers',
      host: '@cryptoacademy',
      isPrivate: true,
      date: 'Tue jun 12',
      time: '11:15pm',
      location: 'Online zoom',
      attendees: 200,
      imagePlaceholder: 'TALK\nLIVE\nSHOW',
      attendeesAvatars: [
        '/images/avatar1.png',
        '/images/avatar2.png',
        '/images/avatar3.png',
      ],
    },
    {
      id: '2',
      title: 'Virtual Coffee Chat: Networking for Designers',
      host: '@cryptoacademy',
      isPrivate: true,
      date: 'Tue jun 12',
      time: '11:15pm',
      location: 'Online zoom',
      attendees: 200,
      imagePlaceholder: 'TALK\nLIVE\nSHOW',
      attendeesAvatars: [
        '/images/avatar1.png',
        '/images/avatar2.png',
        '/images/avatar3.png',
      ],
    },
  ];

  return (
    <div className="space-y-6 bg-white p-4 sm:p-3">
      <div className="rounded-lg">
        <div className="flex items-center justify-between mb-4">
          <Tabs
            value={activeTab}
            onValueChange={(v) =>
              setActiveTab(v as 'ongoing' | 'upcoming' | 'past')
            }
          >
            <TabsList className="bg-gray-100 p-1">
              <TabsTrigger
                value="ongoing"
                className="text-xs sm:text-sm data-[state=active]:bg-white data-[state=active]:text-[#000000] data-[state=active]:shadow-sm data-[state=inactive]:text-[#525252] data-[state=inactive]:hover:text-[#000000]"
              >
                Ongoing
              </TabsTrigger>
              <TabsTrigger
                value="upcoming"
                className="text-xs sm:text-sm data-[state=active]:bg-white data-[state=active]:text-[#000000] data-[state=active]:shadow-sm data-[state=inactive]:text-[#525252] data-[state=inactive]:hover:text-[#000000]"
              >
                Upcoming
              </TabsTrigger>
              <TabsTrigger
                value="past"
                className="text-xs sm:text-sm data-[state=active]:bg-white data-[state=active]:text-[#000000] data-[state=active]:shadow-sm data-[state=inactive]:text-[#525252] data-[state=inactive]:hover:text-[#000000]"
              >
                Past
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <Button className="bg-[#0E9DA5] hover:bg-[#0E9DA5]/90 text-white px-4 py-2 rounded-full">
            Create event
          </Button>
        </div>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={(v) =>
          setActiveTab(v as 'ongoing' | 'upcoming' | 'past')
        }
      >
        <TabsContent value="ongoing" className="space-y-6">
          {events.map((event) => (
            <div
              key={event.id}
              className="bg-[#fafafb] rounded-lg overflow-hidden border border-[#f2f2f3] p-3"
            >
              <div className="flex">
                <div className="w-1/3 p-4">
                  <img
                    src="/images/event.svg"
                    alt="Event banner"
                    className="w-full h-full object-cover rounded"
                  />
                </div>

                <div className="w-full p-4 sm:p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm text-[#525252]">
                      <span className="text-sm font-[500] text-[#000000]">
                        {event.host}
                      </span>{' '}
                      is hosting
                    </span>
                    {event.isPrivate && (
                      <span className="bg-[#fbefe8] text-[#ff984f] text-xs px-2 py-1 rounded-full">
                        Private
                      </span>
                    )}
                  </div>

                  <h3 className="text-md sm:text-md font-bold text-[#000000] mb-4">
                    {event.title}
                  </h3>

                  <div className="flex items-center gap-3 text-sm text-[#959595] flex-wrap">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      <span>{event.date}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      <span>{event.time}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4" />
                      <span>{event.location}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      <span>{event.attendees} attendees</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </TabsContent>

        <TabsContent value="upcoming" className="space-y-6">
          <div className="bg-[#fafafb] rounded-lg p-6 text-center">
            <p className="text-[#525252] text-sm">
              No upcoming events at the moment
            </p>
          </div>
        </TabsContent>

        <TabsContent value="past" className="space-y-6">
          <div className="bg-[#fafafb] rounded-lg p-6 text-center">
            <p className="text-[#525252] text-sm">No past events to display</p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
