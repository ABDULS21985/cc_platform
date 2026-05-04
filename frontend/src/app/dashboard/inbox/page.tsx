'use client';

import * as React from 'react';
import { useEffect, useMemo, useState } from 'react';
import {
  ArrowDownLeft,
  Bell,
  Calendar,
  Check,
  Filter,
  Inbox as InboxIcon,
  Receipt,
  Search,
  ShieldCheck,
  Sparkles,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { ApiService, type NotificationApi } from '@/services/api';
import { useNotifications } from '@/contexts/NotificationContext';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { motion, AnimatePresence } from '@/components/ui/motion';
import { InboxHero } from '@/components/inbox/InboxHero';
import { NotificationRow } from '@/components/inbox/NotificationItem';
import type {
  NotificationCategory,
  NotificationItem,
} from '@/components/inbox/types';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export const dynamic = 'force-dynamic';

type TabValue = 'all' | 'unread' | NotificationCategory;

interface TabMeta {
  value: TabValue;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const TABS: TabMeta[] = [
  { value: 'all', label: 'All', icon: InboxIcon },
  { value: 'unread', label: 'Unread', icon: Bell },
  { value: 'money', label: 'Money', icon: ArrowDownLeft },
  { value: 'bills', label: 'Bills', icon: Receipt },
  { value: 'communities', label: 'Communities', icon: Users },
  { value: 'events', label: 'Events', icon: Calendar },
  { value: 'security', label: 'Security', icon: ShieldCheck },
];

// Realistic mock notifications — relative to "now" so the time buckets
// always look fresh as you navigate.
const now = new Date();
const minutesAgo = (m: number) => new Date(now.getTime() - m * 60_000).toISOString();
const hoursAgo = (h: number) => minutesAgo(h * 60);
const daysAgo = (d: number) => hoursAgo(d * 24);

const MOCK: NotificationItem[] = [
  {
    id: 'n1',
    category: 'money',
    title: 'You received a transfer',
    body: 'Adaeze Mbakwe sent you ₦18,500 for "April estate dues".',
    source: 'Bell MFB',
    timestamp: minutesAgo(8),
    isRead: false,
    amount: { value: '18,500', direction: 'in' },
    actionHref: '/dashboard/wallet',
    actionLabel: 'View receipt',
    initials: 'AM',
  },
  {
    id: 'n2',
    category: 'bills',
    title: 'Estate dues — April · overdue',
    body: '₦18,500 is 2 days past due. Settle now to avoid late fees.',
    source: 'Lekki Block 3 HOA',
    timestamp: hoursAgo(2),
    isRead: false,
    actionHref: '/dashboard/community',
    actionLabel: 'Pay now',
  },
  {
    id: 'n3',
    category: 'events',
    title: 'Event starting soon',
    body: 'Crypto academy · Week 4 starts in 30 minutes. Join the live session.',
    source: 'Cryptos NG',
    timestamp: hoursAgo(3),
    isRead: false,
    actionHref: '/dashboard/events/2',
    actionLabel: 'Join now',
  },
  {
    id: 'n4',
    category: 'communities',
    title: '3 new join requests',
    body: 'Lekki Runners has 3 new requests awaiting your approval as admin.',
    source: 'Lekki Runners',
    timestamp: hoursAgo(5),
    isRead: false,
    actionHref: '/dashboard/community',
    actionLabel: 'Review',
    initials: 'LR',
  },
  {
    id: 'n5',
    category: 'security',
    title: 'New sign-in from Chrome on macOS',
    body: 'A new device signed in from Lagos, Nigeria. If this wasn’t you, secure your account.',
    source: 'CCPay Security',
    timestamp: hoursAgo(8),
    isRead: false,
    actionHref: '/dashboard/settings?tab=login-history',
    actionLabel: 'Review activity',
  },
  {
    id: 'n6',
    category: 'money',
    title: 'Wallet funded',
    body: 'You topped up ₦40,000 from Bell MFB ·· 8421.',
    source: 'Bell MFB',
    timestamp: hoursAgo(20),
    isRead: true,
    amount: { value: '40,000', direction: 'in' },
    actionHref: '/dashboard/wallet',
  },
  {
    id: 'n7',
    category: 'money',
    title: 'Transfer to Trinity Co-op',
    body: 'You sent ₦8,000 to Trinity Co-op (·· 0418).',
    source: 'Bell MFB',
    timestamp: daysAgo(1),
    isRead: false,
    amount: { value: '8,000', direction: 'out' },
    actionHref: '/dashboard/wallet',
    initials: 'TC',
  },
  {
    id: 'n8',
    category: 'communities',
    title: 'You were promoted to admin',
    body: 'Pastor Bisi added you as an admin in Grace Assembly.',
    source: 'Grace Assembly',
    timestamp: daysAgo(1),
    isRead: false,
    actionHref: '/dashboard/community',
    initials: 'GA',
  },
  {
    id: 'n9',
    category: 'bills',
    title: 'Bill paid',
    body: 'Marathon registration · ₦12,500 has been received.',
    source: 'Lekki Runners',
    timestamp: daysAgo(2),
    isRead: true,
    actionHref: '/dashboard/community',
  },
  {
    id: 'n10',
    category: 'events',
    title: 'RSVP confirmed',
    body: 'You’re going to "Tech meetup 2026" on 28 Jun at Co-Creation Hub.',
    source: 'Lagos Devs',
    timestamp: daysAgo(2),
    isRead: false,
    actionHref: '/dashboard/events/5',
  },
  {
    id: 'n11',
    category: 'system',
    title: 'BVN verified',
    body: 'Your identity has been verified. You can now transfer up to ₦5M per day.',
    source: 'CCPay',
    timestamp: daysAgo(3),
    isRead: true,
    actionHref: '/dashboard/settings?tab=verification',
  },
  {
    id: 'n12',
    category: 'security',
    title: 'Password changed',
    body: 'Your password was updated successfully. All other sessions were signed out.',
    source: 'CCPay Security',
    timestamp: daysAgo(4),
    isRead: false,
  },
  {
    id: 'n13',
    category: 'communities',
    title: 'New post in Cryptos NG',
    body: 'Adaeze posted: "Week 4 reading list — DeFi basics, ETFs, and the volatility playbook."',
    source: 'Cryptos NG',
    timestamp: daysAgo(5),
    isRead: false,
    actionHref: '/dashboard',
    initials: 'AM',
  },
  {
    id: 'n14',
    category: 'events',
    title: 'Event cancelled',
    body: 'AGM streaming · Q&A on 18 Apr was cancelled. Refunds (if any) will arrive within 3 business days.',
    source: 'Lekki Block 3 HOA',
    timestamp: daysAgo(6),
    isRead: true,
  },
  {
    id: 'n15',
    category: 'system',
    title: 'Terms of Service updated',
    body: 'Our terms have been refreshed for clarity around community treasury rules.',
    source: 'CCPay',
    timestamp: daysAgo(8),
    isRead: true,
    actionHref: '#',
  },
];

type Bucket = 'today' | 'yesterday' | 'this-week' | 'earlier';

function bucketOf(iso: string): Bucket {
  const d = new Date(iso);
  const startOfDay = (date: Date) => {
    const c = new Date(date);
    c.setHours(0, 0, 0, 0);
    return c;
  };
  const todayStart = startOfDay(new Date());
  const dayDiff = Math.floor(
    (todayStart.getTime() - startOfDay(d).getTime()) / (1000 * 60 * 60 * 24)
  );
  if (dayDiff <= 0) return 'today';
  if (dayDiff === 1) return 'yesterday';
  if (dayDiff <= 7) return 'this-week';
  return 'earlier';
}

const BUCKET_LABEL: Record<Bucket, string> = {
  today: 'Today',
  yesterday: 'Yesterday',
  'this-week': 'This week',
  earlier: 'Earlier',
};

const BUCKET_ORDER: Bucket[] = ['today', 'yesterday', 'this-week', 'earlier'];

const SRV_PREFIX = 'srv-';
const isServerId = (id: string) => id.startsWith(SRV_PREFIX);
const serverIdNum = (id: string): number => Number(id.slice(SRV_PREFIX.length));

function mapApiNotification(n: NotificationApi): NotificationItem {
  const validCategories: NotificationItem['category'][] = [
    'money', 'bills', 'communities', 'events', 'security', 'system',
  ];
  const category: NotificationItem['category'] = validCategories.includes(
    n.category as NotificationItem['category'],
  )
    ? (n.category as NotificationItem['category'])
    : 'system';
  return {
    id: `${SRV_PREFIX}${n.id}`,
    category,
    title: n.title,
    body: n.body,
    source: n.source,
    timestamp: n.timestamp || n.created_at,
    isRead: n.is_read,
    actionHref: n.action_href ?? undefined,
    actionLabel: n.action_label ?? undefined,
    amount: n.amount ?? undefined,
    initials: n.initials ?? undefined,
  };
}

export default function InboxPage() {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [usingMock, setUsingMock] = useState(false);
  const [tab, setTab] = useState<TabValue>('all');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<'newest' | 'oldest' | 'unread'>('newest');
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const {
    onNotification,
    markRead: ctxMarkRead,
    markAllRead: ctxMarkAllRead,
  } = useNotifications();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await ApiService.notifications.list({ limit: 100 });
        const list = res.data?.data?.notifications ?? [];
        if (cancelled) return;
        if (list.length === 0) {
          setItems(MOCK);
          setUsingMock(true);
        } else {
          setItems(list.map(mapApiNotification));
          setUsingMock(false);
        }
      } catch {
        if (!cancelled) {
          setItems(MOCK);
          setUsingMock(true);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Live: prepend new server-pushed notifications when they arrive.
  useEffect(() => {
    return onNotification((n) => {
      setItems((prev) => {
        const incoming = mapApiNotification(n);
        if (prev.some((it) => it.id === incoming.id)) return prev;
        // If we were on mock fallback before, switch to a real list.
        return [incoming, ...prev.filter((it) => !it.id.startsWith('n'))];
      });
      setUsingMock(false);
    });
  }, [onNotification]);

  // Stats for the hero
  const stats = useMemo(() => {
    const unread = items.filter((i) => !i.isRead).length;
    const today = items.filter((i) => bucketOf(i.timestamp) === 'today').length;
    const thisWeek = items.filter((i) =>
      ['today', 'yesterday', 'this-week'].includes(bucketOf(i.timestamp))
    ).length;
    return { unread, today, thisWeek };
  }, [items]);

  const counts = useMemo<Record<TabValue, number>>(() => {
    const all = items.length;
    const unread = items.filter((i) => !i.isRead).length;
    return {
      all,
      unread,
      money: items.filter((i) => i.category === 'money').length,
      bills: items.filter((i) => i.category === 'bills').length,
      communities: items.filter((i) => i.category === 'communities').length,
      events: items.filter((i) => i.category === 'events').length,
      security: items.filter((i) => i.category === 'security').length,
      system: items.filter((i) => i.category === 'system').length,
    };
  }, [items]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items
      .filter((it) => {
        if (tab === 'all') return true;
        if (tab === 'unread') return !it.isRead;
        return it.category === tab;
      })
      .filter((it) => {
        if (!q) return true;
        return (
          it.title.toLowerCase().includes(q) ||
          it.body.toLowerCase().includes(q) ||
          it.source.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        if (sort === 'unread') {
          if (a.isRead === b.isRead) {
            return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
          }
          return a.isRead ? 1 : -1;
        }
        const cmp =
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
        return sort === 'newest' ? -cmp : cmp;
      });
  }, [items, tab, search, sort]);

  const grouped = useMemo(() => {
    const map = new Map<Bucket, NotificationItem[]>();
    for (const it of filtered) {
      const b = bucketOf(it.timestamp);
      const list = map.get(b) ?? [];
      list.push(it);
      map.set(b, list);
    }
    return BUCKET_ORDER.filter((b) => map.has(b)).map((b) => ({
      bucket: b,
      label: BUCKET_LABEL[b],
      items: map.get(b) ?? [],
    }));
  }, [filtered]);

  const toggleSelect = (id: string, value: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (value) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const selectAllVisible = (value: boolean) => {
    setSelected((prev) => {
      if (!value) {
        const next = new Set(prev);
        for (const it of filtered) next.delete(it.id);
        return next;
      }
      const next = new Set(prev);
      for (const it of filtered) next.add(it.id);
      return next;
    });
  };

  const visibleSelectedCount = filtered.filter((it) => selected.has(it.id)).length;
  const allVisibleSelected =
    filtered.length > 0 && visibleSelectedCount === filtered.length;

  const markRead = (ids: string[]) => {
    // Find which IDs are actually transitioning unread → read so we only
    // decrement the global counter for true changes, not re-clicks.
    const newlyRead = items.filter((it) => ids.includes(it.id) && !it.isRead);
    setItems((prev) =>
      prev.map((it) => (ids.includes(it.id) ? { ...it, isRead: true } : it))
    );
    if (usingMock) return;
    for (const it of newlyRead) {
      if (isServerId(it.id)) {
        // Context wraps the API call AND decrements the bell badge count
        // for the specific category, keeping sidebar badges in sync.
        ctxMarkRead(serverIdNum(it.id), it.category);
      }
    }
  };
  const removeMany = (ids: string[]) => {
    setItems((prev) => prev.filter((it) => !ids.includes(it.id)));
    if (usingMock) return;
    for (const id of ids) {
      if (isServerId(id)) {
        ApiService.notifications.delete(serverIdNum(id)).catch(() => {});
      }
    }
  };

  const handleMarkAllRead = () => {
    if (stats.unread === 0) return;
    const unreadIds = items.filter((it) => !it.isRead).map((it) => it.id);
    setItems((prev) => prev.map((it) => ({ ...it, isRead: true })));
    if (!usingMock) {
      // Context syncs the API + zeros the bell badge.
      void ctxMarkAllRead();
    }
    toast.success(`Marked ${unreadIds.length} as read`);
  };

  const handleBulkMarkRead = () => {
    const ids = [...selected];
    markRead(ids);
    setSelected(new Set());
    toast.success(`Marked ${ids.length} as read`);
  };

  const handleBulkDelete = () => {
    const ids = [...selected];
    removeMany(ids);
    setSelected(new Set());
    toast.success(`Deleted ${ids.length} notifications`);
  };

  return (
    <DashboardLayout pageTitle="Inbox">
      <div className="space-y-6">
        <InboxHero stats={stats} onMarkAllRead={handleMarkAllRead} />

        {/* Tabs */}
        <div
          role="tablist"
          aria-label="Inbox sections"
          className="-mx-1 overflow-x-auto px-1"
        >
          <div className="inline-flex items-center gap-1 rounded-full border border-border bg-card p-1 shadow-xs">
            {TABS.map((t) => {
              const isActive = tab === t.value;
              const Icon = t.icon;
              const count = counts[t.value];
              return (
                <button
                  key={t.value}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => setTab(t.value)}
                  className={cn(
                    'relative inline-flex items-center gap-2 whitespace-nowrap rounded-full px-3.5 py-2 text-sm font-semibold transition-colors',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    isActive
                      ? 'text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  {isActive && (
                    <motion.span
                      layoutId="inbox-tab-pill"
                      className="absolute inset-0 -z-10 rounded-full bg-primary shadow-sm"
                      transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                    />
                  )}
                  <Icon className="size-3.5" aria-hidden="true" />
                  {t.label}
                  {count > 0 && (
                    <Badge
                      variant={isActive ? 'outline' : 'soft'}
                      size="sm"
                      className={cn(
                        'tabular-nums',
                        isActive &&
                          'border-primary-foreground/30 bg-primary-foreground/15 text-primary-foreground'
                      )}
                    >
                      {count}
                    </Badge>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Search + sort */}
        <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-3 shadow-xs sm:flex-row sm:items-center sm:p-4">
          <div className="relative flex-1">
            <Search
              className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search notifications…"
              className="h-11 rounded-xl pl-11"
              aria-label="Search notifications"
            />
          </div>
          <Select value={sort} onValueChange={(v) => setSort(v as typeof sort)}>
            <SelectTrigger
              className="h-11 w-full rounded-xl px-3 sm:w-44"
              aria-label="Sort notifications"
            >
              <span className="inline-flex items-center gap-2">
                <Filter
                  className="size-4 text-muted-foreground"
                  aria-hidden="true"
                />
                <SelectValue placeholder="Sort" />
              </span>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest first</SelectItem>
              <SelectItem value="oldest">Oldest first</SelectItem>
              <SelectItem value="unread">Unread first</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Bulk action bar */}
        <AnimatePresence>
          {selected.size > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="sticky top-16 z-10 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-primary/30 bg-card/95 p-3 shadow-md backdrop-blur-md sm:p-4"
            >
              <div className="flex items-center gap-3">
                <Badge variant="successSoft" size="lg" className="tabular-nums">
                  {selected.size} selected
                </Badge>
                <button
                  type="button"
                  onClick={() => selectAllVisible(!allVisibleSelected)}
                  className="text-xs font-semibold text-primary hover:underline underline-offset-4"
                >
                  {allVisibleSelected
                    ? 'Deselect all visible'
                    : 'Select all visible'}
                </button>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={handleBulkMarkRead}
                  leadingIcon={<Check className="size-3.5" />}
                >
                  Mark read
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={handleBulkDelete}
                  leadingIcon={<Trash2 className="size-3.5" />}
                  className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                >
                  Delete
                </Button>
                <Button
                  type="button"
                  size="icon-sm"
                  variant="ghost"
                  onClick={() => setSelected(new Set())}
                  aria-label="Clear selection"
                >
                  <X className="size-3.5" aria-hidden="true" />
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* List */}
        <Card variant="default" density="compact">
          <CardContent className="space-y-6 px-3 sm:px-4">
            <AnimatePresence mode="wait">
              <motion.div
                key={`${tab}-${search}-${sort}`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                className="space-y-6"
              >
                {filtered.length === 0 ? (
                  <EmptyState
                    icon={
                      tab === 'unread' ? (
                        <Sparkles className="size-5" aria-hidden="true" />
                      ) : (
                        <InboxIcon className="size-5" aria-hidden="true" />
                      )
                    }
                    title={
                      search
                        ? 'No matches'
                        : tab === 'unread'
                          ? 'You’re all caught up'
                          : 'Nothing here yet'
                    }
                    description={
                      search
                        ? 'Try a different search term, or switch to another tab.'
                        : tab === 'unread'
                          ? 'No unread notifications. Nice.'
                          : 'When something happens, it will land here.'
                    }
                  />
                ) : (
                  grouped.map((group) => (
                    <section
                      key={group.bucket}
                      aria-labelledby={`bucket-${group.bucket}`}
                      className="space-y-2"
                    >
                      <div className="flex items-center gap-2 px-1">
                        <h2
                          id={`bucket-${group.bucket}`}
                          className="text-xs font-bold uppercase tracking-widest text-muted-foreground"
                        >
                          {group.label}
                        </h2>
                        <span
                          aria-hidden="true"
                          className="h-px flex-1 bg-border"
                        />
                        <Badge variant="soft" size="sm" className="tabular-nums">
                          {group.items.length}
                        </Badge>
                      </div>
                      <ul role="list" className="space-y-2">
                        <AnimatePresence initial={false}>
                          {group.items.map((it) => (
                            <NotificationRow
                              key={it.id}
                              item={it}
                              selected={selected.has(it.id)}
                              onSelect={toggleSelect}
                              onMarkRead={(id) => markRead([id])}
                              onDelete={(id) => {
                                removeMany([id]);
                                toast.success('Notification deleted');
                              }}
                            />
                          ))}
                        </AnimatePresence>
                      </ul>
                    </section>
                  ))
                )}
              </motion.div>
            </AnimatePresence>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
