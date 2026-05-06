'use client';

import * as React from 'react';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ApiService, type BookmarkApi } from '@/services/api';
import { useDemoData } from '@/lib/demo-mode';
import {
  ArrowRight,
  Bookmark,
  BookmarkX,
  Calendar,
  Layers,
  MessageCircle,
  Receipt,
  Search,
  Sparkles,
  Trash2,
  User,
  Users,
  Wallet,
} from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
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
import {
  motion,
  AnimatePresence,
  FadeIn,
  SlideUp,
} from '@/components/ui/motion';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export const dynamic = 'force-dynamic';

type SavedKind = 'post' | 'event' | 'community' | 'bill' | 'transaction' | 'member';

interface SavedItem {
  id: string;
  kind: SavedKind;
  title: string;
  description: string;
  source: string;
  /** Where the saved item lives (where Open routes to). */
  href: string;
  /** ISO when the user saved it. */
  savedAt: string;
  /** Optional money attached (for bills, transactions). */
  amount?: string;
  /** Optional community context. */
  community?: { id: string; name: string };
}

const KIND_CONFIG: Record<
  SavedKind,
  {
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    tone: string;
  }
> = {
  post: {
    label: 'Post',
    icon: MessageCircle,
    tone: 'bg-brand-soft text-accent-foreground',
  },
  event: {
    label: 'Event',
    icon: Calendar,
    tone: 'bg-info/15 text-info',
  },
  community: {
    label: 'Community',
    icon: Users,
    tone: 'bg-success/15 text-success',
  },
  member: {
    label: 'Member',
    icon: User,
    tone: 'bg-brand-soft text-accent-foreground',
  },
  bill: {
    label: 'Bill',
    icon: Receipt,
    tone: 'bg-warning/15 text-warning',
  },
  transaction: {
    label: 'Transaction',
    icon: Wallet,
    tone: 'bg-foreground/10 text-foreground',
  },
};

const today = new Date();
const daysAgo = (d: number) =>
  new Date(today.getTime() - d * 86_400_000).toISOString();

const MOCK: SavedItem[] = [
  {
    id: 's1',
    kind: 'post',
    title: 'Week 4 reading list — DeFi basics',
    description:
      'Adaeze: "Sharing the curriculum we’ve been using to onboard new members. Bookmark this if you want to catch up."',
    source: 'Cryptos NG',
    href: '/dashboard',
    savedAt: daysAgo(0),
    community: { id: '6', name: 'Cryptos NG' },
  },
  {
    id: 's2',
    kind: 'event',
    title: 'Tech meetup 2026',
    description: 'Sat 28 Jun · Co-Creation Hub · 218/250 going · Free',
    source: 'Lagos Devs',
    href: '/dashboard/events/5',
    savedAt: daysAgo(1),
    community: { id: '5', name: 'Lagos Devs' },
  },
  {
    id: 's3',
    kind: 'community',
    title: 'Designers Network · Africa',
    description: '2,140 designers · UI/UX, brand, motion. Discussions, jobs, weekly critique.',
    source: 'Discover',
    href: '/dashboard/community/7',
    savedAt: daysAgo(2),
  },
  {
    id: 's4',
    kind: 'bill',
    title: 'Co-op contribution #14',
    description: 'May rotation · ₦8,000',
    source: 'Trinity Co-op',
    href: '/dashboard/community/3/bill/b3',
    savedAt: daysAgo(3),
    amount: '8,000',
    community: { id: '3', name: 'Trinity Co-op' },
  },
  {
    id: 's5',
    kind: 'transaction',
    title: 'Top-up · Bell MFB',
    description: 'Saved as a reference for tax filing',
    source: 'Wallet',
    href: '/dashboard/activity',
    savedAt: daysAgo(4),
    amount: '40,000',
  },
  {
    id: 's6',
    kind: 'event',
    title: 'Faith finance Q&A',
    description: 'Tue 30 Jun · Online · 540/1000 going',
    source: 'Grace Assembly',
    href: '/dashboard/events/6',
    savedAt: daysAgo(6),
    community: { id: '4', name: 'Grace Assembly' },
  },
  {
    id: 's7',
    kind: 'post',
    title: 'Treasurer playbook · how we ran AGM remotely',
    description:
      'Pastor Bisi shared a step-by-step doc on running a transparent AGM with CCPay. 124 reactions, 38 comments.',
    source: 'Grace Assembly',
    href: '/dashboard',
    savedAt: daysAgo(9),
    community: { id: '4', name: 'Grace Assembly' },
  },
  {
    id: 's8',
    kind: 'community',
    title: 'Lekki Runners',
    description: '1,180 runners · weekly long runs · marathon training plans',
    source: 'Discover',
    href: '/dashboard/community/2',
    savedAt: daysAgo(20),
  },
];

type TabValue = 'all' | SavedKind;

const TABS: Array<{
  value: TabValue;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { value: 'all', label: 'All', icon: Layers },
  { value: 'post', label: 'Posts', icon: MessageCircle },
  { value: 'event', label: 'Events', icon: Calendar },
  { value: 'community', label: 'Communities', icon: Users },
  { value: 'member', label: 'Members', icon: User },
  { value: 'bill', label: 'Bills', icon: Receipt },
  { value: 'transaction', label: 'Transactions', icon: Wallet },
];

