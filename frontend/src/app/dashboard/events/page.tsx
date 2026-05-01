'use client';

import { useState } from 'react';

// Force dynamic rendering for this page
export const dynamic = 'force-dynamic';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar, Clock, MapPin, Users, Search } from 'lucide-react';
import { CreateEventDialog } from '@/components/community/CreateEventDialog';

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
}

interface OngoingEvent {
  id: string;
  host: string;
  title: string;
  attendees: number;
  hostAvatar: string;
  attendeeAvatars: string[];
}

export default function EventsPage() {
  const router = useRouter();
  const [selectedFilter, setSelectedFilter] = useState('');
  const [isCreateEventOpen, setIsCreateEventOpen] = useState(false);

  const filterOptions = [
    { value: 'recent', label: 'Recent' },
    { value: 'popular', label: 'Popular' },
    { value: 'newest', label: 'Newest' },
    { value: 'trending', label: 'Trending' },
  ];

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
    },
    {
      id: '2',
      title: 'Virtual Coffee Chat: Networking for Designers',
      host: '@cryptoacademy',
      isPrivate: false,
      date: 'Tue jun 12',
      time: '11:15pm',
      location: 'Online zoom',
      attendees: 200,
      imagePlaceholder: 'TALK\nLIVE\nSHOW',
    },
    {
      id: '3',
      title: 'Virtual Coffee Chat: Networking for Designers',
      host: '@cryptoacademy',
      isPrivate: true,
      date: 'Tue jun 12',
      time: '11:15pm',
      location: 'Online zoom',
      attendees: 200,
      imagePlaceholder: 'TALK\nLIVE\nSHOW',
    },
    {
      id: '4',
      title: 'Virtual Coffee Chat: Networking for Designers',
      host: '@cryptoacademy',
      isPrivate: false,
      date: 'Tue jun 12',
      time: '11:15pm',
      location: 'Online zoom',
      attendees: 200,
      imagePlaceholder: 'TALK\nLIVE\nSHOW',
    },
    {
      id: '5',
      title: 'Virtual Coffee Chat: Networking for Designers',
      host: '@cryptoacademy',
      isPrivate: true,
      date: 'Tue jun 12',
      time: '11:15pm',
      location: 'Online zoom',
      attendees: 200,
      imagePlaceholder: 'TALK\nLIVE\nSHOW',
    },
  ];

  const ongoingEvents: OngoingEvent[] = [
    {
      id: '1',
      host: '@cryptoacademy',
      title: 'Networking for Designers',
      attendees: 20,
      hostAvatar: '/images/avatar1.png',
      attendeeAvatars: [
        '/images/avatar2.png',
        '/images/avatar3.png',
        '/images/avatar4.png',
      ],
    },
    {
      id: '2',
      host: '@cryptoacademy',
      title: 'Networking for Designers',
      attendees: 20,
      hostAvatar: '/images/avatar1.png',
      attendeeAvatars: [
        '/images/avatar2.png',
        '/images/avatar3.png',
        '/images/avatar4.png',
      ],
    },
    {
      id: '3',
      host: '@cryptoacademy',
      title: 'Networking for Designers',
      attendees: 20,
      hostAvatar: '/images/avatar1.png',
      attendeeAvatars: [
        '/images/avatar2.png',
        '/images/avatar3.png',
        '/images/avatar4.png',
      ],
    },
    {
      id: '4',
      host: '@cryptoacademy',
      title: 'Networking for Designers',
      attendees: 20,
      hostAvatar: '/images/avatar1.png',
      attendeeAvatars: [
        '/images/avatar2.png',
        '/images/avatar3.png',
        '/images/avatar4.png',
      ],
    },
    {
      id: '5',
      host: '@cryptoacademy',
      title: 'Networking for Designers',
      attendees: 20,
      hostAvatar: '/images/avatar1.png',
      attendeeAvatars: [
        '/images/avatar2.png',
        '/images/avatar3.png',
        '/images/avatar4.png',
      ],
    },
  ];

  const handleCreateEventOpen = () => {
    setIsCreateEventOpen(true);
  };

  const handleCreateEventClose = () => {
    setIsCreateEventOpen(false);
  };

  const handleCreateEventSubmit = (eventData: any) => {
    // Handle event creation logic here
    console.log('Creating event:', eventData);
    // You can add API call here to create the event
  };

  const handleEventClick = (eventId: string) => {
    router.push(`/dashboard/events/${eventId}`);
  };

  const ongoingEventsWithAttendees: OngoingEvent[] = [
    {
      id: '1',
      host: '@cryptoacademy',
      title: 'Networking for Designers',
      attendees: 20,
      hostAvatar: '/images/avatar1.png',
      attendeeAvatars: [
        '/images/avatar2.png',
        '/images/avatar3.png',
        '/images/avatar4.png',
      ],
    },
    {
      id: '2',
      host: '@cryptoacademy',
      title: 'Networking for Designers',
      attendees: 20,
      hostAvatar: '/images/avatar1.png',
      attendeeAvatars: [
        '/images/avatar2.png',
        '/images/avatar3.png',
        '/images/avatar4.png',
      ],
    },
    {
      id: '3',
      host: '@cryptoacademy',
      title: 'Networking for Designers',
      attendees: 20,
      hostAvatar: '/images/avatar1.png',
      attendeeAvatars: [
        '/images/avatar2.png',
        '/images/avatar3.png',
        '/images/avatar4.png',
      ],
    },
  ];

  return (
    <DashboardLayout pageTitle="Events">
      <div className="flex gap-6">
        <div className="flex-1 space-y-6">
          <div className="flex items-center justify-between bg-white p-4 rounded-xl">
            <div className="flex items-center gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search"
                  className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0E9DA5] focus:border-transparent w-64"
                />
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Select value={selectedFilter} onValueChange={setSelectedFilter}>
                <SelectTrigger className="w-40 h-10 rounded-lg border border-gray-200 focus:border-[#0E9DA5] focus:ring-1 focus:ring-[#0E9DA5] focus:outline-none">
                  <SelectValue placeholder="Recent" />
                </SelectTrigger>
                <SelectContent className="bg-white border border-gray-200 rounded-lg">
                  {filterOptions.map((option) => (
                    <SelectItem
                      key={option.value}
                      value={option.value}
                      className="cursor-pointer hover:bg-gray-50"
                    >
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                onClick={handleCreateEventOpen}
                className="bg-[#0E9DA5] hover:bg-[#0E9DA5]/90 text-white px-4 py-2 rounded-full"
              >
                Create event
              </Button>
            </div>
          </div>

          <div className="space-y-6 bg-white p-4 rounded-xl">
            {events.map((event) => (
              <div
                key={event.id}
                onClick={() => handleEventClick(event.id)}
                className="bg-white rounded-lg overflow-hidden border border-[#f2f2f3] p-1 cursor-pointer hover:shadow-md transition-shadow"
              >
                <div className="flex">
                  <div className="w-1/3 p-3">
                    <div className="relative w-full h-32 bg-black rounded overflow-hidden">
                      <div className="absolute inset-0 flex items-center justify-center text-white text-xs font-bold text-center leading-tight p-2">
                        {event.imagePlaceholder
                          .split('\n')
                          .map((line, index) => (
                            <div key={index}>{line}</div>
                          ))}
                      </div>

                      {event.id === '1' && (
                        <div className="absolute bottom-2 left-2 w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center">
                          <span className="text-white text-xs font-bold">
                            B
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="w-full p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-sm text-[#525252]">
                        <span className="text-sm font-[500] text-[#000000]">
                          {event.host}
                        </span>{' '}
                        is hosting
                      </span>
                      {event.isPrivate ? (
                        <span className="bg-[#fbefe8] text-[#ff984f] text-xs px-2 py-1 rounded-full">
                          Private
                        </span>
                      ) : (
                        <span className="bg-green-100 text-green-600 text-xs px-2 py-1 rounded-full">
                          Public
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
          </div>
        </div>

        <div className="w-80 space-y-6">
          <div className="bg-white rounded-lg p-4 border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Ongoing events</h3>
              <a href="#" className="text-sm text-[#0E9DA5] hover:underline">
                See all
              </a>
            </div>
            <div className="space-y-3">
              {ongoingEvents.map((event) => (
                <div key={event.id} className="flex items-center gap-3">
                  <Avatar className="w-8 h-8">
                    <AvatarImage src={event.hostAvatar} />
                    <AvatarFallback className="bg-gray-200 text-gray-600 text-xs">
                      CA
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-600 truncate">
                      {event.host} is hosting
                    </p>
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {event.title}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    className="bg-[#0E9DA5] hover:bg-[#0E9DA5]/90 text-white text-xs px-3 py-1 rounded-full"
                  >
                    Join
                  </Button>
                </div>
              ))}
            </div>
          </div>

          {/* Second Ongoing Events Section */}
          <div className="bg-white rounded-lg p-4 border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Ongoing events</h3>
              <a href="#" className="text-sm text-[#0E9DA5] hover:underline">
                See all
              </a>
            </div>
            <div className="space-y-3">
              {ongoingEventsWithAttendees.map((event) => (
                <div key={event.id} className="space-y-2">
                  <div className="flex items-center gap-3">
                    <Avatar className="w-8 h-8">
                      <AvatarImage src={event.hostAvatar} />
                      <AvatarFallback className="bg-gray-200 text-gray-600 text-xs">
                        CA
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-600 truncate">
                        Hosted by {event.host}
                      </p>
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {event.title}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      className="bg-[#0E9DA5] hover:bg-[#0E9DA5]/90 text-white text-xs px-3 py-1 rounded-full"
                    >
                      Join
                    </Button>
                  </div>
                  <div className="flex items-center gap-2 ml-11">
                    <div className="flex -space-x-2">
                      {event.attendeeAvatars.map((avatar, index) => (
                        <Avatar
                          key={index}
                          className="w-5 h-5 border-2 border-white"
                        >
                          <AvatarImage src={avatar} />
                          <AvatarFallback className="bg-gray-300 text-gray-600 text-xs">
                            {String.fromCharCode(65 + index)}
                          </AvatarFallback>
                        </Avatar>
                      ))}
                    </div>
                    <span className="text-xs text-gray-500">
                      {event.attendees}+ Attendees
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Create Event Dialog */}
      <CreateEventDialog
        isOpen={isCreateEventOpen}
        onClose={handleCreateEventClose}
        onSubmit={handleCreateEventSubmit}
      />
    </DashboardLayout>
  );
}
