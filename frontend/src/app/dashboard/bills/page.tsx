'use client';

import * as React from 'react';
import { useMemo, useState } from 'react';
import {
  AlertCircle,
  CalendarPlus,
  Clock,
  Filter,
  Layers,
  Receipt,
  Search,
  ShieldCheck,
  Sparkles,
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
import { motion, AnimatePresence } from '@/components/ui/motion';
import { BillsHero } from '@/components/bills/BillsHero';
import { BillCard } from '@/components/bills/BillCard';
import type { BillItem } from '@/components/bills/types';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export const dynamic = 'force-dynamic';

type TabValue = 'outstanding' | 'paid' | 'mine' | 'all';

interface TabMeta {
  value: TabValue;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
}

const TABS: TabMeta[] = [
  {
    value: 'outstanding',
    label: 'Outstanding',
    icon: AlertCircle,
    description: 'Bills you still need to pay across your circles.',
  },
  {
    value: 'paid',
    label: 'Paid',
    icon: ShieldCheck,
    description: 'Bills you’ve already settled — receipts archived here.',
  },
  {
    value: 'mine',
    label: 'Created by me',
    icon: ShieldCheck,
    description: 'Bills you set up as a treasurer or admin.',
  },
  {
    value: 'all',
    label: 'All',
    icon: Layers,
    description: 'Every bill from every community you’re in.',
  },
];

// Realistic mock bills relative to "now" so the date buckets stay current.
const today = new Date();
const isoDay = (offset: number) => {
  const d = new Date(today);
  d.setDate(d.getDate() + offset);
  d.setHours(23, 59, 0, 0);
  return d.toISOString();
};
const fmt = (n: number) => n.toLocaleString('en-NG');

const MOCK_BILLS: BillItem[] = [
  {
    id: 'b1',
    title: 'Estate dues — April',
    description: 'Monthly maintenance contribution',
    community: { id: '1', name: 'Lekki Block 3 HOA', initials: 'LB' },
    amount: 18_500,
    amountFormatted: fmt(18_500),
    dueAt: isoDay(-2),
    status: 'overdue',
    createdBy: { name: 'Mr. Bello', isYou: false },
    members: { paid: 28, total: 36 },
    category: 'Estate dues',
    isRecurring: true,
  },
  {
    id: 'b2',
    title: 'Marathon registration',
    description: 'Lagos Half Marathon — 14 Jun',
    community: { id: '2', name: 'Lekki Runners', initials: 'LR' },
    amount: 12_500,
    amountFormatted: fmt(12_500),
    dueAt: isoDay(3),
    status: 'pending',
    createdBy: { name: 'Kunle Adeyemi', isYou: false },
    members: { paid: 184, total: 300 },
    category: 'Event ticket',
  },
  {
    id: 'b3',
    title: 'Co-op contribution #14',
    description: 'May rotation',
    community: { id: '3', name: 'Trinity Co-op', initials: 'TC' },
    amount: 8_000,
    amountFormatted: fmt(8_000),
    dueAt: isoDay(7),
    status: 'pending',
    createdBy: { name: 'You', isYou: true },
    members: { paid: 18, total: 24 },
    category: 'Co-op contribution',
    isRecurring: true,
  },
  {
    id: 'b4',
    title: 'Tithe — May',
    community: { id: '4', name: 'Grace Assembly', initials: 'GA' },
    amount: 25_000,
    amountFormatted: fmt(25_000),
    dueAt: isoDay(14),
    status: 'pending',
    createdBy: { name: 'Pastor Bisi', isYou: false },
    members: { paid: 240, total: 540 },
    category: 'Faith',
    isRecurring: true,
  },
  {
    id: 'b5',
    title: 'Estate maintenance · pothole repair',
    description: '3 vendor invoices to settle',
    community: { id: '1', name: 'Lekki Block 3 HOA', initials: 'LB' },
    amount: 145_000,
    amountFormatted: fmt(145_000),
    dueAt: isoDay(5),
    status: 'pending',
    createdBy: { name: 'You', isYou: true },
    members: { paid: 0, total: 1 },
    category: 'Estate dues',
  },
  // Paid history
  {
    id: 'b6',
    title: 'Estate dues — March',
    community: { id: '1', name: 'Lekki Block 3 HOA', initials: 'LB' },
    amount: 18_500,
    amountFormatted: fmt(18_500),
    dueAt: isoDay(-32),
    status: 'paid',
    createdBy: { name: 'Mr. Bello', isYou: false },
    members: { paid: 36, total: 36 },
    category: 'Estate dues',
    paidAt: isoDay(-31),
    paidVia: 'Bell MFB ·· 8421',
    isRecurring: true,
  },
  {
    id: 'b7',
    title: 'AGM venue contribution',
    community: { id: '1', name: 'Lekki Block 3 HOA', initials: 'LB' },
    amount: 5_000,
    amountFormatted: fmt(5_000),
    dueAt: isoDay(-12),
    status: 'paid',
    createdBy: { name: 'Mr. Bello', isYou: false },
    members: { paid: 36, total: 36 },
    category: 'Estate dues',
    paidAt: isoDay(-12),
    paidVia: 'GTBank ·· 5871',
  },
  {
    id: 'b8',
    title: 'Tech meetup ticket',
    community: { id: '5', name: 'Lagos Devs', initials: 'LD' },
    amount: 0,
    amountFormatted: '0 (Free)',
    dueAt: isoDay(-8),
    status: 'paid',
    createdBy: { name: 'You', isYou: true },
    members: { paid: 218, total: 250 },
    category: 'Event ticket',
    paidAt: isoDay(-8),
    paidVia: 'CCPay wallet',
  },
  {
    id: 'b9',
    title: 'Co-op contribution #13',
    community: { id: '3', name: 'Trinity Co-op', initials: 'TC' },
    amount: 8_000,
    amountFormatted: fmt(8_000),
    dueAt: isoDay(-22),
    status: 'paid',
    createdBy: { name: 'You', isYou: true },
    members: { paid: 24, total: 24 },
    category: 'Co-op contribution',
    paidAt: isoDay(-22),
    paidVia: 'Bell MFB ·· 8421',
    isRecurring: true,
  },
];

type Bucket = 'overdue' | 'this-week' | 'later' | 'paid';

const BUCKET_ORDER: Bucket[] = ['overdue', 'this-week', 'later', 'paid'];

const BUCKET_LABEL: Record<Bucket, string> = {
  overdue: 'Overdue',
  'this-week': 'Due this week',
  later: 'Due later',
  paid: 'Recently paid',
};

function bucketOf(b: BillItem): Bucket {
  if (b.status === 'paid' || b.status === 'cancelled') return 'paid';
  if (b.status === 'overdue') return 'overdue';
  const due = new Date(b.dueAt);
  const now = new Date();
  const startOfDay = (date: Date) => {
    const c = new Date(date);
    c.setHours(0, 0, 0, 0);
    return c;
  };
  const dayDiff = Math.round(
    (startOfDay(due).getTime() - startOfDay(now).getTime()) /
      (1000 * 60 * 60 * 24)
  );
  if (dayDiff <= 7) return 'this-week';
  return 'later';
}

export default function BillsPage() {
  const [bills, setBills] = useState<BillItem[]>(MOCK_BILLS);
  const [activeTab, setActiveTab] = useState<TabValue>('outstanding');
  const [search, setSearch] = useState('');
  const [communityFilter, setCommunityFilter] = useState<string>('all');
  const [sort, setSort] = useState<'soonest' | 'amount' | 'oldest'>('soonest');

  const stats = useMemo(() => {
    const outstanding = bills.filter(
      (b) => b.status === 'pending' || b.status === 'overdue'
    );
    const totalOutstanding = outstanding.reduce((s, b) => s + b.amount, 0);
    const overdueCount = bills.filter((b) => b.status === 'overdue').length;
    const soonest = outstanding
      .map((b) => new Date(b.dueAt).getTime())
      .sort((a, b) => a - b)[0];
    const daysUntilNext = soonest
      ? Math.round((soonest - Date.now()) / (1000 * 60 * 60 * 24))
      : null;
    const settledThisMonth = bills.filter((b) => {
      if (b.status !== 'paid' || !b.paidAt) return false;
      const paid = new Date(b.paidAt);
      const now = new Date();
      return (
        paid.getMonth() === now.getMonth() &&
        paid.getFullYear() === now.getFullYear()
      );
    }).length;
    return {
      totalOutstanding,
      overdueCount,
      daysUntilNext,
      settledThisMonth,
    };
  }, [bills]);

  const counts = useMemo<Record<TabValue, number>>(() => {
    return {
      outstanding: bills.filter(
        (b) => b.status === 'pending' || b.status === 'overdue'
      ).length,
      paid: bills.filter((b) => b.status === 'paid').length,
      mine: bills.filter((b) => b.createdBy.isYou).length,
      all: bills.length,
    };
  }, [bills]);

  const communities = useMemo(() => {
    const seen = new Map<string, string>();
    for (const b of bills) {
      seen.set(b.community.id, b.community.name);
    }
    return Array.from(seen.entries()).map(([id, name]) => ({ id, name }));
  }, [bills]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return bills
      .filter((b) => {
        switch (activeTab) {
          case 'outstanding':
            return b.status === 'pending' || b.status === 'overdue';
          case 'paid':
            return b.status === 'paid';
          case 'mine':
            return b.createdBy.isYou;
          case 'all':
            return true;
        }
      })
      .filter((b) =>
        communityFilter === 'all' ? true : b.community.id === communityFilter
      )
      .filter((b) => {
        if (!q) return true;
        return (
          b.title.toLowerCase().includes(q) ||
          b.community.name.toLowerCase().includes(q) ||
          b.category.toLowerCase().includes(q) ||
          (b.description?.toLowerCase().includes(q) ?? false)
        );
      })
      .sort((a, b) => {
        if (sort === 'amount') return b.amount - a.amount;
        const aT = new Date(a.dueAt).getTime();
        const bT = new Date(b.dueAt).getTime();
        return sort === 'soonest' ? aT - bT : bT - aT;
      });
  }, [bills, activeTab, search, communityFilter, sort]);

  const grouped = useMemo(() => {
    const map = new Map<Bucket, BillItem[]>();
    for (const b of filtered) {
      const k = bucketOf(b);
      const list = map.get(k) ?? [];
      list.push(b);
      map.set(k, list);
    }
    return BUCKET_ORDER.filter((b) => map.has(b)).map((b) => ({
      bucket: b,
      label: BUCKET_LABEL[b],
      items: map.get(b) ?? [],
    }));
  }, [filtered]);

  const handlePay = (id: string) => {
    setBills((prev) =>
      prev.map((b) =>
        b.id === id
          ? {
              ...b,
              status: 'paid',
              paidAt: new Date().toISOString(),
              paidVia: 'CCPay wallet',
              members: {
                paid: Math.min(b.members.paid + 1, b.members.total),
                total: b.members.total,
              },
            }
          : b
      )
    );
    const bill = bills.find((b) => b.id === id);
    toast.success(`Paid ${bill?.title}`, {
      description: bill ? `₦${bill.amountFormatted} settled` : undefined,
    });
  };

  const handleSettleAll = () => {
    const ids = bills
      .filter((b) => b.status === 'pending' || b.status === 'overdue')
      .map((b) => b.id);
    if (ids.length === 0) return;
    setBills((prev) =>
      prev.map((b) =>
        ids.includes(b.id)
          ? {
              ...b,
              status: 'paid',
              paidAt: new Date().toISOString(),
              paidVia: 'CCPay wallet',
            }
          : b
      )
    );
    toast.success(`Settled ${ids.length} bills`);
  };

  return (
    <DashboardLayout pageTitle="Bills">
      <div className="space-y-6">
        <BillsHero stats={stats} onSettleAll={handleSettleAll} />

        {/* Tabs */}
        <div
          role="tablist"
          aria-label="Bill sections"
          className="-mx-1 overflow-x-auto px-1"
        >
          <div className="inline-flex items-center gap-1 rounded-full border border-border bg-card p-1 shadow-xs">
            {TABS.map((t) => {
              const isActive = activeTab === t.value;
              const Icon = t.icon;
              const count = counts[t.value];
              return (
                <button
                  key={t.value}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => setActiveTab(t.value)}
                  className={cn(
                    'relative inline-flex items-center gap-2 whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition-colors',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    isActive
                      ? 'text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  {isActive && (
                    <motion.span
                      layoutId="bills-tab-pill"
                      className="absolute inset-0 -z-10 rounded-full bg-primary shadow-sm"
                      transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                    />
                  )}
                  <Icon className="size-4" aria-hidden="true" />
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

        <p className="-mt-2 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
          <Sparkles className="size-3" aria-hidden="true" />
          {TABS.find((t) => t.value === activeTab)?.description}
        </p>

        {/* Filters row */}
        <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-3 shadow-xs sm:flex-row sm:items-center sm:p-4">
          <div className="relative flex-1">
            <Search
              className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search bills by title, category, or community…"
              className="h-11 rounded-xl pl-11"
              aria-label="Search bills"
            />
          </div>
          <div className="flex items-center gap-2">
            <Select
              value={communityFilter}
              onValueChange={setCommunityFilter}
            >
              <SelectTrigger
                className="h-11 w-full rounded-xl px-3 sm:w-52"
                aria-label="Filter by community"
              >
                <span className="inline-flex items-center gap-2">
                  <Layers
                    className="size-4 text-muted-foreground"
                    aria-hidden="true"
                  />
                  <SelectValue placeholder="All communities" />
                </span>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All communities</SelectItem>
                {communities.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={sort} onValueChange={(v) => setSort(v as typeof sort)}>
              <SelectTrigger
                className="h-11 w-full rounded-xl px-3 sm:w-44"
                aria-label="Sort bills"
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
                <SelectItem value="soonest">Soonest first</SelectItem>
                <SelectItem value="amount">Highest amount</SelectItem>
                <SelectItem value="oldest">Oldest first</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* List */}
        <AnimatePresence mode="wait">
          <motion.div
            key={`${activeTab}-${search}-${communityFilter}-${sort}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="space-y-7"
          >
            {filtered.length === 0 ? (
              <EmptyState
                icon={<Receipt className="size-5" aria-hidden="true" />}
                title={
                  search || communityFilter !== 'all'
                    ? 'No matches'
                    : activeTab === 'outstanding'
                      ? "You're all paid up"
                      : activeTab === 'paid'
                        ? 'No paid bills yet'
                        : activeTab === 'mine'
                          ? "You haven't created any bills"
                          : 'No bills yet'
                }
                description={
                  search || communityFilter !== 'all'
                    ? 'Try a different search or community filter.'
                    : activeTab === 'outstanding'
                      ? 'No outstanding bills across your circles. Treat yourself.'
                      : activeTab === 'mine'
                        ? 'As a treasurer or admin, you can create bills inside any community.'
                        : 'Bills from your communities will land here.'
                }
                action={
                  activeTab === 'mine' ? (
                    <Button asChild leadingIcon={<CalendarPlus className="size-4" />}>
                      <a href="/dashboard/community">Go to a community</a>
                    </Button>
                  ) : undefined
                }
              />
            ) : (
              grouped.map((group) => (
                <section
                  key={group.bucket}
                  aria-labelledby={`bucket-${group.bucket}`}
                  className="space-y-3"
                >
                  <div className="flex items-center gap-2">
                    <h2
                      id={`bucket-${group.bucket}`}
                      className={cn(
                        'text-xs font-bold uppercase tracking-widest',
                        group.bucket === 'overdue'
                          ? 'text-destructive'
                          : group.bucket === 'paid'
                            ? 'text-success'
                            : 'text-muted-foreground'
                      )}
                    >
                      {group.label}
                    </h2>
                    <span aria-hidden="true" className="h-px flex-1 bg-border" />
                    <Badge
                      variant={
                        group.bucket === 'overdue'
                          ? 'destructiveSoft'
                          : group.bucket === 'paid'
                            ? 'successSoft'
                            : 'soft'
                      }
                      size="sm"
                      className="tabular-nums"
                    >
                      {group.items.length}
                    </Badge>
                  </div>
                  <ul role="list" className="space-y-3">
                    <AnimatePresence initial={false}>
                      {group.items.map((b) => (
                        <li key={b.id}>
                          <BillCard bill={b} onPay={handlePay} />
                        </li>
                      ))}
                    </AnimatePresence>
                  </ul>
                </section>
              ))
            )}
          </motion.div>
        </AnimatePresence>

        {/* Bottom helper card */}
        <Card variant="outline" density="compact" className="border-dashed">
          <CardContent className="flex flex-col items-start gap-3 px-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <span
                className="grid size-9 shrink-0 place-items-center rounded-xl bg-info/15 text-info"
                aria-hidden="true"
              >
                <Wallet className="size-4" />
              </span>
              <div>
                <p className="text-sm font-semibold tracking-tight text-foreground">
                  Want bills to pay themselves?
                </p>
                <p className="text-xs text-muted-foreground">
                  Set up a standing instruction so recurring dues come out
                  automatically.
                </p>
              </div>
            </div>
            <Button asChild type="button" size="sm" variant="outline">
              <a href="/dashboard/settings?tab=standing-instructions">
                Set up auto-pay
              </a>
            </Button>
          </CardContent>
        </Card>

        {/* Time-of-day reminder */}
        <p className="text-center text-[11px] text-muted-foreground">
          <Clock className="mr-1 inline-block size-3" aria-hidden="true" />
          We send a reminder 3 days before each bill is due, and again 12 hours before.
        </p>
      </div>
    </DashboardLayout>
  );
}
