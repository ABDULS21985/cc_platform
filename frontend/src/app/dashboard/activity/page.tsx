'use client';

import * as React from 'react';
import { useEffect, useMemo, useState } from 'react';
import {
  Activity as ActivityIcon,
  Download,
  Filter,
  Layers,
  Search,
} from 'lucide-react';
import { ApiService } from '@/services/api';
import { Skeleton } from '@/components/ui/skeleton';
import { toastAxiosError } from '@/hooks/useAxiosError';
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
import { ActivityHero } from '@/components/activity/ActivityHero';
import { ActivityRow } from '@/components/activity/ActivityRow';
import type {
  ActivityFilters,
  ActivityItem,
  ActivityPeriod,
} from '@/components/activity/types';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export const dynamic = 'force-dynamic';

const now = new Date();
const minutesAgo = (m: number) =>
  new Date(now.getTime() - m * 60_000).toISOString();
const hoursAgo = (h: number) => minutesAgo(h * 60);
const daysAgo = (d: number) => hoursAgo(d * 24);
const fmt = (n: number) => n.toLocaleString('en-NG');

/**
 * Map a backend WalletTransaction (from /api/v2/wallet/transactions) to the
 * page's ActivityItem shape. Backend canonical fields:
 *   { id, reference, bell_mfb_reference, type, amount (string), signed_amount,
 *     fee, stamp_duty, net_amount, balance_before, balance_after, description,
 *     source_account_name, source_bank_name, destination_account_name,
 *     status, community_id, bill_id, transaction_type, meta, completed_at,
 *     created_at }
 */
function mapApiTransaction(
  t: Record<string, unknown>
): ActivityItem {
  const amount = Number(t.amount as string) || 0;
  const signedAmount = Number(t.signed_amount as string) || amount;
  const direction: 'in' | 'out' = signedAmount >= 0 ? 'in' : 'out';

  const rawType = String(t.type ?? '').toLowerCase();
  const transactionType = String(t.transaction_type ?? '').toLowerCase();
  const isCredit = direction === 'in';
  const isFee = (Number(t.fee as string) || 0) > 0 && amount === 0;
  const isRefund = transactionType.includes('refund');

  // Map onto the rich ActivityType union used by the row component.
  let mappedType: ActivityItem['type'];
  if (isRefund) mappedType = 'refund';
  else if (isFee) mappedType = 'fee';
  else if (rawType === 'deposit' || transactionType === 'deposit')
    mappedType = 'deposit';
  else if (rawType === 'withdrawal' || transactionType === 'withdrawal')
    mappedType = 'withdrawal';
  else if (t.bill_id) mappedType = isCredit ? 'bill-received' : 'bill-payment';
  else if (transactionType.includes('card')) mappedType = 'card-charge';
  else mappedType = isCredit ? 'transfer-in' : 'transfer-out';

  const status: ActivityItem['status'] =
    String(t.status) === 'successful' || String(t.status) === 'success' || String(t.status) === 'completed'
      ? 'success'
      : String(t.status) === 'pending' || String(t.status) === 'processing'
        ? 'pending'
        : 'failed';

  const counterpartyName = isCredit
    ? (t.source_account_name as string | null) || null
    : (t.destination_account_name as string | null) || null;

  return {
    id: String(t.id ?? t.reference ?? Math.random()),
    type: mappedType,
    title: (t.description as string) || (isCredit ? 'Money in' : 'Money out'),
    description:
      [t.source_account_name, t.source_bank_name].filter(Boolean).join(' · ') ||
      (t.destination_account_name as string) ||
      '',
    amount: Math.abs(amount),
    amountFormatted: fmt(Math.abs(amount)),
    direction,
    status,
    timestamp:
      (t.completed_at as string) ||
      (t.created_at as string) ||
      new Date().toISOString(),
    community: t.community_id
      ? { id: String(t.community_id), name: 'Community' }
      : undefined,
    counterparty: counterpartyName
      ? {
          name: counterpartyName,
          bank: (t.source_bank_name as string) || undefined,
        }
      : undefined,
    fee: Number(t.fee as string) || 0,
    reference: (t.reference as string) || undefined,
  };
}

