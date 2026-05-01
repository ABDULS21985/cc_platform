import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Users } from 'lucide-react';

const dummyEvents = [
  {
    id: 1,
    title: 'Crypto academy',
    attendees: 14,
    image: '/images/image.png',
  },
  {
    id: 2,
    title: 'Networking for Designers',
    attendees: 8,
    image: '/images/image.png',
  },
  {
    id: 3,
    title: 'Tech Meetup 2024',
    attendees: 23,
    image: '/images/image.png',
  },
  {
    id: 4,
    title: 'Startup Pitch Night',
    attendees: 16,
    image: '/images/image.png',
  },
];

export default function OngoingEvents() {
  return (
    <div className="bg-white rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900">Ongoing events</h3>
        <Button
          variant="ghost"
          size="sm"
          className="text-[#0E9DA5] hover:text-[#0E9DA5]"
        >
          See all
        </Button>
      </div>

      <div className="space-y-4">
        {dummyEvents.map((event) => (
          <div key={event.id} className="flex items-start space-x-3">
            <div className="w-12 h-12 bg-gray-200 rounded-lg flex-shrink-0"></div>
            <div className="flex-1">
              <h4 className="text-sm font-medium text-gray-900 mb-1">
                {event.title}
              </h4>
              <div className="flex items-center space-x-2 text-xs text-gray-500">
                <Users className="w-3 h-3" />
                <span>{event.attendees} Attendees</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
