'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  CalendarDays,
  Compass,
  MessageSquareText,
  Plus,
  Users,
} from 'lucide-react';
import useUserData from '@/hooks/useUserData';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { FadeIn, SlideUp } from '@/components/ui/motion';
import { cn } from '@/lib/utils';

interface CommunityAction {
  id: 'circles' | 'discover' | 'events' | 'create';
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  tone: string;
}

const ACTIONS: CommunityAction[] = [
  {
    id: 'circles',
    label: 'Your circles',
    description: 'Open the communities you follow',
    icon: Users,
    href: '/dashboard/community',
    tone: 'bg-brand-soft text-primary',
  },
  {
    id: 'discover',
    label: 'Discover',
    description: 'Find active communities',
    icon: Compass,
    href: '/dashboard/explore',
    tone: 'bg-info/15 text-info',
  },
  {
    id: 'events',
    label: 'Events',
    description: 'Catch what is happening',
    icon: CalendarDays,
    href: '/dashboard/events',
    tone: 'bg-warning/15 text-warning',
  },
  {
    id: 'create',
    label: 'New community',
    description: 'Start a new circle',
    icon: Plus,
    href: '/dashboard/community?new=1',
    tone: 'bg-success/15 text-success',
  },
];

function timeBasedGreeting(date = new Date()): string {
  const h = date.getHours();
  if (h >= 5 && h < 12) return 'Good morning';
  if (h >= 12 && h < 17) return 'Good afternoon';
  if (h >= 17 && h < 22) return 'Good evening';
  return 'Working late';
}

interface UserShape {
  full_name?: string;
  firstname?: string;
  lastname?: string;
  avatar?: string | null;
  email?: string;
  role?: string;
}

export function WelcomeHero() {
  const user = useUserData() as UserShape | null;
  const greeting = React.useMemo(() => timeBasedGreeting(), []);

  const firstName =
    user?.firstname ||
    (user?.full_name ? user.full_name.split(' ')[0] : null) ||
    'there';

  const today = React.useMemo(
    () =>
      new Date().toLocaleDateString(undefined, {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
      }),
    []
  );

  return (
    <section
      aria-labelledby="welcome-heading"
      className="rounded-2xl border border-border bg-card px-5 py-5 shadow-xs sm:px-6"
    >
      <FadeIn>
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="size-12 ring-2 ring-card shadow-sm">
              <AvatarImage src={user?.avatar || undefined} alt="" />
              <AvatarFallback className="bg-primary text-primary-foreground font-bold">
                {firstName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                {today}
              </p>
              <h1
                id="welcome-heading"
                className="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl"
              >
                {greeting}, {firstName}.
              </h1>
            </div>
          </div>
          <Link
            href="#community-feed-heading"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-border bg-background px-4 text-sm font-semibold text-foreground transition-colors hover:border-input hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <MessageSquareText className="size-4" aria-hidden="true" />
            Go to feed
          </Link>
        </div>
      </FadeIn>

      <SlideUp delay={0.05}>
        <p className="mt-3 max-w-2xl text-sm text-muted-foreground sm:text-base">
          Catch up on posts, events, and member updates across the circles you
          belong to.
        </p>
      </SlideUp>

      <SlideUp delay={0.1}>
        <ul className="mt-6 grid grid-cols-2 gap-2.5 sm:grid-cols-4 sm:gap-3">
          {ACTIONS.map((action) => (
            <li key={action.id}>
              <Link
                href={action.href}
                className={cn(
                  'group flex h-full items-center gap-3 rounded-xl border border-border bg-background p-3 transition-all',
                  'hover:border-input hover:bg-accent/40 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background'
                )}
              >
                <span
                  className={cn(
                    'grid size-10 shrink-0 place-items-center rounded-lg transition-transform group-hover:scale-105',
                    action.tone
                  )}
                  aria-hidden="true"
                >
                  <action.icon className="size-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold tracking-tight text-foreground">
                    {action.label}
                  </span>
                  <span className="block truncate text-[11px] text-muted-foreground">
                    {action.description}
                  </span>
                </span>
                <ArrowRight
                  className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground"
                  aria-hidden="true"
                />
              </Link>
            </li>
          ))}
        </ul>
      </SlideUp>
    </section>
  );
}
