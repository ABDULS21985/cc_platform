'use client';

import { useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import PostFeed from '@/components/dashboard/PostFeed';
import TrendingTopics from '@/components/dashboard/TrendingTopics';
import OngoingEvents from '@/components/dashboard/OngoingEvents';
import NewMembers from '@/components/dashboard/NewMembers';
import { WelcomeHero } from '@/components/dashboard/WelcomeHero';
import { MyCommunities } from '@/components/dashboard/MyCommunities';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
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
  const [isCreatePostOpen, setIsCreatePostOpen] = useState(false);
  const [isRightRailOpen, setIsRightRailOpen] = useState(false);

  const toggleCreatePost = () => setIsCreatePostOpen((s) => !s);

  return (
    <DashboardLayout pageTitle="Home">
      <div className="space-y-6">
        <WelcomeHero />

        <div className="relative flex flex-col gap-6 lg:flex-row">
          <div className="flex justify-end lg:hidden">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsRightRailOpen(true)}
              leadingIcon={<Sparkles className="h-4 w-4" />}
            >
              Discover
            </Button>
          </div>

          <div className="min-w-0 flex-1 space-y-6">
            <MyCommunities />

            <section aria-labelledby="community-feed-heading" className="space-y-4">
              <header className="flex items-end justify-between gap-3">
                <div>
                  <h2
                    id="community-feed-heading"
                    className="text-lg font-semibold tracking-tight text-foreground"
                  >
                    Community feed
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Latest posts, conversations, and updates from your circles.
                  </p>
                </div>
              </header>

              <Card variant="default" density="compact">
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback>You</AvatarFallback>
                    </Avatar>
                    <button
                      type="button"
                      onClick={toggleCreatePost}
                      className="group flex h-11 flex-1 items-center justify-between rounded-full border border-border bg-muted/40 px-4 text-left text-sm text-muted-foreground transition-colors hover:bg-muted/60 hover:border-input focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      aria-label="Compose a post"
                    >
                      <span>Share an update with your circle…</span>
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
                </CardContent>
              </Card>

              <PostFeed />
            </section>

            <CreatePostDialog
              isOpen={isCreatePostOpen}
              toggleDialog={toggleCreatePost}
            />
          </div>

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

      <Sheet open={isRightRailOpen} onOpenChange={setIsRightRailOpen}>
        <SheetContent
          side="right"
          title="Discover"
          description="Trending topics, events, and new members"
        >
          <RightRailContent />
        </SheetContent>
      </Sheet>
    </DashboardLayout>
  );
}

export const dynamic = 'force-dynamic';
