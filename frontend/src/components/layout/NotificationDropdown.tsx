'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowDownLeft,
  Bell,
  Calendar,
  Check,
  CheckCheck,
  Inbox,
  Receipt,
  ShieldCheck,
  Sparkles,
  Users,
} from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ApiService, type NotificationApi } from '@/services/api';
import { useNotifications } from '@/contexts/NotificationContext';
import { cn } from '@/lib/utils';

const CATEGORY_ICON: Record<NotificationApi['category'] | string, React.ComponentType<{ className?: string }>> = {
  money: ArrowDownLeft,
  bills: Receipt,
  communities: Users,
  events: Calendar,
  security: ShieldCheck,
  system: Sparkles,
};

function relativeTime(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 60_000) return 'just now';
  const m = Math.floor(ms / 60_000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

interface Props {
  children: React.ReactNode;
}

export function NotificationDropdown({ children }: Props) {
  const router = useRouter();
  const { onNotification, markRead, markAllRead } = useNotifications();
  const [open, setOpen] = React.useState(false);
  const [items, setItems] = React.useState<NotificationApi[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [hasFetched, setHasFetched] = React.useState(false);

  const fetchLatest = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await ApiService.notifications.list({ limit: 6 });
      setItems(res.data?.data?.notifications ?? []);
      setHasFetched(true);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch on first open.
  React.useEffect(() => {
    if (open && !hasFetched) void fetchLatest();
  }, [open, hasFetched, fetchLatest]);

  // Live updates while the dropdown is mounted (even when closed) keep
  // the cached list fresh so opening the panel feels instant.
  React.useEffect(() => {
    return onNotification((n) => {
      setItems((prev) => {
        if (prev.some((p) => p.id === n.id)) return prev;
        return [n, ...prev].slice(0, 6);
      });
      setHasFetched(true);
    });
  }, [onNotification]);

  const handleItemClick = (n: NotificationApi) => {
    if (!n.is_read) {
      markRead(n.id);
      setItems((prev) =>
        prev.map((it) => (it.id === n.id ? { ...it, is_read: true } : it))
      );
    }
    setOpen(false);
    if (n.action_href) {
      router.push(n.action_href);
    } else {
      router.push('/dashboard/inbox');
    }
  };

  const handleMarkAll = async () => {
    setItems((prev) => prev.map((it) => ({ ...it, is_read: true })));
    await markAllRead();
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={10}
        className="w-[22rem] p-0 overflow-hidden"
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="grid size-7 place-items-center rounded-lg bg-brand-soft text-accent-foreground">
              <Bell className="size-3.5" aria-hidden="true" />
            </span>
            <p className="text-sm font-semibold tracking-tight text-foreground">
              Notifications
            </p>
          </div>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={handleMarkAll}
            leadingIcon={<CheckCheck className="size-3.5" />}
            className="h-7 px-2 text-[11px]"
          >
            Mark all read
          </Button>
        </div>

        <div className="max-h-[28rem] overflow-y-auto">
          {loading && items.length === 0 ? (
            <ul className="space-y-3 p-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <li key={i} className="flex items-start gap-3">
                  <Skeleton className="size-8 rounded-lg" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-3 w-2/3" />
                    <Skeleton className="h-2.5 w-full" />
                  </div>
                </li>
              ))}
            </ul>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 px-4 py-10 text-center">
              <span className="grid size-10 place-items-center rounded-xl bg-muted/60 text-muted-foreground">
                <Inbox className="size-4" aria-hidden="true" />
              </span>
              <p className="text-sm font-semibold text-foreground">You're all caught up</p>
              <p className="text-xs text-muted-foreground">
                New activity will land here in real time.
              </p>
            </div>
          ) : (
            <ul role="list" className="divide-y divide-border/60">
              {items.map((n) => {
                const Icon = CATEGORY_ICON[n.category] ?? Sparkles;
                return (
                  <li key={n.id}>
                    <button
                      type="button"
                      onClick={() => handleItemClick(n)}
                      className={cn(
                        'group flex w-full items-start gap-3 px-4 py-3 text-left transition-colors',
                        'hover:bg-accent/40 focus-visible:bg-accent/60 focus-visible:outline-none'
                      )}
                    >
                      <span
                        className={cn(
                          'mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg',
                          n.category === 'money' && 'bg-success/15 text-success',
                          n.category === 'bills' && 'bg-warning/15 text-warning',
                          n.category === 'communities' && 'bg-brand-soft text-accent-foreground',
                          n.category === 'events' && 'bg-info/15 text-info',
                          n.category === 'security' && 'bg-destructive/15 text-destructive',
                          n.category === 'system' && 'bg-muted/60 text-muted-foreground'
                        )}
                        aria-hidden="true"
                      >
                        <Icon className="size-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p
                            className={cn(
                              'truncate text-sm tracking-tight',
                              n.is_read
                                ? 'font-medium text-muted-foreground'
                                : 'font-semibold text-foreground'
                            )}
                          >
                            {n.title}
                          </p>
                          {!n.is_read && (
                            <span
                              className="size-1.5 shrink-0 rounded-full bg-primary"
                              aria-hidden="true"
                            />
                          )}
                        </div>
                        {n.body && (
                          <p className="line-clamp-2 text-[11px] text-muted-foreground">
                            {n.body}
                          </p>
                        )}
                        <p className="mt-0.5 text-[10px] uppercase tracking-widest text-muted-foreground/80">
                          {n.source} · {relativeTime(n.timestamp)}
                        </p>
                      </div>
                      {n.is_read && (
                        <Check
                          className="mt-2 size-3 shrink-0 text-muted-foreground/50"
                          aria-hidden="true"
                        />
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="border-t border-border px-3 py-2">
          <Link
            href="/dashboard/inbox"
            onClick={() => setOpen(false)}
            className="block rounded-lg px-3 py-1.5 text-center text-xs font-semibold text-primary hover:bg-accent/60"
          >
            See all notifications
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}
