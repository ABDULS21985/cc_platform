import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';

const dummyMembers = [
  {
    id: 1,
    name: 'Sherifat Mobolaji',
    role: 'UI/UX designer and products',
    avatar: '/images/image.png',
    fallback: 'SM',
  },
  {
    id: 2,
    name: 'John Smith',
    role: 'Frontend Developer',
    avatar: '/images/image.png',
    fallback: 'JS',
  },
  {
    id: 3,
    name: 'Sarah Wilson',
    role: 'Product Manager',
    avatar: '/images/image.png',
    fallback: 'SW',
  },
  {
    id: 4,
    name: 'Mike Johnson',
    role: 'Backend Engineer',
    avatar: '/images/image.png',
    fallback: 'MJ',
  },
];

export default function NewMembers() {
  return (
    <div className="bg-white rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900">New members</h3>
        <Button
          variant="ghost"
          size="sm"
          className="text-[#0E9DA5] hover:text-[#0E9DA5]"
        >
          See all
        </Button>
      </div>

      <div className="space-y-4">
        {dummyMembers.map((member) => (
          <div key={member.id} className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Avatar className="h-8 w-8">
                <AvatarImage src={member.avatar} />
                <AvatarFallback>{member.fallback}</AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {member.name}
                </p>
                <p className="text-xs text-gray-500">{member.role}</p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="text-[#0E9DA5] border-[#0E9DA5] hover:bg-[#0E9DA5]"
            >
              Invite
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
