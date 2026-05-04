'use client';

import * as React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import {
  Activity,
  Bookmark,
  ChevronDown,
  ChevronsLeft,
  ChevronsRight,
  Compass,
  HelpCircle,
  Inbox,
  LogOut,
  Plus,
  Receipt,
  Repeat,
  ShieldCheck,
  User,
  Users,
} from 'lucide-react';
import {
  HomeIcon,
  CommunityIcon,
  EventsIcon,
  WalletIcon,
  SettingsIcon,
} from '@/lib/svg-icons';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { motion, AnimatePresence } from '@/components/ui/motion';
import { cn } from '@/lib/utils';

type BadgeTone = 'count' | 'soon' | 'new';

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  /** Optional badge text (e.g. "3" for pending, "Soon" for roadmap, "New"). */
  badge?: string;
  /** Visual tone for the badge. */
  badgeTone?: BadgeTone;
  /** When true, the link is shown but not yet wired to a real route. */
  comingSoon?: boolean;
}

interface NavSection {
  heading: string;
  items: NavItem[];
}

const SECTIONS: NavSection[] = [
  {
    heading: 'Main',
    items: [
      { href: '/dashboard', label: 'Home', icon: <HomeIcon /> },
      { href: '/dashboard/community', label: 'Communities', icon: <CommunityIcon /> },
      { href: '/dashboard/explore', label: 'Discover', icon: <Compass className="size-5" /> },
      { href: '/dashboard/events', label: 'Events', icon: <EventsIcon /> },
      { href: '/dashboard/community', label: 'Members', icon: <Users className="size-5" /> },
    ],
  },
  {
    heading: 'Money',
    items: [
      { href: '/dashboard/wallet', label: 'Wallet', icon: <WalletIcon />, badge: '3', badgeTone: 'count' },
      { href: '/dashboard/bills', label: 'Bills', icon: <Receipt className="size-5" />, badge: '2', badgeTone: 'count' },
      { href: '/dashboard/activity', label: 'Activity', icon: <Activity className="size-5" /> },
      { href: '/dashboard/wallet', label: 'Recurring', icon: <Repeat className="size-5" />, badge: 'Soon', badgeTone: 'soon', comingSoon: true },
    ],
  },
  {
    heading: 'Workspace',
    items: [
      { href: '/dashboard/inbox', label: 'Inbox', icon: <Inbox className="size-5" />, badge: '12', badgeTone: 'count' },
      { href: '/dashboard', label: 'Saved', icon: <Bookmark className="size-5" />, badge: 'Soon', badgeTone: 'soon', comingSoon: true },
    ],
  },
  {
    heading: 'Account',
    items: [
      { href: '/dashboard/settings', label: 'Settings', icon: <SettingsIcon /> },
      { href: '/dashboard/settings', label: 'Audit log', icon: <ShieldCheck className="size-5" />, badge: 'Soon', badgeTone: 'soon', comingSoon: true },
    ],
  },
];

function badgeVariantFor(tone?: BadgeTone): 'warningSoft' | 'soft' | 'successSoft' {
  if (tone === 'soon') return 'soft';
  if (tone === 'new') return 'successSoft';
  return 'warningSoft';
}

const SETTINGS_TABS = [
  { id: 'account-info', label: 'Personal information' },
  { id: 'verification', label: 'Identity verification' },
  { id: 'change-password', label: 'Security' },
  { id: 'notification', label: 'Notifications' },
] as const;

interface SidebarUser {
  full_name?: string;
  firstname?: string;
  avatar?: string | null;
  role?: string;
  email?: string;
}

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  /** Mobile-only: called when the user taps the backdrop. */
  onCloseMobile: () => void;
  user: SidebarUser | null;
  onLogout: () => void;
}

