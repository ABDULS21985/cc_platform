'use client';

import { useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import {
  Calendar,
  Clock,
  MapPin,
  Heart,
  MessageCircle,
  Share2,
  Smile,
  Image as ImageIcon,
} from 'lucide-react';
import { PaymentDialog } from '@/components/events/PaymentDialog';

interface EventDetails {
  id: string;
  title: string;
  date: string;
  time: string;
  location: string;
  fee: string;
  host: string;
  hostAvatar: string;
  description: string;
  likes: number;
  comments: number;
}

interface Comment {
  id: string;
  user: string;
  avatar: string;
  text: string;
}

interface Attendee {
  id: string;
  name: string;
  avatar: string;
}

export default function EventDetailsClient() {
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);

  const eventDetails: EventDetails = {
    id: '1',
    title: 'Virtual Coffee Chat: Networking for Designers',
    date: 'Tue Jun 12',
    time: '11:15pm',
    location: 'Online zoom',
    fee: 'N5,000',
    host: 'Crypto academy',
    hostAvatar: '/images/avatar1.png',
    description:
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.',
    likes: 15,
    comments: 12,
  };

  const comments: Comment[] = [
    {
      id: '1',
      user: '@maymamud',
      avatar: '/images/avatar2.png',
      text: 'This is lovely, i will definitely be there!',
    },
    {
      id: '2',
      user: '@maymamud',
      avatar: '/images/avatar2.png',
      text: 'This is lovely, i will definitely be there!',
    },
  ];

  const attendees: Attendee[] = [
    {
      id: '1',
      name: 'Aishat Ugochuwkwu',
      avatar: '/images/avatar3.png',
    },
    {
      id: '2',
      name: 'Aishat Ugochuwkwu',
      avatar: '/images/avatar3.png',
    },
    {
      id: '3',
      name: 'Aishat Ugochuwkwu',
      avatar: '/images/avatar3.png',
    },
    {
      id: '4',
      name: '@maymamud',
      avatar: '/images/avatar2.png',
    },
    {
      id: '5',
      name: '@maymamud',
      avatar: '/images/avatar2.png',
    },
    {
      id: '6',
      name: '@maymamud',
      avatar: '/images/avatar2.png',
    },
  ];

  const handleJoinEvent = () => {
    setIsPaymentDialogOpen(true);
  };

  const handlePaymentClose = () => {
    setIsPaymentDialogOpen(false);
  };

  const handlePayment = () => {
    // Handle payment logic here
    console.log('Processing payment for:', eventDetails.fee);
    setIsPaymentDialogOpen(false);
    // You can add payment processing logic here
  };

  return (
    <DashboardLayout pageTitle="Event Details">
      <div className="flex gap-6">
        {/* Main Content Area */}
        <div className="flex-1 space-y-6">
          <div className="bg-white rounded-lg overflow-hidden">
            <div className="relative w-full h-auto flex items-center justify-center">
              <img
                src="/images/chew.svg"
                alt="Chew Banner"
                className="w-full h-full object-cover"
              />
            </div>
          </div>

          {/* Event Details Card */}
          <div className="bg-white rounded-lg p-6 space-y-6">
            {/* Title and Join Button */}
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold text-[#000000]">
                {eventDetails.title}
              </h1>
              <Button
                onClick={handleJoinEvent}
                className="bg-[#0E9DA5] hover:bg-[#0E9DA5]/90 text-white px-6 py-2 rounded-full"
              >
                Join event
              </Button>
            </div>

            {/* Event Metadata */}
            <div className="flex items-center gap-6 text-sm text-[#959595]">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <span>{eventDetails.date}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                <span>{eventDetails.time}</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                <span>{eventDetails.location}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-lg">₦</span>
                <span>{eventDetails.fee}</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Avatar className="w-8 h-8">
                <AvatarImage src={eventDetails.hostAvatar} />
                <AvatarFallback className="bg-gray-200 text-gray-600 text-xs">
                  CA
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm text-[#959595]">Hosted by</p>
                <p className="text-sm font-medium text-[#000000]">
                  {eventDetails.host}
                </p>
              </div>
            </div>

            {/* Event Description */}
            <div>
              <p className="text-sm text-[#525252] leading-relaxed">
                {eventDetails.description}
              </p>
            </div>

            {/* Engagement Section */}
            <div className="flex items-center gap-6">
              <button className="flex items-center gap-2 text-sm text-[#959595] hover:text-red-500">
                <Heart className="w-4 h-4" />
                <span>{eventDetails.likes} Likes</span>
              </button>
              <button className="flex items-center gap-2 text-sm text-[#959595] hover:text-[#0E9DA5]">
                <MessageCircle className="w-4 h-4" />
                <span>{eventDetails.comments} comments</span>
              </button>
              <button className="flex items-center gap-2 text-sm text-[#959595] hover:text-[#0E9DA5]">
                <Share2 className="w-4 h-4" />
                <span>Share</span>
              </button>
            </div>

            {/* Comment Input */}
            <div className="border-t border-gray-100 pt-6">
              <div className="relative">
                <Input
                  placeholder="Add a comment"
                  className="w-full pr-20 rounded-lg border-gray-200 focus:border-[#0E9DA5] focus:ring-1 focus:ring-[#0E9DA5]"
                />
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center gap-2">
                  <button className="text-gray-400 hover:text-[#0E9DA5]">
                    <Smile className="w-4 h-4" />
                  </button>
                  <button className="text-gray-400 hover:text-[#0E9DA5]">
                    <ImageIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Comments */}
            <div className="space-y-4">
              {comments.map((comment) => (
                <div key={comment.id} className="flex items-start gap-3">
                  <Avatar className="w-8 h-8">
                    <AvatarImage src={comment.avatar} />
                    <AvatarFallback className="bg-gray-200 text-gray-600 text-xs">
                      {comment.user.charAt(1).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-[#000000]">
                        {comment.user}
                      </span>
                    </div>
                    <p className="text-sm text-[#525252]">{comment.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Sidebar - Attendees */}
        <div className="w-80">
          <div className="bg-white rounded-lg p-4 border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">
                Attendees ({attendees.length})
              </h3>
              <a href="#" className="text-sm text-[#0E9DA5] hover:underline">
                See all
              </a>
            </div>
            <div className="space-y-3">
              {attendees.map((attendee) => (
                <div key={attendee.id} className="flex items-center gap-3">
                  <Avatar className="w-10 h-10">
                    <AvatarImage src={attendee.avatar} />
                    <AvatarFallback className="bg-gray-200 text-gray-600 text-sm">
                      {attendee.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {attendee.name}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Payment Dialog */}
      <PaymentDialog
        isOpen={isPaymentDialogOpen}
        onClose={handlePaymentClose}
        onPay={handlePayment}
        amount={eventDetails.fee}
      />
    </DashboardLayout>
  );
}
