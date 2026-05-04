'use client';

import * as React from 'react';
import { Suspense, useEffect, useState } from 'react';
import { Bell, Menu, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import Protected from '@/components/Protected';
import LogoutDialog from '../dialogs/LogoutDialog';
import { NotificationProvider, useNotifications } from '@/contexts/NotificationContext';
import Link from 'next/link';
import { ThemeSwitcher } from '@/components/layout/ThemeSwitcher';
import { CommandPalette } from '@/components/layout/CommandPalette';
import { MobileNav } from '@/components/layout/MobileNav';
import { Sidebar } from '@/components/layout/Sidebar';
import { Skeleton } from '@/components/ui/skeleton';
import useUserData from '@/hooks/useUserData';

interface DashboardLayoutProps {
  children: React.ReactNode;
  pageTitle: string;
}

function NotificationBell() {
  const { unreadCount } = useNotifications();
  const hasUnread = unreadCount > 0;
  const display = unreadCount > 99 ? '99+' : String(unreadCount);
  return (
    <Link
      href="/dashboard/inbox"
      aria-label={
        hasUnread
          ? `Notifications · ${unreadCount} unread`
          : 'Notifications'
      }
      className="relative grid size-10 place-items-center rounded-xl border border-border bg-muted/40 text-muted-foreground transition-colors hover:border-input hover:bg-muted/60 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <Bell className="size-4" aria-hidden="true" />
      {hasUnread && (
        <span
          aria-hidden="true"
          className="absolute right-1 top-1 grid min-h-3.5 min-w-3.5 place-items-center rounded-full bg-primary px-1 text-[9px] font-bold text-primary-foreground ring-2 ring-background"
        >
          {display}
        </span>
      )}
    </Link>
  );
}

function DashboardLayoutContent({ children, pageTitle }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const router = useRouter();
  const user = useUserData() as
    | {
        full_name?: string;
        firstname?: string;
        avatar?: string | null;
        role?: string;
        email?: string;
      }
    | null;

  // Sidebar starts collapsed on small screens.
  useEffect(() => {
    const handleResize = () => setSidebarOpen(window.innerWidth >= 1024);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Global Cmd/Ctrl+K opens the command palette.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.key === 'k' || e.key === 'K') && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setPaletteOpen((v) => !v);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className="flex h-screen bg-background font-sans text-foreground">
      <Sidebar
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen((v) => !v)}
        onCloseMobile={() => setSidebarOpen(false)}
        user={user}
        onLogout={() => setLogoutDialogOpen(true)}
      />

      {/* Main column */}
      <div className="relative flex flex-1 flex-col overflow-hidden">
        {/* Topbar */}
        <header className="z-30 flex h-16 items-center border-b border-border bg-background/85 px-5 backdrop-blur-xl sm:px-6">
          <div className="flex w-full items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon-sm"
                className="lg:hidden"
                onClick={() => setSidebarOpen(true)}
                aria-label="Open menu"
              >
                <Menu className="size-5" aria-hidden="true" />
              </Button>
              <h1 className="text-lg font-bold tracking-tight text-foreground sm:text-xl">
                {pageTitle}
              </h1>
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              {/* Cmd-K trigger */}
              <button
                type="button"
                onClick={() => setPaletteOpen(true)}
                aria-label="Open command palette"
                className="hidden h-10 w-[280px] items-center justify-between gap-3 rounded-xl border border-border bg-muted/40 px-4 text-xs font-medium text-muted-foreground transition-colors hover:border-input hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:inline-flex"
              >
                <span className="flex items-center gap-2">
                  <Search className="size-4" aria-hidden="true" />
                  Search routes &amp; actions
                </span>
                <kbd className="inline-flex h-5 items-center gap-0.5 rounded-md border border-border bg-background px-1.5 font-mono text-[10px] tracking-tight">
                  <span>⌘</span>K
                </kbd>
              </button>

              <ThemeSwitcher compact />

              <NotificationBell />
            </div>
          </div>
        </header>

        <LogoutDialog
          isOpen={logoutDialogOpen}
          toggleDialog={() => setLogoutDialogOpen((v) => !v)}
        />

        <main className="custom-scrollbar relative flex-1 overflow-y-auto p-4 pb-24 sm:p-6 lg:pb-6">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute right-0 top-0 -z-10 size-[400px] -translate-y-1/2 translate-x-1/2 rounded-full bg-brand-soft/40 blur-[100px]"
          />
          <div className="mx-auto max-w-7xl animate-fade-in">{children}</div>
        </main>

        <MobileNav />
        <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
      </div>
    </div>
  );
}

function DashboardLayoutFallback({ pageTitle }: { pageTitle: string }) {
  return (
    <div className="flex h-screen bg-background text-foreground">
      <div className="hidden w-64 flex-col border-r border-sidebar-border bg-sidebar p-4 lg:flex">
        <Skeleton className="h-8 w-24 rounded-lg" />
        <Skeleton className="mt-6 h-12 w-full rounded-xl" />
        <div className="mt-6 space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-full rounded-lg" />
          ))}
        </div>
      </div>
      <div className="flex flex-1 flex-col">
        <div className="flex h-16 items-center border-b border-border px-6">
          <Skeleton className="h-5 w-32 rounded" />
        </div>
        <div className="flex-1 p-6">
          <div className="mx-auto max-w-7xl space-y-6">
            <Skeleton className="h-32 w-full rounded-2xl" />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-32 rounded-2xl" />
              ))}
            </div>
            <Skeleton className="h-48 w-full rounded-2xl" />
          </div>
        </div>
      </div>
      {/* page title rendered for parity with non-fallback */}
      <span className="sr-only">{pageTitle}</span>
    </div>
  );
}

export default function DashboardLayout({
  children,
  pageTitle,
}: DashboardLayoutProps) {
  return (
    <Protected>
      <NotificationProvider>
        <Suspense fallback={<DashboardLayoutFallback pageTitle={pageTitle} />}>
          <DashboardLayoutContent pageTitle={pageTitle}>
            {children}
          </DashboardLayoutContent>
        </Suspense>
      </NotificationProvider>
    </Protected>
  );
}
