'use client';

import { useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import PostFeed from '@/components/dashboard/PostFeed';
import TrendingTopics from '@/components/dashboard/TrendingTopics';
import OngoingEvents from '@/components/dashboard/OngoingEvents';
import NewMembers from '@/components/dashboard/NewMembers';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Paperclip, Smile, Image as ImageIcon } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CreatePostDialog } from '@/components/community/CreatePostDialog';
import { Menu, X } from 'lucide-react';
import VerificationNotice from '@/components/dashboard/VerificationNotice';

// Reusable Right Sidebar Content
const RightSidebarContent = () => (
    <div className="space-y-6">
        <TrendingTopics />
        <OngoingEvents />
        <NewMembers />
    </div>
);

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState<'all' | 'my-groups'>('all');
  const [isCreatePostOpen, setIsCreatePostOpen] = useState(false);
  const [isRightSidebarOpen, setIsRightSidebarOpen] = useState(false);

  const toggleCreatePost = () => setIsCreatePostOpen((s) => !s);
  const toggleRightSidebar = () => setIsRightSidebarOpen((s) => !s);

  // Close sidebar when route changes or content clicked (optional)
  // useEffect(() => setIsRightSidebarOpen(false), [pathname]); 

  return (
    <DashboardLayout pageTitle="Home">
      <div className="relative">
        <div className="flex flex-col lg:flex-row gap-6 relative">
            {/* Mobile Header for Right Sidebar Toggle */}
            <div className="lg:hidden flex justify-end mb-4">
                <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={toggleRightSidebar}
                    className="flex items-center gap-2"
                >
                    <Menu className="w-4 h-4" />
                    <span>Trending & Events</span>
                </Button>
            </div>

            <div className="flex-1 min-w-0"> {/* min-w-0 ensures flex child doesn't overflow */}
            <VerificationNotice />
          <div className="bg-white rounded-lg p-4 mb-4">
            <div className="flex items-start gap-3">
              <Avatar className="h-[40px] w-[40px]">
                <AvatarImage src="/images/image.png" />
                <AvatarFallback>AS</AvatarFallback>
              </Avatar>
              <div className="flex-1 relative h-[40px]">
                <Input
                  placeholder="Post something"
                  className="bg-[#f5f5f5] text-gray-600 pr-32 rounded-full h-[40px]"
                  onClick={toggleCreatePost}
                  readOnly
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                  <button className="p-1 hover:bg-gray-100 rounded">
                    <Paperclip className="w-4 h-4 text-gray-500" />
                  </button>
                  <button className="p-1 hover:bg-gray-100 rounded">
                    <Smile className="w-4 h-4 text-gray-500" />
                  </button>
                  <button className="p-1 hover:bg-gray-100 rounded">
                    <ImageIcon className="w-4 h-4 text-gray-500" />
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between mt-4">
              <Tabs
                value={activeTab}
                onValueChange={(v) => setActiveTab(v as 'all' | 'my-groups')}
              >
                <TabsList>
                  <TabsTrigger value="all">All</TabsTrigger>
                  <TabsTrigger value="my-groups">My groups</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </div>

          <CreatePostDialog
            isOpen={isCreatePostOpen}
            toggleDialog={toggleCreatePost}
          />

          <PostFeed />
        </div>

        {/* Desktop Right Sidebar */}
        <div className="hidden lg:block w-80 flex-shrink-0">
          <div className="sticky top-6">
             <RightSidebarContent />
          </div>
        </div>
      </div>

      {/* Mobile Right Sidebar Drawer */}
      {/* Overlay */}
      {isRightSidebarOpen && (
          <div 
            className="fixed inset-0 bg-black/50 z-40 lg:hidden animate-fade-in"
            onClick={toggleRightSidebar}
          />
      )}
      
      {/* Drawer */}
      <div className={`fixed inset-y-0 right-0 w-[300px] bg-white z-50 shadow-2xl transform transition-transform duration-300 ease-in-out lg:hidden ${isRightSidebarOpen ? 'translate-x-0' : 'translate-x-full'}`}>
          <div className="p-4 h-full flex flex-col">
              <div className="flex items-center justify-between mb-6">
                  <h2 className="font-bold text-lg">Thinking & Events</h2>
                  <Button variant="ghost" size="icon" onClick={toggleRightSidebar}>
                      <X className="w-5 h-5" />
                  </Button>
              </div>
              <div className="overflow-y-auto custom-scrollbar flex-1 pb-4">
                 <RightSidebarContent />
              </div>
          </div>
      </div>
     </div>
    </DashboardLayout>
  );
}

// Force dynamic rendering for this page
export const dynamic = 'force-dynamic';