function isPathActive(pathname: string, href: string): boolean {
  if (href === '/dashboard') return pathname === '/dashboard';
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Sidebar({ isOpen, onToggle, onCloseMobile, user, onLogout }: SidebarProps) {
  const router = useRouter();
  const pathname = usePathname() || '';
  const searchParams = useSearchParams();
  const activeTab = searchParams?.get('tab') ?? 'account-info';
  const [settingsOpen, setSettingsOpen] = React.useState(
    pathname.startsWith('/dashboard/settings')
  );

  React.useEffect(() => {
    if (pathname.startsWith('/dashboard/settings')) setSettingsOpen(true);
  }, [pathname]);

  const initials = (user?.firstname || user?.full_name || 'U')
    .charAt(0)
    .toUpperCase();

  return (
    <>
      {/* Mobile backdrop — visible only when the sidebar is open on small screens. */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={onCloseMobile}
            aria-hidden="true"
            className="fixed inset-0 z-40 bg-foreground/40 backdrop-blur-sm lg:hidden"
          />
        )}
      </AnimatePresence>

      <aside
        aria-label="Primary navigation"
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground shadow-xl lg:relative lg:shadow-none',
          'transition-[width,transform] duration-300 ease-out',
          // Width
          isOpen ? 'w-64' : 'w-[72px]',
          // Mobile slide
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        {/* Subtle ambient brand hint */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-24 -right-12 h-44 w-44 rounded-full bg-sidebar-primary/10 blur-3xl"
        />

        {/* Header */}
        <div
          className={cn(
            'relative z-10 flex h-16 items-center border-b border-sidebar-border px-3',
            isOpen ? 'justify-between' : 'justify-center'
          )}
        >
          <Link
            href="/dashboard"
            aria-label="CCPay home"
            className="inline-flex items-center gap-2 rounded-lg p-1 text-sidebar-foreground transition-colors hover:bg-sidebar-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
          >
            <Image
              src="/images/main-logo.svg"
              alt=""
              width={28}
              height={28}
              className="h-7 w-7 shrink-0"
              aria-hidden="true"
            />
            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.span
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -8 }}
                  transition={{ duration: 0.15 }}
                  className="text-base font-semibold tracking-tight"
                >
                  CCPay
                </motion.span>
              )}
            </AnimatePresence>
          </Link>

          {isOpen && (
            <button
              type="button"
              onClick={onToggle}
              aria-label="Collapse sidebar"
              title="Collapse sidebar"
              className="hidden h-8 w-8 items-center justify-center rounded-lg text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring lg:inline-flex"
            >
              <ChevronsLeft className="size-4" aria-hidden="true" />
            </button>
          )}
        </div>

        {/* Collapse-toggle when collapsed (lives separately so it doesn't push the logo). */}
        {!isOpen && (
          <button
            type="button"
            onClick={onToggle}
            aria-label="Expand sidebar"
            title="Expand sidebar"
            className="absolute -right-3 top-[3.25rem] z-10 hidden size-6 items-center justify-center rounded-full border border-sidebar-border bg-sidebar text-sidebar-foreground/80 shadow-sm transition-colors hover:text-sidebar-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring lg:inline-flex"
          >
            <ChevronsRight className="size-3" aria-hidden="true" />
          </button>
        )}

        {/* User card */}
        <div className="relative z-10 px-3 pt-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                aria-label="Account menu"
                className={cn(
                  'group flex w-full items-center gap-3 rounded-xl border border-sidebar-border bg-sidebar-accent/40 p-2.5 text-left transition-colors',
                  'hover:bg-sidebar-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring',
                  !isOpen && 'justify-center p-1.5'
                )}
              >
                <span className="relative shrink-0">
                  <Avatar className="size-9">
                    <AvatarImage src={user?.avatar || undefined} alt="" />
                    <AvatarFallback className="bg-sidebar-primary text-sidebar-primary-foreground text-xs font-bold">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <span
                    aria-label="Online"
                    className="absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full bg-success ring-2 ring-sidebar"
                  />
                </span>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.15 }}
                      className="min-w-0 flex-1"
                    >
                      <p className="truncate text-[10px] font-bold uppercase tracking-widest text-sidebar-primary">
                        {user?.role || 'Member'}
                      </p>
                      <p className="truncate text-sm font-semibold tracking-tight">
                        {user?.full_name || 'Guest user'}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
                {isOpen && (
                  <ChevronDown
                    className="size-3.5 shrink-0 text-sidebar-foreground/50 transition-transform group-data-[state=open]:rotate-180"
                    aria-hidden="true"
                  />
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              side={isOpen ? 'bottom' : 'right'}
              align="start"
              className="w-56"
            >
              <DropdownMenuItem
                onClick={() => router.push('/dashboard/settings?tab=account-info')}
                className="gap-2"
              >
                <User className="size-4" aria-hidden="true" /> View profile
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onLogout} className="gap-2 text-destructive focus:text-destructive">
                <LogOut className="size-4" aria-hidden="true" /> Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Nav */}
        <nav
          aria-label="Primary"
          className="custom-scrollbar relative z-10 flex-1 overflow-y-auto px-3 pt-4 pb-3"
        >
          <ul className="space-y-5">
            {SECTIONS.map((section) => (
              <li key={section.heading}>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.h3
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.15 }}
                      className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/50"
                    >
                      {section.heading}
                    </motion.h3>
                  )}
                </AnimatePresence>
                <ul className="space-y-1" role="list">
                  {section.items.map((item, idx) => {
                    // Use the heading + label as the React key to avoid collisions
                    // when multiple items point at the same href (e.g. Wallet/Bills/Activity).
                    const key = `${section.heading}-${item.label}-${idx}`;
                    const active = isPathActive(pathname, item.href);
                    // Settings is the only expandable item (its first occurrence in the Account section).
                    const isSettingsRow =
                      item.href === '/dashboard/settings' && item.label === 'Settings';
                    const linkClasses = cn(
                      'group relative flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring',
                      active
                        ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-sm'
                        : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                      item.comingSoon && 'opacity-80',
                      !isOpen && 'justify-center'
                    );

                    const iconNode = (
                      <span
                        className={cn(
                          'flex size-5 shrink-0 items-center justify-center transition-transform',
                          active ? '' : 'group-hover:scale-110'
                        )}
                        aria-hidden="true"
                      >
                        {item.icon}
                      </span>
                    );

                    const labelNode = (
                      <AnimatePresence initial={false}>
                        {isOpen && (
                          <motion.span
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.15 }}
                            className="flex-1 truncate text-left"
                          >
                            {item.label}
                          </motion.span>
                        )}
                      </AnimatePresence>
                    );

                    const badgeNode =
                      item.badge && isOpen ? (
                        <Badge
                          variant={
                            active
                              ? 'outline'
                              : badgeVariantFor(item.badgeTone)
                          }
                          size="sm"
                          className={cn(
                            'shrink-0 tabular-nums',
                            active &&
                              'border-sidebar-primary-foreground/30 bg-sidebar-primary-foreground/15 text-sidebar-primary-foreground'
                          )}
                        >
                          {item.badge}
                        </Badge>
                      ) : null;

                    const collapsedDot =
                      item.badge && !isOpen ? (
                        <span
                          aria-label={`${item.badge}${
                            item.badgeTone === 'soon' ? '' : ' pending'
                          }`}
                          className={cn(
                            'absolute right-1.5 top-1.5 inline-flex size-2 rounded-full ring-2 ring-sidebar',
                            item.badgeTone === 'soon'
                              ? 'bg-muted-foreground/40'
                              : 'bg-warning'
                          )}
                        />
                      ) : null;

                    return (
                      <li key={key}>
                        {isSettingsRow ? (
                          <button
                            type="button"
                            onClick={() => {
                              if (settingsOpen && active) {
                                setSettingsOpen(false);
                              } else {
                                setSettingsOpen(true);
                                if (!active) router.push('/dashboard/settings');
                              }
                            }}
                            aria-expanded={settingsOpen}
                            aria-controls="settings-subnav"
                            aria-current={active ? 'page' : undefined}
                            title={!isOpen ? item.label : undefined}
                            className={linkClasses}
                          >
                            {iconNode}
                            {labelNode}
                            {isOpen && (
                              <ChevronDown
                                className={cn(
                                  'size-3.5 shrink-0 transition-transform',
                                  settingsOpen && 'rotate-180'
                                )}
                                aria-hidden="true"
                              />
                            )}
                          </button>
                        ) : (
                          <Link
                            href={item.href}
                            aria-current={active ? 'page' : undefined}
                            aria-disabled={item.comingSoon || undefined}
                            title={
                              !isOpen
                                ? `${item.label}${
                                    item.comingSoon ? ' (coming soon)' : ''
                                  }`
                                : undefined
                            }
                            className={linkClasses}
                          >
                            {iconNode}
                            {labelNode}
                            {badgeNode}
                            {collapsedDot}
                          </Link>
                        )}

                        {/* Settings sub-nav */}
                        {isSettingsRow && (
                          <AnimatePresence initial={false}>
                            {settingsOpen && isOpen && (
                              <motion.ul
                                id="settings-subnav"
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                transition={{
                                  duration: 0.2,
                                  ease: [0.16, 1, 0.3, 1],
                                }}
                                className="overflow-hidden"
                                role="list"
                              >
                                <li className="mt-1 ml-4 border-l border-sidebar-border">
                                  <ul className="space-y-0.5 pl-2">
                                    {SETTINGS_TABS.map((tab) => {
                                      const isTabActive =
                                        pathname === '/dashboard/settings' &&
                                        activeTab === tab.id;
                                      return (
                                        <li key={tab.id}>
                                          <Link
                                            href={`/dashboard/settings?tab=${tab.id}`}
                                            aria-current={
                                              isTabActive ? 'page' : undefined
                                            }
                                            className={cn(
                                              'flex items-center rounded-lg px-3 py-1.5 text-xs font-medium transition-colors',
                                              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring',
                                              isTabActive
                                                ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                                                : 'text-sidebar-foreground/60 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground'
                                            )}
                                          >
                                            {tab.label}
                                          </Link>
                                        </li>
                                      );
                                    })}
                                  </ul>
                                </li>
                              </motion.ul>
                            )}
                          </AnimatePresence>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </li>
            ))}
          </ul>
        </nav>

        {/* Footer */}
        <div className="relative z-10 border-t border-sidebar-border p-3">
          {isOpen ? (
            <div className="space-y-2">
              <Button
                size="sm"
                block
                leadingIcon={<Plus className="size-4" />}
                onClick={() => router.push('/dashboard/community?new=1')}
                className="bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary/90"
              >
                New community
              </Button>
              <Link
                href="#"
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-sidebar-foreground/60 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
              >
                <HelpCircle className="size-3.5" aria-hidden="true" />
                Help &amp; support
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              <Button
                size="icon"
                onClick={() => router.push('/dashboard/community?new=1')}
                aria-label="New community"
                title="New community"
                className="bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary/90 mx-auto flex"
              >
                <Plus className="size-4" />
              </Button>
              <Link
                href="#"
                title="Help & support"
                className="mx-auto flex size-9 items-center justify-center rounded-lg text-sidebar-foreground/60 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
              >
                <HelpCircle className="size-4" aria-hidden="true" />
              </Link>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
