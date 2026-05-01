'use client';

import { useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

export function SubscriptionsContent() {
  const [activeStatusTab, setActiveStatusTab] = useState('active');

  return (
    <div className="space-y-6">
      {/* Status Tabs */}
      <Tabs value={activeStatusTab} onValueChange={setActiveStatusTab}>
        <TabsList className="inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground">
          <TabsTrigger value="active">Active</TabsTrigger>
          <TabsTrigger value="inactive">Inactive</TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="mt-6">
          {/* Active Subscription Cards */}
          <div className="space-y-4">
            {/* Subscription Card 1 */}
            <div className="bg-gray-100 rounded-lg p-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                  <svg
                    className="w-6 h-6 text-gray-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                    />
                  </svg>
                </div>
                <div>
                  <h3 className="font-medium text-[#000000]">Yalleman</h3>
                  <p className="text-sm text-[#525252]">
                    Membership Subscription
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-medium text-[#000000]">N120</p>
                <p className="text-sm text-[#525252]">/Monthly</p>
              </div>
            </div>

            {/* Subscription Card 2 */}
            <div className="bg-gray-100 rounded-lg p-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                  <svg
                    className="w-6 h-6 text-gray-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                    />
                  </svg>
                </div>
                <div>
                  <h3 className="font-medium text-[#000000]">Yalleman</h3>
                  <p className="text-sm text-[#525252]">
                    Membership Subscription
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-medium text-[#000000]">N120</p>
                <p className="text-sm text-[#525252]">/Monthly</p>
              </div>
            </div>

            {/* Subscription Card 3 */}
            <div className="bg-gray-100 rounded-lg p-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                  <svg
                    className="w-6 h-6 text-gray-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                    />
                  </svg>
                </div>
                <div>
                  <h3 className="font-medium text-[#000000]">Yalleman</h3>
                  <p className="text-sm text-[#525252]">
                    Membership Subscription
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-medium text-[#000000]">N120</p>
                <p className="text-sm text-[#525252]">/Monthly</p>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="inactive" className="mt-6">
          {/* Inactive Subscription Cards */}
          <div className="text-center py-12">
            <p className="text-gray-500">No inactive subscriptions found</p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
