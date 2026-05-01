'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export function LoginHistoryContent() {
  const [selectedCommunity, setSelectedCommunity] =
    useState('the-tech-community');

  const loginEntries = [
    {
      id: 1,
      name: 'Aishat Adwan',
      ip: '192.168.1.1',
      timestamp: '2024-01-15 10:30 AM',
    },
    {
      id: 2,
      name: 'Aishat Adwan',
      ip: '192.168.1.1',
      timestamp: '2024-01-15 10:30 AM',
    },
    {
      id: 3,
      name: 'Aishat Adwan',
      ip: '192.168.1.1',
      timestamp: '2024-01-15 10:30 AM',
    },
    {
      id: 4,
      name: 'Aishat Adwan',
      ip: '192.168.1.1',
      timestamp: '2024-01-15 10:30 AM',
    },
  ];

  const handleLogout = (id: number) => {
    console.log('Logout user:', id);
  };

  return (
    <div className="w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <svg
            className="w-5 h-5 text-[#525252] cursor-pointer"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          {/* <h2 className="text-xl font-bold text-[#000000]">Login history</h2> */}
        </div>

        {/* Community Dropdown */}
        <Select value={selectedCommunity} onValueChange={setSelectedCommunity}>
          <SelectTrigger className="w-48 h-10 rounded-lg border border-gray-200 focus:border-[#0E9DA5] focus:ring-1 focus:ring-[#0E9DA5] focus:outline-none">
            <SelectValue placeholder="Select community" />
          </SelectTrigger>
          <SelectContent className="bg-white border border-gray-200 rounded-lg">
            <SelectItem
              value="the-tech-community"
              className="cursor-pointer hover:bg-gray-50"
            >
              The tech community
            </SelectItem>
            <SelectItem
              value="design-community"
              className="cursor-pointer hover:bg-gray-50"
            >
              Design community
            </SelectItem>
            <SelectItem
              value="business-community"
              className="cursor-pointer hover:bg-gray-50"
            >
              Business community
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Login Entries */}
      <div className="space-y-4">
        {loginEntries.map((entry) => (
          <div
            key={entry.id}
            className="flex items-center justify-between p-4 bg-white border-b border-gray-100 rounded-lg"
          >
            <div className="flex-1">
              <div className="font-medium text-[#000000] mb-1">
                {entry.name}
              </div>
              <div className="text-sm text-[#525252]">
                {entry.ip} • {entry.timestamp}
              </div>
            </div>
            <Button
              onClick={() => handleLogout(entry.id)}
              className="bg-gray-100 text-[#525252] hover:bg-gray-200 h-8 rounded-lg font-medium px-4 text-sm"
            >
              Logout
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