function relativeSaved(iso: string): string {
  const days = Math.round((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days < 1) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.round(days / 7)}w ago`;
  return `${Math.round(days / 30)}mo ago`;
}

const SRV_PREFIX = 'srv-';
const isServerId = (id: string) => id.startsWith(SRV_PREFIX);
const serverIdNum = (id: string) => Number(id.slice(SRV_PREFIX.length));

function mapApiBookmark(b: BookmarkApi): SavedItem {
  return {
    id: `${SRV_PREFIX}${b.id}`,
    kind: b.kind,
    title: b.title,
    description: b.description,
    source: b.source,
    href: b.href || '#',
    savedAt: b.savedAt || b.created_at,
    amount: b.amount ?? undefined,
    community: b.community ?? undefined,
  };
}

export default function SavedPage() {
  const [items, setItems] = useState<SavedItem[]>([]);
  const [usingMock, setUsingMock] = useState(false);
  const [tab, setTab] = useState<TabValue>('all');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<'newest' | 'oldest'>('newest');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await ApiService.bookmarks.list({ limit: 100 });
        const list = res.data?.data?.bookmarks ?? [];
        if (cancelled) return;
        if (list.length === 0) {
          setItems(useDemoData() ? MOCK : []);
          setUsingMock(useDemoData());
        } else {
          setItems(list.map(mapApiBookmark));
          setUsingMock(false);
        }
      } catch {
        if (!cancelled) {
          setItems(useDemoData() ? MOCK : []);
          setUsingMock(useDemoData());
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const counts = useMemo<Record<TabValue, number>>(
    () => ({
      all: items.length,
      post: items.filter((i) => i.kind === 'post').length,
      event: items.filter((i) => i.kind === 'event').length,
      community: items.filter((i) => i.kind === 'community').length,
      member: items.filter((i) => i.kind === 'member').length,
      bill: items.filter((i) => i.kind === 'bill').length,
      transaction: items.filter((i) => i.kind === 'transaction').length,
    }),
    [items]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items
      .filter((i) => (tab === 'all' ? true : i.kind === tab))
      .filter((i) => {
        if (!q) return true;
        return (
          i.title.toLowerCase().includes(q) ||
          i.description.toLowerCase().includes(q) ||
          i.source.toLowerCase().includes(q) ||
          (i.community?.name.toLowerCase().includes(q) ?? false)
        );
      })
      .sort((a, b) => {
        const cmp =
          new Date(a.savedAt).getTime() - new Date(b.savedAt).getTime();
        return sort === 'newest' ? -cmp : cmp;
      });
  }, [items, tab, search, sort]);

  const remove = (id: string) => {
    const item = items.find((i) => i.id === id);
    setItems((prev) => prev.filter((i) => i.id !== id));
    if (!usingMock && isServerId(id)) {
      ApiService.bookmarks.delete(serverIdNum(id)).catch(() => {});
    }
    toast.success(`Removed "${item?.title}"`);
  };

  const clearAll = () => {
    if (filtered.length === 0) return;
    const filteredIds = new Set(filtered.map((f) => f.id));
    setItems((prev) => prev.filter((i) => !filteredIds.has(i.id)));
    if (!usingMock) {
      for (const id of filteredIds) {
        if (isServerId(id)) {
          ApiService.bookmarks.delete(serverIdNum(id)).catch(() => {});
        }
      }
    }
    toast.success(`Removed ${filtered.length} bookmarks`);
  };

  return (
    <DashboardLayout pageTitle="Saved">
      <div className="space-y-6">
        {/* Hero */}
        <section
          aria-labelledby="saved-hero-heading"
          className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-card to-brand-soft/30 p-6 shadow-xs sm:p-8"
        >
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-24 -right-24 h-64 w-64 rounded-full bg-brand/15 blur-3xl"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-32 -left-16 h-56 w-56 rounded-full bg-info/10 blur-3xl"
          />

          <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <FadeIn>
              <div>
                <Badge variant="soft" size="lg" className="gap-1.5">
                  <Bookmark className="size-3" aria-hidden="true" />
                  Saved
                </Badge>
                <h1
                  id="saved-hero-heading"
                  className="mt-3 text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl"
                >
                  <span className="bg-gradient-to-br from-brand to-brand-bright bg-clip-text text-transparent">
                    {items.length}
                  </span>{' '}
                  bookmarks across the app.
                </h1>
                <p className="mt-1.5 max-w-xl text-sm text-muted-foreground">
                  <Sparkles
                    className="mr-1 inline-block size-3"
                    aria-hidden="true"
                  />
                  Posts, events, communities, bills, and transactions you tagged
                  for later.
                </p>
              </div>
            </FadeIn>

            <SlideUp delay={0.05}>
              <Button
                type="button"
                size="default"
                variant="outline"
                disabled={filtered.length === 0}
                onClick={clearAll}
                leadingIcon={<BookmarkX className="size-4" />}
              >
                Clear visible
              </Button>
            </SlideUp>
          </div>

          <SlideUp delay={0.1}>
            <dl className="relative mt-6 grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-5">
              {(Object.keys(KIND_CONFIG) as SavedKind[]).map((k) => {
                const cfg = KIND_CONFIG[k];
                return (
                  <div
                    key={k}
                    className="flex items-center gap-3 rounded-2xl border border-border bg-card/80 p-3.5 backdrop-blur-sm"
                  >
                    <span
                      className={cn(
                        'grid size-9 shrink-0 place-items-center rounded-xl',
                        cfg.tone
                      )}
                      aria-hidden="true"
                    >
                      <cfg.icon className="size-4" />
                    </span>
                    <div className="min-w-0">
                      <dt className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                        {cfg.label}s
                      </dt>
                      <dd className="text-lg font-extrabold tabular-nums tracking-tight text-foreground sm:text-xl">
                        {counts[k] ?? 0}
                      </dd>
                    </div>
                  </div>
                );
              })}
            </dl>
          </SlideUp>
        </section>

        {/* Tabs */}
        <div role="tablist" aria-label="Saved sections" className="-mx-1 overflow-x-auto px-1">
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
                      layoutId="saved-tab-pill"
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
              placeholder="Search bookmarks…"
              className="h-11 rounded-xl pl-11"
              aria-label="Search saved items"
            />
          </div>
          <Select
            value={sort}
            onValueChange={(v) => setSort(v as 'newest' | 'oldest')}
          >
            <SelectTrigger
              className="h-11 w-full rounded-xl px-3 sm:w-44"
              aria-label="Sort saved items"
            >
              <SelectValue placeholder="Sort" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Recently saved</SelectItem>
              <SelectItem value="oldest">Oldest first</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* List */}
        <AnimatePresence mode="wait">
          <motion.div
            key={`${tab}-${search}-${sort}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="space-y-3"
          >
            {filtered.length === 0 ? (
              <EmptyState
                icon={<Bookmark className="size-5" aria-hidden="true" />}
                title={search ? 'No matches' : 'Nothing saved yet'}
                description={
                  search
                    ? 'Try a different search.'
                    : 'Tap the bookmark icon on any post, event, or community to save it for later.'
                }
              />
            ) : (
              <ul role="list" className="space-y-2">
                <AnimatePresence initial={false}>
                  {filtered.map((it) => {
                    const cfg = KIND_CONFIG[it.kind];
                    const Icon = cfg.icon;
                    return (
                      <motion.li
                        key={it.id}
                        layout
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: 24 }}
                        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                      >
                        <Card variant="default" className="group/item">
                          <CardContent className="flex items-start gap-3 px-4 sm:px-5">
                            <span
                              className={cn(
                                'grid size-10 shrink-0 place-items-center rounded-xl',
                                cfg.tone
                              )}
                              aria-hidden="true"
                            >
                              <Icon className="size-5" />
                            </span>

                            <div className="min-w-0 flex-1">
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0 flex-1">
                                  <Link
                                    href={it.href}
                                    className="truncate text-sm font-bold tracking-tight text-foreground hover:text-primary hover:underline underline-offset-4"
                                  >
                                    {it.title}
                                  </Link>
                                  <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                                    {it.description}
                                  </p>
                                </div>
                                {it.amount && (
                                  <span className="shrink-0 text-sm font-bold tabular-nums text-foreground">
                                    ₦{it.amount}
                                  </span>
                                )}
                              </div>

                              <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                                <Badge variant="soft" size="sm">
                                  {cfg.label}
                                </Badge>
                                <span>{it.source}</span>
                                <span aria-hidden="true">·</span>
                                <span>Saved {relativeSaved(it.savedAt)}</span>
                              </div>
                            </div>

                            <div
                              className={cn(
                                'flex shrink-0 items-center gap-1 self-center opacity-0 transition-opacity',
                                'group-hover/item:opacity-100 focus-within:opacity-100'
                              )}
                            >
                              <Button
                                asChild
                                type="button"
                                size="sm"
                                variant="outline"
                              >
                                <Link
                                  href={it.href}
                                  className="inline-flex items-center gap-1.5"
                                >
                                  Open
                                  <ArrowRight
                                    className="size-3.5"
                                    aria-hidden="true"
                                  />
                                </Link>
                              </Button>
                              <Button
                                type="button"
                                size="icon-sm"
                                variant="ghost"
                                aria-label={`Remove ${it.title} from bookmarks`}
                                onClick={() => remove(it.id)}
                              >
                                <Trash2
                                  className="size-3.5"
                                  aria-hidden="true"
                                />
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.li>
                    );
                  })}
                </AnimatePresence>
              </ul>
            )}
          </motion.div>
        </AnimatePresence>

        <p className="text-center text-[11px] text-muted-foreground">
          <Bookmark className="mr-1 inline-block size-3" aria-hidden="true" />
          Bookmarks are private to you and never shared with the community.
        </p>
      </div>
    </DashboardLayout>
  );
}
