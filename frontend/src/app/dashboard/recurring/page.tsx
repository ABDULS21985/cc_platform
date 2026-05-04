'use client';

import * as React from 'react';
import { useEffect, useMemo, useState } from 'react';
import {
  Calendar,
  CheckCircle2,
  Clock,
  Filter,
  Layers,
  MoreHorizontal,
  PauseCircle,
  PlayCircle,
  Plus,
  Repeat,
  Search,
  Sparkles,
  TrendingUp,
  Trash2,
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
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { motion, AnimatePresence } from '@/components/ui/motion';
import { FadeIn, SlideUp } from '@/components/ui/motion';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { ApiService, type CommunityData } from '@/services/api';

export const dynamic = 'force-dynamic';

type RecurringStatus = 'active' | 'paused' | 'cancelled';
type Frequency = 'weekly' | 'monthly' | 'quarterly' | 'yearly';

interface RecurringRule {
  id: string;
  title: string;
  description?: string;
  amount: number;
  amountFormatted: string;
  frequency: Frequency;
  /** ISO timestamp for the next scheduled run. */
  nextRunAt: string;
  /** ISO timestamp for the last successful run. */
  lastRunAt?: string;
  source: string;
  recipient: { name: string; bank?: string; tail?: string };
  community?: { id: string; name: string };
  status: RecurringStatus;
  /** How many times this has fired. */
  ranCount: number;
  isHosting?: boolean;
}

const fmt = (n: number) => n.toLocaleString('en-NG');
const today = new Date();
const isoIn = (days: number) => {
  const d = new Date(today);
  d.setDate(d.getDate() + days);
  d.setHours(8, 0, 0, 0);
  return d.toISOString();
};
const isoAgo = (days: number) => isoIn(-days);

const FREQUENCY_LABEL: Record<Frequency, string> = {
  weekly: 'Weekly',
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  yearly: 'Yearly',
};

const MOCK: RecurringRule[] = [
  {
    id: 'r1',
    title: 'Lekki Block 3 dues',
    description: 'Estate maintenance — auto-debit',
    amount: 18_500,
    amountFormatted: fmt(18_500),
    frequency: 'monthly',
    nextRunAt: isoIn(3),
    lastRunAt: isoAgo(27),
    source: 'Bell MFB ·· 8421',
    recipient: { name: 'Lekki Block 3 HOA', bank: 'Bell MFB', tail: '2245' },
    community: { id: '1', name: 'Lekki Block 3 HOA' },
    status: 'active',
    ranCount: 8,
  },
  {
    id: 'r2',
    title: 'Trinity Co-op contribution',
    description: 'Monthly co-op rotation #14 onwards',
    amount: 8_000,
    amountFormatted: fmt(8_000),
    frequency: 'monthly',
    nextRunAt: isoIn(7),
    lastRunAt: isoAgo(23),
    source: 'CCPay wallet',
    recipient: { name: 'Trinity Co-op', bank: 'SafeHaven', tail: '0418' },
    community: { id: '3', name: 'Trinity Co-op' },
    status: 'active',
    ranCount: 13,
    isHosting: true,
  },
  {
    id: 'r3',
    title: 'Sunday tithe',
    description: 'Standing instruction · Grace Assembly',
    amount: 25_000,
    amountFormatted: fmt(25_000),
    frequency: 'weekly',
    nextRunAt: isoIn(4),
    lastRunAt: isoAgo(3),
    source: 'CCPay wallet',
    recipient: { name: 'Grace Assembly', bank: 'GTBank', tail: '4429' },
    community: { id: '4', name: 'Grace Assembly' },
    status: 'active',
    ranCount: 32,
  },
  {
    id: 'r4',
    title: 'Marathon training fund',
    description: 'Quarterly contribution to vendor pool',
    amount: 15_000,
    amountFormatted: fmt(15_000),
    frequency: 'quarterly',
    nextRunAt: isoIn(45),
    lastRunAt: isoAgo(45),
    source: 'CCPay wallet',
    recipient: { name: 'Lekki Runners', bank: 'Bell MFB', tail: '1188' },
    community: { id: '2', name: 'Lekki Runners' },
    status: 'paused',
    ranCount: 3,
  },
  {
    id: 'r5',
    title: 'Domain renewal',
    description: 'Card auto-charge',
    amount: 8_000,
    amountFormatted: fmt(8_000),
    frequency: 'yearly',
    nextRunAt: isoIn(330),
    lastRunAt: isoAgo(35),
    source: 'Visa ·· 3344',
    recipient: { name: 'CCPay services' },
    status: 'active',
    ranCount: 1,
  },
  {
    id: 'r6',
    title: 'Old gym membership',
    description: 'Cancelled May 2025',
    amount: 6_000,
    amountFormatted: fmt(6_000),
    frequency: 'monthly',
    nextRunAt: isoIn(0),
    lastRunAt: isoAgo(180),
    source: 'CCPay wallet',
    recipient: { name: 'Vivo Fitness' },
    status: 'cancelled',
    ranCount: 6,
  },
];

type TabValue = 'active' | 'paused' | 'cancelled' | 'all';
const TABS: Array<{
  value: TabValue;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
}> = [
  {
    value: 'active',
    label: 'Active',
    icon: PlayCircle,
    description: 'Scheduled transfers running on autopilot.',
  },
  {
    value: 'paused',
    label: 'Paused',
    icon: PauseCircle,
    description: 'Rules you’ve paused but haven’t cancelled.',
  },
  {
    value: 'cancelled',
    label: 'Cancelled',
    icon: Trash2,
    description: 'Stopped rules — kept here for reference.',
  },
  {
    value: 'all',
    label: 'All',
    icon: Layers,
    description: 'Every rule across every state.',
  },
];

interface ApiBill {
  id: number;
  community_id: number;
  creator_id: number;
  title: string;
  description?: string | null;
  amount: number;
  status: string;
  is_recurring?: boolean;
  recurrence_type?: string | null;
  due_date: string;
  paid_member_count?: number;
  created_at?: string;
}

const FREQUENCY_FROM_API: Record<string, Frequency> = {
  weekly: 'weekly',
  monthly: 'monthly',
  yearly: 'yearly',
  daily: 'weekly',
};

function mapApiToRecurring(b: ApiBill, communityName: string, currentUserId?: number): RecurringRule {
  const freq: Frequency = FREQUENCY_FROM_API[(b.recurrence_type ?? 'monthly').toLowerCase()] ?? 'monthly';
  const status: RecurringStatus =
    b.status === 'cancelled' || b.status === 'canceled'
      ? 'cancelled'
      : b.status === 'paused'
        ? 'paused'
        : 'active';
  return {
    id: `bill-${b.id}`,
    title: b.title,
    description: b.description ?? undefined,
    amount: b.amount,
    amountFormatted: fmt(b.amount),
    frequency: freq,
    nextRunAt: b.due_date,
    source: 'CCPay wallet',
    recipient: { name: communityName },
    community: { id: String(b.community_id), name: communityName },
    status,
    ranCount: b.paid_member_count ?? 0,
    isHosting: !!currentUserId && b.creator_id === currentUserId,
  };
}

async function fetchAggregatedRecurring(currentUserId?: number): Promise<RecurringRule[]> {
  const joinedRes = await ApiService.communities.joined({ limit: 100 });
  const joined = (joinedRes.data?.data?.communities ?? []) as CommunityData[];
  if (joined.length === 0) return [];

  const lists = await Promise.all(
    joined.map(async (c) => {
      try {
        const res = await ApiService.communities.getBills(c.id, { limit: 200 });
        const items = (res.data?.data?.bills ?? []) as unknown as ApiBill[];
        return items
          .filter((b) => b.is_recurring)
          .map((b) => mapApiToRecurring(b, c.name, currentUserId));
      } catch {
        return [];
      }
    })
  );
  return lists.flat();
}

function readCurrentUserId(): number | undefined {
  if (typeof window === 'undefined') return undefined;
  try {
    const raw = localStorage.getItem('user_data');
    if (!raw) return undefined;
    const u = JSON.parse(raw);
    return typeof u?.id === 'number' ? u.id : undefined;
  } catch {
    return undefined;
  }
}

function nextRunLabel(iso: string, status: RecurringStatus): string {
  if (status === 'cancelled') return 'Cancelled';
  if (status === 'paused') return 'Paused';
  const d = new Date(iso);
  const dayDiff = Math.round(
    (new Date(d.toDateString()).getTime() -
      new Date(new Date().toDateString()).getTime()) /
      (1000 * 60 * 60 * 24)
  );
  if (dayDiff <= 0) return 'Running today';
  if (dayDiff === 1) return 'Runs tomorrow';
  if (dayDiff <= 7) return `Runs in ${dayDiff}d`;
  return `Runs ${d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}`;
}

export default function RecurringPage() {
  const [rules, setRules] = useState<RecurringRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [usingMock, setUsingMock] = useState(false);
  const [tab, setTab] = useState<TabValue>('active');
  const [search, setSearch] = useState('');
  const [frequency, setFrequency] = useState<'all' | Frequency>('all');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const real = await fetchAggregatedRecurring(readCurrentUserId());
        if (cancelled) return;
        if (real.length === 0) {
          setRules(MOCK);
          setUsingMock(true);
        } else {
          setRules(real);
          setUsingMock(false);
        }
      } catch {
        if (!cancelled) {
          setRules(MOCK);
          setUsingMock(true);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const stats = useMemo(() => {
    const active = rules.filter((r) => r.status === 'active');
    const monthlyOutflow = active.reduce((s, r) => {
      const factor =
        r.frequency === 'weekly'
          ? 4.345
          : r.frequency === 'monthly'
            ? 1
            : r.frequency === 'quarterly'
              ? 1 / 3
              : 1 / 12;
      return s + r.amount * factor;
    }, 0);
    const next = active
      .map((r) => new Date(r.nextRunAt).getTime())
      .sort((a, b) => a - b)[0];
    return {
      activeCount: active.length,
      monthlyOutflow: Math.round(monthlyOutflow),
      nextRunInDays: next
        ? Math.max(
            0,
            Math.round((next - Date.now()) / (1000 * 60 * 60 * 24))
          )
        : null,
      ranThisYear: rules.reduce((s, r) => s + r.ranCount, 0),
    };
  }, [rules]);

  const counts = useMemo<Record<TabValue, number>>(
    () => ({
      active: rules.filter((r) => r.status === 'active').length,
      paused: rules.filter((r) => r.status === 'paused').length,
      cancelled: rules.filter((r) => r.status === 'cancelled').length,
      all: rules.length,
    }),
    [rules]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rules
      .filter((r) => (tab === 'all' ? true : r.status === tab))
      .filter((r) => frequency === 'all' || r.frequency === frequency)
      .filter((r) => {
        if (!q) return true;
        return (
          r.title.toLowerCase().includes(q) ||
          (r.description?.toLowerCase().includes(q) ?? false) ||
          r.recipient.name.toLowerCase().includes(q) ||
          (r.community?.name.toLowerCase().includes(q) ?? false)
        );
      })
      .sort(
        (a, b) =>
          new Date(a.nextRunAt).getTime() - new Date(b.nextRunAt).getTime()
      );
  }, [rules, tab, search, frequency]);

  const togglePause = (id: string) => {
    setRules((prev) =>
      prev.map((r) =>
        r.id === id
          ? { ...r, status: r.status === 'active' ? 'paused' : 'active' }
          : r
      )
    );
    const r = rules.find((r) => r.id === id);
    toast.success(
      r?.status === 'active'
        ? `Paused "${r?.title}"`
        : `Resumed "${r?.title}"`
    );
  };

  const cancelRule = (id: string) => {
    const r = rules.find((r) => r.id === id);
    setRules((prev) =>
      prev.map((rule) =>
        rule.id === id ? { ...rule, status: 'cancelled' } : rule
      )
    );
    toast.success(`Cancelled "${r?.title}"`, {
      description: 'You can recreate this from the wallet.',
    });
  };

  return (
    <DashboardLayout pageTitle="Recurring">
      <div className="space-y-6">
        {/* Hero */}
        <section
          aria-labelledby="recurring-hero-heading"
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
                  <Repeat className="size-3" aria-hidden="true" />
                  Recurring
                </Badge>
                <h1
                  id="recurring-hero-heading"
                  className="mt-3 text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl"
                >
                  Auto-pay so you never miss a beat.
                </h1>
                <p className="mt-1.5 max-w-xl text-sm text-muted-foreground">
                  <Sparkles
                    className="mr-1 inline-block size-3"
                    aria-hidden="true"
                  />
                  Standing instructions for dues, contributions, tithes,
                  subscriptions — all in one place.
                </p>
              </div>
            </FadeIn>

            <SlideUp delay={0.05}>
              <Button
                type="button"
                size="default"
                onClick={() =>
                  toast.info('Open the wallet to add a new standing instruction', {
                    description:
                      'Or jump to Settings → Standing instructions for the full editor.',
                  })
                }
                leadingIcon={<Plus className="size-4" />}
              >
                New rule
              </Button>
            </SlideUp>
          </div>

          <SlideUp delay={0.1}>
            <dl className="relative mt-6 grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
              {[
                {
                  label: 'Active rules',
                  value: stats.activeCount.toLocaleString(),
                  icon: PlayCircle,
                  tone: 'bg-success/15 text-success',
                },
                {
                  label: 'Monthly outflow',
                  value: `₦${fmt(stats.monthlyOutflow)}`,
                  icon: TrendingUp,
                  tone: 'bg-warning/15 text-warning',
                },
                {
                  label: 'Next run',
                  value:
                    stats.nextRunInDays === null
                      ? '—'
                      : stats.nextRunInDays === 0
                        ? 'Today'
                        : `In ${stats.nextRunInDays}d`,
                  icon: Clock,
                  tone: 'bg-brand-soft text-accent-foreground',
                },
                {
                  label: 'Total runs',
                  value: stats.ranThisYear.toLocaleString(),
                  icon: CheckCircle2,
                  tone: 'bg-info/15 text-info',
                },
              ].map((it) => (
                <div
                  key={it.label}
                  className="flex items-center gap-3 rounded-2xl border border-border bg-card/80 p-3.5 backdrop-blur-sm"
                >
                  <span
                    className={cn(
                      'grid size-9 shrink-0 place-items-center rounded-xl',
                      it.tone
                    )}
                    aria-hidden="true"
                  >
                    <it.icon className="size-4" />
                  </span>
                  <div className="min-w-0">
                    <dt className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                      {it.label}
                    </dt>
                    <dd className="text-lg font-extrabold tabular-nums tracking-tight text-foreground sm:text-xl">
                      {it.value}
                    </dd>
                  </div>
                </div>
              ))}
            </dl>
          </SlideUp>
        </section>

        {/* Tabs */}
        <div role="tablist" aria-label="Recurring sections" className="-mx-1 overflow-x-auto px-1">
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
                    'relative inline-flex items-center gap-2 whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition-colors',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    isActive ? 'text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  {isActive && (
                    <motion.span
                      layoutId="recurring-tab-pill"
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
          {TABS.find((t) => t.value === tab)?.description}
        </p>

        {usingMock && !loading && (
          <p className="rounded-xl border border-dashed border-border bg-muted/40 px-4 py-2.5 text-xs text-muted-foreground">
            <Sparkles className="mr-1 inline-block size-3" aria-hidden="true" />
            Showing sample standing instructions. Once you join a community with recurring bills, your rules show up here.
          </p>
        )}

        {/* Filters */}
        <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-3 shadow-xs sm:flex-row sm:items-center sm:p-4">
          <div className="relative flex-1">
            <Search
              className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by title, recipient, or community…"
              className="h-11 rounded-xl pl-11"
              aria-label="Search recurring rules"
            />
          </div>
          <Select
            value={frequency}
            onValueChange={(v) => setFrequency(v as 'all' | Frequency)}
          >
            <SelectTrigger
              className="h-11 w-full rounded-xl px-3 sm:w-44"
              aria-label="Filter by frequency"
            >
              <span className="inline-flex items-center gap-2">
                <Filter className="size-4 text-muted-foreground" aria-hidden="true" />
                <SelectValue placeholder="Frequency" />
              </span>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All frequencies</SelectItem>
              <SelectItem value="weekly">Weekly</SelectItem>
              <SelectItem value="monthly">Monthly</SelectItem>
              <SelectItem value="quarterly">Quarterly</SelectItem>
              <SelectItem value="yearly">Yearly</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* List */}
        <AnimatePresence mode="wait">
          <motion.div
            key={`${tab}-${search}-${frequency}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="space-y-3"
          >
            {loading ? (
              <ul className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <li key={i}>
                    <Card variant="default">
                      <CardContent className="flex items-start gap-3 px-5 sm:px-6">
                        <Skeleton className="size-11 rounded-xl" />
                        <div className="flex-1 space-y-2">
                          <Skeleton className="h-4 w-2/5" />
                          <Skeleton className="h-3 w-3/5" />
                          <Skeleton className="h-3 w-1/3" />
                        </div>
                        <div className="space-y-2">
                          <Skeleton className="h-5 w-20" />
                          <Skeleton className="h-7 w-24" />
                        </div>
                      </CardContent>
                    </Card>
                  </li>
                ))}
              </ul>
            ) : filtered.length === 0 ? (
              <EmptyState
                icon={<Repeat className="size-5" aria-hidden="true" />}
                title={
                  search || frequency !== 'all'
                    ? 'No matches'
                    : tab === 'active'
                      ? 'No active rules'
                      : tab === 'paused'
                        ? 'No paused rules'
                        : tab === 'cancelled'
                          ? 'No cancelled rules'
                          : 'No rules yet'
                }
                description={
                  tab === 'active'
                    ? 'Set up your first standing instruction so dues come out automatically.'
                    : 'Recurring rules you create will live here.'
                }
                action={
                  tab === 'active' || tab === 'all' ? (
                    <Button
                      onClick={() => toast.info('Open the wallet to create a rule')}
                      leadingIcon={<Plus className="size-4" />}
                    >
                      New rule
                    </Button>
                  ) : undefined
                }
              />
            ) : (
              <ul role="list" className="space-y-3">
                <AnimatePresence initial={false}>
                  {filtered.map((r) => {
                    const due = nextRunLabel(r.nextRunAt, r.status);
                    const dueDays =
                      Math.round(
                        (new Date(r.nextRunAt).getTime() - Date.now()) /
                          (1000 * 60 * 60 * 24)
                      );
                    const isUrgent = r.status === 'active' && dueDays <= 3;
                    return (
                      <motion.li
                        key={r.id}
                        layout
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: 24 }}
                        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                      >
                        <Card
                          variant="default"
                          className={cn(
                            r.status === 'cancelled' && 'opacity-70',
                            r.status === 'paused' && 'border-warning/30 bg-warning/5'
                          )}
                        >
                          <CardContent className="flex flex-col gap-4 px-5 sm:flex-row sm:items-start sm:justify-between sm:px-6">
                            <div className="flex min-w-0 flex-1 items-start gap-3">
                              <span
                                className={cn(
                                  'grid size-11 shrink-0 place-items-center rounded-xl',
                                  r.status === 'active'
                                    ? 'bg-success/15 text-success'
                                    : r.status === 'paused'
                                      ? 'bg-warning/15 text-warning'
                                      : 'bg-muted text-muted-foreground'
                                )}
                                aria-hidden="true"
                              >
                                <Repeat className="size-5" />
                              </span>
                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <h3 className="text-base font-bold tracking-tight text-foreground sm:text-lg">
                                    {r.title}
                                  </h3>
                                  <Badge
                                    variant={
                                      r.status === 'active'
                                        ? 'successSoft'
                                        : r.status === 'paused'
                                          ? 'warningSoft'
                                          : 'soft'
                                    }
                                    size="sm"
                                    className="capitalize"
                                  >
                                    {r.status}
                                  </Badge>
                                  <Badge variant="soft" size="sm">
                                    {FREQUENCY_LABEL[r.frequency]}
                                  </Badge>
                                  {r.isHosting && (
                                    <Badge variant="infoSoft" size="sm">
                                      You created this
                                    </Badge>
                                  )}
                                </div>
                                {r.description && (
                                  <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                                    {r.description}
                                  </p>
                                )}
                                <ul
                                  className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground"
                                  aria-label="Rule details"
                                >
                                  <li
                                    className={cn(
                                      'inline-flex items-center gap-1',
                                      isUrgent && 'font-semibold text-warning'
                                    )}
                                  >
                                    <Clock className="size-3.5" aria-hidden="true" />
                                    {due}
                                  </li>
                                  {r.lastRunAt && (
                                    <li className="inline-flex items-center gap-1">
                                      <CheckCircle2
                                        className="size-3.5"
                                        aria-hidden="true"
                                      />
                                      Last ran{' '}
                                      {new Date(r.lastRunAt).toLocaleDateString(
                                        undefined,
                                        { day: 'numeric', month: 'short' }
                                      )}
                                    </li>
                                  )}
                                  <li>To {r.recipient.name}</li>
                                  <li>From {r.source}</li>
                                  {r.community && (
                                    <li className="text-muted-foreground/80">
                                      · {r.community.name}
                                    </li>
                                  )}
                                  <li>
                                    Ran{' '}
                                    <span className="tabular-nums font-semibold text-foreground">
                                      {r.ranCount}
                                    </span>{' '}
                                    times
                                  </li>
                                </ul>
                              </div>
                            </div>

                            <div className="flex items-center justify-between gap-3 sm:flex-col sm:items-end sm:gap-2">
                              <div className="text-right">
                                <p className="text-lg font-extrabold tabular-nums text-foreground sm:text-xl">
                                  ₦{r.amountFormatted}
                                </p>
                                <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                                  per {r.frequency.replace('ly', '')}
                                </p>
                              </div>
                              {r.status !== 'cancelled' && (
                                <div className="flex items-center gap-1.5">
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant={
                                      r.status === 'active' ? 'outline' : 'default'
                                    }
                                    onClick={() => togglePause(r.id)}
                                    leadingIcon={
                                      r.status === 'active' ? (
                                        <PauseCircle className="size-3.5" />
                                      ) : (
                                        <PlayCircle className="size-3.5" />
                                      )
                                    }
                                  >
                                    {r.status === 'active' ? 'Pause' : 'Resume'}
                                  </Button>
                                  <Button
                                    type="button"
                                    size="icon-sm"
                                    variant="ghost"
                                    aria-label={`Cancel ${r.title}`}
                                    onClick={() => cancelRule(r.id)}
                                  >
                                    <Trash2 className="size-3.5" aria-hidden="true" />
                                  </Button>
                                  <Button
                                    type="button"
                                    size="icon-sm"
                                    variant="ghost"
                                    aria-label="More options"
                                  >
                                    <MoreHorizontal
                                      className="size-3.5"
                                      aria-hidden="true"
                                    />
                                  </Button>
                                </div>
                              )}
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
          <Calendar className="mr-1 inline-block size-3" aria-hidden="true" />
          Rules run at 08:00 WAT on their scheduled dates. We notify you on success or failure.
        </p>
      </div>
    </DashboardLayout>
  );
}
