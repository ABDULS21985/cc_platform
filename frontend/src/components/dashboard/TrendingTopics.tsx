import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';

const dummyTopics = [
  {
    id: 1,
    name: 'Football',
    category: 'Sport',
    avatar: '/images/image.png',
    fallback: 'FB',
  },
  {
    id: 2,
    name: 'Cryptocurrency',
    category: 'Finance',
    avatar: '/images/image.png',
    fallback: 'CC',
  },
  {
    id: 3,
    name: 'Artificial Intelligence',
    category: 'Technology',
    avatar: '/images/image.png',
    fallback: 'AI',
  },
  {
    id: 4,
    name: 'Climate Change',
    category: 'Environment',
    avatar: '/images/image.png',
    fallback: 'CC',
  },
];

export default function TrendingTopics() {
  return (
    <div className="bg-white rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900">Trending topics</h3>
        <Button
          variant="ghost"
          size="sm"
          className="text-[#0E9DA5] hover:text-[#0E9DA5]"
        >
          See all
        </Button>
      </div>

      <div className="space-y-3">
        {dummyTopics.map((topic) => (
          <div key={topic.id} className="flex items-center space-x-3">
            <Avatar className="h-8 w-8">
              <AvatarImage src={topic.avatar} />
              <AvatarFallback>{topic.fallback}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">{topic.name}</p>
              <p className="text-xs text-gray-500">{topic.category}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
