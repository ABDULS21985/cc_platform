'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Users, Wallet, Calendar, Settings as SettingsIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const NAV: NavItem[] = [
  { href: '/dashboard', label: 'Home', icon: Home },
  { href: '/dashboard/community', label: 'Communities', icon: Users },
  { href: '/dashboard/wallet', label: 'Wallet', icon: Wallet },
  { href: '/dashboard/events', label: 'Events', icon: Calendar },
  { href: '/dashboard/settings', label: 'Settings', icon: SettingsIcon },
];

function isActive(pathname: string, href: string): boolean {
  if (href === '/dashboard') return pathname === '/dashboard';
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * Bottom-tab nav for mobile. Renders only at < 1024px (where the desktop sidebar is hidden).
 * Respects iOS safe area inset, uses semantic <nav>, and exposes aria-current="page" on the active tab.
 */
export function MobileNav() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Primary"
      className={cn(
        'fixed inset-x-0 bottom-0 z-40 lg:hidden',
        'border-t border-border bg-background/85 backdrop-blur-xl',
        'pb-[max(env(safe-area-inset-bottom),0.5rem)]'
      )}
    >
      <ul className="mx-auto grid max-w-xl grid-cols-5">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = isActive(pathname ?? '', href);
          return (
            <li key={href} className="flex">
              <Link
                href={href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex h-14 w-full flex-col items-center justify-center gap-0.5 text-[10px] font-medium tracking-tight',
                  'transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  active
                    ? 'text-primary'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <Icon className={cn('size-5', active && 'stroke-[2.4]')} aria-hidden="true" />
                <span>{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