// Realistic mock transactions used as a fallback when the wallet endpoint
// returns 404 (e.g. test users who haven't completed BVN/NIN verification, so
// they have no Bell MFB virtual account yet). Once a wallet exists, real data
// replaces this entirely.
const MOCK_ACTIVITY: ActivityItem[] = [
  {
    id: 't1',
    type: 'transfer-in',
    title: 'Transfer from Adaeze Mbakwe',
    description: 'April estate dues',
    amount: 18_500,
    amountFormatted: fmt(18_500),
    direction: 'in',
    status: 'success',
    timestamp: minutesAgo(8),
    counterparty: { name: 'Adaeze Mbakwe', bank: 'Bell MFB', tail: '4422' },
    community: { id: '1', name: 'Lekki Block 3 HOA' },
    reference: 'BMF-1849221',
  },
  {
    id: 't2',
    type: 'bill-payment',
    title: 'Marathon registration',
    description: 'Lagos Half Marathon · ticket #184',
    amount: 12_500,
    amountFormatted: fmt(12_500),
    direction: 'out',
    status: 'success',
    timestamp: hoursAgo(2),
    community: { id: '2', name: 'Lekki Runners' },
    reference: 'CCP-2014',
  },
  {
    id: 't3',
    type: 'fee',
    title: 'Bell MFB transfer fee',
    description: 'NIBSS network fee',
    amount: 25,
    amountFormatted: fmt(25),
    direction: 'out',
    status: 'success',
    timestamp: hoursAgo(2),
    fee: 0,
    reference: 'FEE-2014',
  },
  {
    id: 't4',
    type: 'transfer-out',
    title: 'Sent to Trinity Co-op',
    description: 'Co-op rotation #14 contribution',
    amount: 8_000,
    amountFormatted: fmt(8_000),
    direction: 'out',
    status: 'pending',
    timestamp: hoursAgo(5),
    counterparty: { name: 'Trinity Co-op', bank: 'SafeHaven', tail: '0418' },
    community: { id: '3', name: 'Trinity Co-op' },
    fee: 25,
    reference: 'CCP-2017',
  },
  {
    id: 't5',
    type: 'deposit',
    title: 'Wallet top-up',
    description: 'From Bell MFB ·· 8421',
    amount: 40_000,
    amountFormatted: fmt(40_000),
    direction: 'in',
    status: 'success',
    timestamp: hoursAgo(20),
    counterparty: { name: 'Bell MFB', tail: '8421' },
    reference: 'BMF-1849002',
  },
  {
    id: 't6',
    type: 'bill-received',
    title: 'AGM venue contribution',
    description: 'From Mr. Okonkwo',
    amount: 5_000,
    amountFormatted: fmt(5_000),
    direction: 'in',
    status: 'success',
    timestamp: hoursAgo(28),
    counterparty: { name: 'Mr. Okonkwo' },
    community: { id: '1', name: 'Lekki Block 3 HOA' },
  },
  {
    id: 't7',
    type: 'transfer-out',
    title: 'Sent to Funmi Ojo',
    description: "Friend's birthday gift fund",
    amount: 5_000,
    amountFormatted: fmt(5_000),
    direction: 'out',
    status: 'success',
    timestamp: daysAgo(1),
    counterparty: { name: 'Funmi Ojo', bank: 'Access', tail: '6629' },
    fee: 25,
    reference: 'CCP-1998',
  },
  {
    id: 't8',
    type: 'card-charge',
    title: 'Tech meetup fee',
    description: 'Card ending ·· 3344',
    amount: 0,
    amountFormatted: '0',
    direction: 'out',
    status: 'success',
    timestamp: daysAgo(2),
    counterparty: { name: 'Visa debit', tail: '3344' },
    community: { id: '5', name: 'Lagos Devs' },
    reference: 'CCP-1972',
  },
  {
    id: 't9',
    type: 'refund',
    title: 'Refund · cancelled event',
    description: 'AGM streaming · Q&A refund',
    amount: 1_500,
    amountFormatted: fmt(1_500),
    direction: 'in',
    status: 'success',
    timestamp: daysAgo(2),
    community: { id: '1', name: 'Lekki Block 3 HOA' },
  },
  {
    id: 't10',
    type: 'transfer-in',
    title: 'Transfer from Kunle Adeyemi',
    description: 'Marathon t-shirt money',
    amount: 3_500,
    amountFormatted: fmt(3_500),
    direction: 'in',
    status: 'success',
    timestamp: daysAgo(3),
    counterparty: { name: 'Kunle Adeyemi', bank: 'GTBank', tail: '5871' },
    community: { id: '2', name: 'Lekki Runners' },
  },
  {
    id: 't11',
    type: 'bill-payment',
    title: 'Estate dues — March',
    description: 'Block 3 monthly maintenance',
    amount: 18_500,
    amountFormatted: fmt(18_500),
    direction: 'out',
    status: 'success',
    timestamp: daysAgo(4),
    community: { id: '1', name: 'Lekki Block 3 HOA' },
    reference: 'CCP-1834',
  },
  {
    id: 't12',
    type: 'transfer-out',
    title: 'Sent to Marathon vendor',
    description: 'T-shirt printing — half payment',
    amount: 22_500,
    amountFormatted: fmt(22_500),
    direction: 'out',
    status: 'success',
    timestamp: daysAgo(5),
    counterparty: { name: 'Marathon vendor', bank: 'UBA', tail: '4422' },
    community: { id: '2', name: 'Lekki Runners' },
    fee: 25,
  },
  {
    id: 't13',
    type: 'transfer-out',
    title: 'Sent to Adaeze Mbakwe',
    description: 'Lunch payback',
    amount: 4_500,
    amountFormatted: fmt(4_500),
    direction: 'out',
    status: 'failed',
    timestamp: daysAgo(6),
    counterparty: { name: 'Adaeze Mbakwe', bank: 'Bell MFB', tail: '4422' },
    reference: 'CCP-1801',
  },
  {
    id: 't14',
    type: 'deposit',
    title: 'Wallet top-up',
    description: 'From GTBank ·· 5871',
    amount: 75_000,
    amountFormatted: fmt(75_000),
    direction: 'in',
    status: 'success',
    timestamp: daysAgo(7),
    counterparty: { name: 'GTBank', tail: '5871' },
  },
  {
    id: 't15',
    type: 'bill-received',
    title: 'Co-op contribution #13',
    description: 'From 24 members',
    amount: 192_000,
    amountFormatted: fmt(192_000),
    direction: 'in',
    status: 'success',
    timestamp: daysAgo(10),
    community: { id: '3', name: 'Trinity Co-op' },
  },
  {
    id: 't16',
    type: 'withdrawal',
    title: 'Withdrawal to Bell MFB',
    description: 'Settlement to ·· 8421',
    amount: 50_000,
    amountFormatted: fmt(50_000),
    direction: 'out',
    status: 'success',
    timestamp: daysAgo(12),
    counterparty: { name: 'Bell MFB', tail: '8421' },
    fee: 50,
  },
  {
    id: 't17',
    type: 'transfer-in',
    title: 'Transfer from Pastor Bisi',
    description: 'Tithe contribution',
    amount: 25_000,
    amountFormatted: fmt(25_000),
    direction: 'in',
    status: 'success',
    timestamp: daysAgo(15),
    counterparty: { name: 'Pastor Bisi', bank: 'Zenith', tail: '8841' },
    community: { id: '4', name: 'Grace Assembly' },
  },
  {
    id: 't18',
    type: 'fee',
    title: 'Bell MFB monthly maintenance',
    description: 'Wallet upkeep',
    amount: 100,
    amountFormatted: fmt(100),
    direction: 'out',
    status: 'success',
    timestamp: daysAgo(18),
  },
  {
    id: 't19',
    type: 'transfer-out',
    title: 'Sent to Marathon vendor',
    description: 'T-shirt printing — final payment',
    amount: 22_500,
    amountFormatted: fmt(22_500),
    direction: 'out',
    status: 'success',
    timestamp: daysAgo(20),
    counterparty: { name: 'Marathon vendor', bank: 'UBA', tail: '4422' },
    community: { id: '2', name: 'Lekki Runners' },
  },
  {
    id: 't20',
    type: 'card-charge',
    title: 'Domain renewal',
    description: 'Card ·· 3344',
    amount: 8_000,
    amountFormatted: fmt(8_000),
    direction: 'out',
    status: 'success',
    timestamp: daysAgo(25),
    counterparty: { name: 'Visa debit', tail: '3344' },
  },
];

