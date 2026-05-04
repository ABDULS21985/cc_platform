'use client';

import { useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import PostFeed from '@/components/dashboard/PostFeed';
import TrendingTopics from '@/components/dashboard/TrendingTopics';
import OngoingEvents from '@/components/dashboard/OngoingEvents';
import NewMembers from '@/components/dashboard/NewMembers';
import VerificationNotice from '@/components/dashboard/VerificationNotice';
import { WelcomeHero } from '@/components/dashboard/WelcomeHero';
import { OverviewMetrics } from '@/components/dashboard/OverviewMetrics';
import { MyCommunities } from '@/components/dashboard/MyCommunities';
import { PendingActions } from '@/components/dashboard/PendingActions';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { CreatePostDialog } from '@/components/community/CreatePostDialog';
import { Image as ImageIcon, Paperclip, Smile, Sparkles } from 'lucide-react';

function RightRailContent() {
  return (
    <div className="space-y-6">
      <TrendingTopics />
      <OngoingEvents />
      <NewMembers />
    </div>
  );
}

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState<'all' | 'my-groups'>('all');
  const [isCreatePostOpen, setIsCreatePostOpen] = useState(false);
  const [isRightRailOpen, setIsRightRailOpen] = useState(false);

  const toggleCreatePost = () => setIsCreatePostOpen((s) => !s);

  return (
    <DashboardLayout pageTitle="Home">
      <div className="space-y-6">
        {/* Verification notice (if user hasn't completed KYC) */}
        <VerificationNotice />

        {/* Welcome hero with quick actions */}
        <WelcomeHero />

        {/* At-a-glance metrics */}
        <OverviewMetrics />

        {/* Pending actions banner */}
        <PendingActions />

        {/* Two-column content area */}
        <div className="relative flex flex-col gap-6 lg:flex-row">
          {/* Mobile right-rail trigger */}
          <div className="flex justify-end lg:hidden">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsRightRailOpen(true)}
              leadingIcon={<Sparkles className="h-4 w-4" />}
            >
              Trending &amp; events
            </Button>
          </div>

          {/* Main column */}
          <div className="min-w-0 flex-1 space-y-6">
            {/* My communities row */}
            <MyCommunities />

            {/* Composer + activity feed */}
            <Card variant="default" density="compact">
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src="/images/image.png" alt="" />
                    <AvatarFallback>You</AvatarFallback>
                  </Avatar>
                  <button
                    type="button"
                    onClick={toggleCreatePost}
                    className="group flex h-11 flex-1 items-center justify-between rounded-full border border-border bg-muted/40 px-4 text-left text-sm text-muted-foreground transition-colors hover:bg-muted/60 hover:border-input focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    aria-label="Compose a post"
                  >
                    <span>Share an update with your community…</span>
                    <span className="hidden items-center gap-1 sm:inline-flex">
                      <span className="grid size-7 place-items-center rounded-full text-muted-foreground transition-colors group-hover:text-foreground">
                        <Paperclip className="size-4" aria-hidden="true" />
                      </span>
                      <span className="grid size-7 place-items-center rounded-full text-muted-foreground transition-colors group-hover:text-foreground">
                        <Smile className="size-4" aria-hidden="true" />
                      </span>
                      <span className="grid size-7 place-items-center rounded-full text-muted-foreground transition-colors group-hover:text-foreground">
                        <ImageIcon className="size-4" aria-hidden="true" />
                      </span>
                    </span>
                  </button>
                </div>

                <Tabs
                  value={activeTab}
                  onValueChange={(v) => setActiveTab(v as 'all' | 'my-groups')}
                >
                  <TabsList>
                    <TabsTrigger value="all">All activity</TabsTrigger>
                    <TabsTrigger value="my-groups">My groups</TabsTrigger>
                  </TabsList>
                </Tabs>
              </CardContent>
            </Card>

            <CreatePostDialog
              isOpen={isCreatePostOpen}
              toggleDialog={toggleCreatePost}
            />

            <PostFeed />
          </div>

          {/* Desktop right rail */}
          <aside
            className="hidden w-80 flex-shrink-0 lg:block"
            aria-label="Trending and events"
          >
            <div className="sticky top-6">
              <RightRailContent />
            </div>
          </aside>
        </div>
      </div>

      {/* Mobile right rail (vaul bottom sheet) */}
      <Sheet open={isRightRailOpen} onOpenChange={setIsRightRailOpen}>
        <SheetContent
          side="right"
          title="Trending & events"
          description="Catch up on what's happening"
        >
          <RightRailContent />
        </SheetContent>
      </Sheet>
    </DashboardLayout>
  );
}

export const dynamic = 'force-dynamic';
