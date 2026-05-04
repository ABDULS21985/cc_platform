'use client';

import * as React from 'react';
import {
  Activity as ActivityIcon,
  ArrowDownLeft,
  Bell,
  Calendar,
  Receipt,
  ShieldCheck,
  Sparkles,
  Users,
  X,
} from 'lucide-react';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ApiService, type AuditApi, type NotificationApi } from '@/services/api';
import { useNotifications } from '@/contexts/NotificationContext';
import { cn } from '@/lib/utils';

type FeedKind = 'notification' | 'audit';

interface FeedItem {
  kind: FeedKind;
  id: string;
  category: string;
  severity?: 'info' | 'warning' | 'critical';
  title: string;
  body: string;
  source: string;
  timestamp: string;
  href?: string;
  isRead?: boolean;
}

const CATEGORY_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  money: ArrowDownLeft,
  bills: Receipt,
  communities: Users,
  events: Calendar,
  security: ShieldCheck,
  system: Sparkles,
  admin: Users,
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

function notifToFeed(n: NotificationApi): FeedItem {
  return {
    kind: 'notification',
    id: `n-${n.id}`,
    category: n.category,
    title: n.title,
    body: n.body,
    source: n.source,
    timestamp: n.timestamp || n.created_at,
    href: n.action_href || '/dashboard/inbox',
    isRead: n.is_read,
  };
}

function auditToFeed(e: AuditApi): FeedItem {
  return {
    kind: 'audit',
    id: `a-${e.id}`,
    category: e.category,
    severity: e.severity,
    title: e.action,
    body: e.details,
    source: e.actor,
    timestamp: e.timestamp || e.created_at,
    href: '/dashboard/audit',
  };
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ActivityDrawer({ open, onOpenChange }: Props) {
  const { onNotification } = useNotifications();
  const [items, setItems] = React.useState<FeedItem[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [hasFetched, setHasFetched] = React.useState(false);

  const fetchFeed = React.useCallback(async () => {
    setLoading(true);
    try {
      const [notifsRes, auditRes] = await Promise.all([
        ApiService.notifications.list({ limit: 25 }),
        ApiService.audit.list({ limit: 25 }),
      ]);
      const notifs = (notifsRes.data?.data?.notifications ?? []).map(notifToFeed);
      const audit = (auditRes.data?.data?.events ?? []).map(auditToFeed);
      const merged = [...notifs, ...audit].sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
      );
      setItems(merged.slice(0, 40));
      setHasFetched(true);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  // Refetch when the drawer first opens.
  React.useEffect(() => {
    if (open && !hasFetched) void fetchFeed();
  }, [open, hasFetched, fetchFeed]);

  // Live: prepend incoming notifications even while drawer is closed so it's
  // already current the next time the user opens it.
  React.useEffect(() => {
    return onNotification((n) => {
      setItems((prev) => {
        const incoming = notifToFeed(n);
        if (prev.some((p) => p.id === incoming.id)) return prev;
        return [incoming, ...prev].slice(0, 40);
      });
      setHasFetched(true);
    });
  }, [onNotification]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full max-w-md border-l border-border bg-background p-0"
      >
        <div className="flex h-full flex-col">
          <header className="flex items-center justify-between border-b border-border px-5 py-4">
            <div className="flex items-center gap-2.5">
              <span className="grid size-8 place-items-center rounded-xl bg-brand-soft text-accent-foreground">
                <ActivityIcon className="size-4" aria-hidden="true" />
              </span>
              <div>
                <h2 className="text-sm font-bold tracking-tight text-foreground">
                  Recent activity
                </h2>
                <p className="text-[11px] text-muted-foreground">
                  Notifications and audit events, newest first.
                </p>
              </div>
            </div>
            <Button
              type="button"
              size="icon-sm"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              aria-label="Close activity"
            >
              <X className="size-4" aria-hidden="true" />
            </Button>
          </header>

          <div className="flex-1 overflow-y-auto px-1 py-2">
            {loading && items.length === 0 ? (
              <ul className="space-y-2 p-3">
                {Array.from({ length: 6 }).map((_, i) => (
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
              <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center">
                <span className="grid size-10 place-items-center rounded-xl bg-muted/60 text-muted-foreground">
                  <Bell className="size-4" aria-hidden="true" />
                </span>
                <p className="text-sm font-semibold text-foreground">No activity yet</p>
                <p className="text-xs text-muted-foreground">
                  Sign in events, payments, and community changes will surface here.
                </p>
              </div>
            ) : (
              <ul role="list" className="divide-y divide-border/60">
                {items.map((it) => {
                  const Icon = CATEGORY_ICON[it.category] ?? Sparkles;
                  return (
                    <li key={it.id}>
                      <a
                        href={it.href ?? '#'}
                        onClick={() => onOpenChange(false)}
                        className="group flex items-start gap-3 px-4 py-3 transition-colors hover:bg-accent/40"
                      >
                        <span
                          className={cn(
                            'mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg',
                            it.category === 'money' && 'bg-success/15 text-success',
                            it.category === 'bills' && 'bg-warning/15 text-warning',
                            it.category === 'communities' && 'bg-brand-soft text-accent-foreground',
                            it.category === 'events' && 'bg-info/15 text-info',
                            it.category === 'security' && 'bg-destructive/15 text-destructive',
                            it.category === 'system' && 'bg-muted/60 text-muted-foreground',
                            it.category === 'admin' && 'bg-warning/10 text-warning',
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
                                it.kind === 'notification' && it.isRead === false
                                  ? 'font-semibold text-foreground'
                                  : 'font-medium text-foreground',
                              )}
                            >
                              {it.title}
                            </p>
                            <span
                              aria-hidden="true"
                              className={cn(
                                'rounded-full px-1.5 py-0.5 text-[9px] uppercase tracking-widest',
                                it.kind === 'audit'
                                  ? 'bg-muted/60 text-muted-foreground'
                                  : 'bg-brand-soft text-accent-foreground',
                              )}
                            >
                              {it.kind === 'audit' ? 'Audit' : 'Inbox'}
                            </span>
                          </div>
                          {it.body && (
                            <p className="line-clamp-2 text-[11px] text-muted-foreground">
                              {it.body}
                            </p>
                          )}
                          <p className="mt-0.5 text-[10px] uppercase tracking-widest text-muted-foreground/80">
                            {it.source} · {relativeTime(it.timestamp)}
                          </p>
                        </div>
                      </a>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