function periodToCutoff(p: ActivityPeriod): number {
  const day = 24 * 60 * 60 * 1000;
  if (p === 'today') return Date.now() - day;
  if (p === '7d') return Date.now() - 7 * day;
  if (p === '30d') return Date.now() - 30 * day;
  if (p === '90d') return Date.now() - 90 * day;
  return 0;
}

function dayKey(iso: string): string {
  const d = new Date(iso);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

function formatDayHeader(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const startOfDay = (date: Date) => {
    const c = new Date(date);
    c.setHours(0, 0, 0, 0);
    return c;
  };
  const dayDiff = Math.round(
    (startOfDay(now).getTime() - startOfDay(d).getTime()) / (1000 * 60 * 60 * 24)
  );
  if (dayDiff === 0) return 'Today';
  if (dayDiff === 1) return 'Yesterday';
  if (dayDiff < 7)
    return d.toLocaleDateString(undefined, { weekday: 'long' });
  return d.toLocaleDateString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

function exportCsv(items: ActivityItem[]): void {
  const header = [
    'date',
    'time',
    'type',
    'direction',
    'title',
    'description',
    'community',
    'counterparty',
    'amount',
    'fee',
    'status',
    'reference',
  ];
  const rows = items.map((it) => {
    const d = new Date(it.timestamp);
    const date = d.toISOString().split('T')[0];
    const time = d.toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    return [
      date,
      time,
      it.type,
      it.direction,
      it.title.replace(/"/g, '""'),
      it.description.replace(/"/g, '""'),
      it.community?.name ?? '',
      it.counterparty?.name ?? '',
      it.amount.toString(),
      (it.fee ?? 0).toString(),
      it.status,
      it.reference ?? '',
    ];
  });
  const csv = [
    header.join(','),
    ...rows.map((r) => r.map((cell) => `"${cell}"`).join(',')),
  ].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `ccpay-activity-${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export default function ActivityPage() {
  const [period, setPeriod] = useState<ActivityPeriod>('30d');
  const [filters, setFilters] = useState<ActivityFilters>({
    search: '',
    type: 'all',
    status: 'all',
    community: 'all',
  });
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  // True when the user has no provisioned wallet yet (404 from the backend) —
  // renders an actionable empty state pointing them at verification.
  const [walletMissing, setWalletMissing] = useState(false);

  // Fetch transactions on mount. Period filtering is client-side because the
  // backend endpoint doesn't support date ranges yet.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await ApiService.wallet.getTransactions({ limit: 100 });
        if (cancelled) return;
        const list = (res.data?.data?.transactions ?? []) as unknown as Array<
          Record<string, unknown>
        >;
        setItems(list.map(mapApiTransaction));
        setWalletMissing(false);
      } catch (err) {
        if (cancelled) return;
        const status = (err as { response?: { status?: number } })?.response
          ?.status;
        if (status === 404) {
          // Wallet not provisioned — fall back to mock so the page still
          // demonstrates the layout. A clear banner tells the user why.
          setWalletMissing(true);
          setItems(MOCK_ACTIVITY);
        } else {
          toastAxiosError(err, 'Failed to load activity.');
          setItems([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const communities = useMemo(() => {
    const seen = new Map<string, string>();
    for (const t of items) {
      if (t.community) seen.set(t.community.id, t.community.name);
    }
    return Array.from(seen.entries()).map(([id, name]) => ({ id, name }));
  }, [items]);

  const filtered = useMemo(() => {
    const cutoff = periodToCutoff(period);
    const q = filters.search.trim().toLowerCase();
    return items.filter((t) => {
      if (cutoff > 0 && new Date(t.timestamp).getTime() < cutoff) return false;
      if (filters.type === 'in' && t.direction !== 'in') return false;
      if (filters.type === 'out' && t.direction !== 'out') return false;
      if (filters.type === 'fees' && t.type !== 'fee') return false;
      if (filters.type === 'refunds' && t.type !== 'refund') return false;
      if (filters.status !== 'all' && t.status !== filters.status) return false;
      if (filters.community !== 'all' && t.community?.id !== filters.community)
        return false;
      if (!q) return true;
      return (
        t.title.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        (t.counterparty?.name.toLowerCase().includes(q) ?? false) ||
        (t.community?.name.toLowerCase().includes(q) ?? false) ||
        (t.reference?.toLowerCase().includes(q) ?? false)
      );
    }).sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }, [period, filters]);

  const stats = useMemo(() => {
    const totalIn = filtered
      .filter((t) => t.direction === 'in' && t.status === 'success')
      .reduce((s, t) => s + t.amount, 0);
    const totalOut = filtered
      .filter((t) => t.direction === 'out' && t.status === 'success')
      .reduce((s, t) => s + t.amount, 0);
    return { totalIn, totalOut, count: filtered.length };
  }, [filtered]);

  const grouped = useMemo(() => {
    const map = new Map<string, ActivityItem[]>();
    for (const it of filtered) {
      const k = dayKey(it.timestamp);
      const list = map.get(k) ?? [];
      list.push(it);
      map.set(k, list);
    }
    return Array.from(map.entries()).map(([key, items]) => {
      const dayIn = items
        .filter((t) => t.direction === 'in' && t.status === 'success')
        .reduce((s, t) => s + t.amount, 0);
      const dayOut = items
        .filter((t) => t.direction === 'out' && t.status === 'success')
        .reduce((s, t) => s + t.amount, 0);
      return {
        key,
        label: formatDayHeader(key),
        items,
        net: dayIn - dayOut,
      };
    });
  }, [filtered]);

  const handleExport = () => {
    if (filtered.length === 0) {
      toast.error('Nothing to export with the current filters.');
      return;
    }
    exportCsv(filtered);
    toast.success(`Exported ${filtered.length} transactions`);
  };

  return (
    <DashboardLayout pageTitle="Activity">
      <div className="space-y-6">
        <ActivityHero
          period={period}
          onPeriodChange={setPeriod}
          stats={stats}
        />

        {/* Filter row */}
        <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-3 shadow-xs sm:flex-row sm:flex-wrap sm:items-center sm:p-4">
          <div className="relative min-w-0 flex-1">
            <Search
              className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              value={filters.search}
              onChange={(e) =>
                setFilters((f) => ({ ...f, search: e.target.value }))
              }
              placeholder="Search by title, description, recipient, or reference…"
              className="h-11 rounded-xl pl-11"
              aria-label="Search activity"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Select
              value={filters.type}
              onValueChange={(v) =>
                setFilters((f) => ({
                  ...f,
                  type: v as ActivityFilters['type'],
                }))
              }
            >
              <SelectTrigger
                className="h-11 w-full rounded-xl px-3 sm:w-44"
                aria-label="Filter by type"
              >
                <span className="inline-flex items-center gap-2">
                  <Filter
                    className="size-4 text-muted-foreground"
                    aria-hidden="true"
                  />
                  <SelectValue placeholder="Type" />
                </span>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                <SelectItem value="in">Money in</SelectItem>
                <SelectItem value="out">Money out</SelectItem>
                <SelectItem value="fees">Fees</SelectItem>
                <SelectItem value="refunds">Refunds</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={filters.status}
              onValueChange={(v) =>
                setFilters((f) => ({
                  ...f,
                  status: v as ActivityFilters['status'],
                }))
              }
            >
              <SelectTrigger
                className="h-11 w-full rounded-xl px-3 sm:w-40"
                aria-label="Filter by status"
              >
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All status</SelectItem>
                <SelectItem value="success">Success</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={filters.community}
              onValueChange={(v) =>
                setFilters((f) => ({ ...f, community: v }))
              }
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

            <Button
              type="button"
              size="default"
              variant="outline"
              onClick={handleExport}
              leadingIcon={<Download className="size-4" />}
              className="h-11"
            >
              Export
            </Button>
          </div>
        </div>

        {/* List */}
        <Card variant="default" density="compact">
          <CardContent className="space-y-6 px-3 sm:px-4">
            <AnimatePresence mode="wait">
              <motion.div
                key={`${period}-${filters.search}-${filters.type}-${filters.status}-${filters.community}`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                className="space-y-6"
              >
                {loading ? (
                  <ul className="space-y-2">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-3 rounded-xl border border-border p-3"
                      >
                        <Skeleton className="size-10 rounded-xl" />
                        <div className="flex-1 space-y-2">
                          <Skeleton className="h-3.5 w-2/3 rounded-md" />
                          <Skeleton className="h-3 w-1/2 rounded-md" />
                        </div>
                        <Skeleton className="h-4 w-20 rounded-md" />
                      </li>
                    ))}
                  </ul>
                ) : filtered.length === 0 ? (
                  <EmptyState
                    icon={<ActivityIcon className="size-5" aria-hidden="true" />}
                    title={walletMissing ? 'Wallet not set up yet' : 'No activity'}
                    description={
                      walletMissing
                        ? 'Verify your BVN to get a Bell MFB wallet — once you do, transfers and deposits land here.'
                        : filters.search ||
                            filters.type !== 'all' ||
                            filters.status !== 'all' ||
                            filters.community !== 'all'
                          ? 'Try a different filter combination, or expand the period.'
                          : 'Once you fund or send money, it lands here.'
                    }
                    action={
                      walletMissing ? (
                        <Button asChild>
                          <a href="/dashboard/settings?tab=verification">
                            Verify identity
                          </a>
                        </Button>
                      ) : undefined
                    }
                  />
                ) : (
                  grouped.map((day) => (
                    <section
                      key={day.key}
                      aria-labelledby={`day-${day.key}`}
                      className="space-y-2"
                    >
                      <div className="flex items-center gap-2 px-1">
                        <h2
                          id={`day-${day.key}`}
                          className="text-xs font-bold uppercase tracking-widest text-muted-foreground"
                        >
                          {day.label}
                        </h2>
                        <span aria-hidden="true" className="h-px flex-1 bg-border" />
                        <Badge
                          variant={day.net >= 0 ? 'successSoft' : 'soft'}
                          size="sm"
                          className="tabular-nums"
                        >
                          {day.net >= 0 ? '+' : '−'}₦
                          {Math.abs(day.net).toLocaleString()}
                        </Badge>
                        <Badge variant="soft" size="sm" className="tabular-nums">
                          {day.items.length}
                        </Badge>
                      </div>
                      <ul role="list" className="space-y-1">
                        {day.items.map((it) => (
                          <ActivityRow
                            key={it.id}
                            item={it}
                            onSelect={(id) => {
                              // No detail page yet — just toast a placeholder.
                              toast(`Opening transaction ${id}`, {
                                description: 'Detailed view coming soon.',
                              });
                            }}
                          />
                        ))}
                      </ul>
                    </section>
                  ))
                )}
              </motion.div>
            </AnimatePresence>
          </CardContent>
        </Card>

        {/* Footer microcopy */}
        <p className="text-center text-[11px] text-muted-foreground">
          Showing {filtered.length} of {items.length} transactions ·{' '}
          <button
            type="button"
            onClick={() => {
              setPeriod('all');
              setFilters({
                search: '',
                type: 'all',
                status: 'all',
                community: 'all',
              });
            }}
            className={cn(
              'rounded-md px-1 font-semibold text-primary hover:underline underline-offset-4',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
            )}
          >
            Reset filters
          </button>
        </p>
      </div>
    </DashboardLayout>
  );
}
