'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  ArrowDownToLine,
  ArrowRight,
  ArrowUpRight,
  Plus,
  Receipt,
  Sparkles,
} from 'lucide-react';
import useUserData from '@/hooks/useUserData';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { FadeIn, SlideUp } from '@/components/ui/motion';
import { cn } from '@/lib/utils';

interface QuickAction {
  id: 'send' | 'topup' | 'paybill' | 'create';
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  /** Tone class pair (background + foreground) for the icon tile. */
  tone: string;
}

const ACTIONS: QuickAction[] = [
  {
    id: 'send',
    label: 'Send money',
    description: 'Transfer to a member or bank',
    icon: ArrowUpRight,
    href: '/dashboard/wallet?action=send',
    tone: 'bg-brand-soft text-accent-foreground',
  },
  {
    id: 'topup',
    label: 'Top up',
    description: 'Fund your wallet via Bell MFB',
    icon: ArrowDownToLine,
    href: '/dashboard/wallet?action=fund',
    tone: 'bg-success/15 text-success',
  },
  {
    id: 'paybill',
    label: 'Pay a bill',
    description: 'Settle community dues',
    icon: Receipt,
    href: '/dashboard/community',
    tone: 'bg-warning/15 text-warning',
  },
  {
    id: 'create',
    label: 'New community',
    description: 'Start a new circle',
    icon: Plus,
    href: '/dashboard/community?new=1',
    tone: 'bg-info/15 text-info',
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
      className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-card to-brand-soft/30 px-6 py-7 shadow-xs sm:px-8"
    >
      {/* Ambient glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-24 -right-24 h-64 w-64 rounded-full bg-brand/15 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-32 -left-16 h-56 w-56 rounded-full bg-info/10 blur-3xl"
      />

      <FadeIn>
        <div className="flex items-start justify-between gap-4">
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
          <Badge variant="successSoft" size="lg" className="hidden gap-1.5 sm:inline-flex">
            <Sparkles className="size-3" aria-hidden="true" />
            All systems normal
          </Badge>
        </div>
      </FadeIn>

      <SlideUp delay={0.05}>
        <p className="mt-3 max-w-2xl text-sm text-muted-foreground sm:text-base">
          Here&apos;s a quick look at your circles, balances, and what needs your
          attention today.
        </p>
      </SlideUp>

      {/* Quick actions */}
      <SlideUp delay={0.1}>
        <ul className="mt-6 grid grid-cols-2 gap-2.5 sm:grid-cols-4 sm:gap-3">
          {ACTIONS.map((action) => (
            <li key={action.id}>
              <Link
                href={action.href}
                className={cn(
                  'group flex h-full items-center gap-3 rounded-2xl border border-border bg-card/80 p-3.5 backdrop-blur-sm transition-all',
                  'hover:border-input hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background'
                )}
              >
                <span
                  className={cn(
                    'grid size-10 shrink-0 place-items-center rounded-xl transition-transform group-hover:scale-105',
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
