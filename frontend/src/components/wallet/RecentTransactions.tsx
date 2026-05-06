'use client';

import { useState, useEffect } from 'react';
import { ApiService } from '@/services/api';
import { ArrowDownLeft, ArrowUpRight, MoreVertical, Receipt } from 'lucide-react';
import TransactionFilters from './TransactionFilters';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { toastAxiosError } from '@/hooks/useAxiosError';
import { cn } from '@/lib/utils';

interface Transaction {
  id: string;
  type: string;
  date: string;
  amount: string;
  status: 'Successful' | 'Pending' | 'Failed';
  direction: 'in' | 'out';
}

const STATUS_VARIANTS: Record<Transaction['status'], 'successSoft' | 'warningSoft' | 'destructiveSoft'> = {
  Successful: 'successSoft',
  Pending: 'warningSoft',
  Failed: 'destructiveSoft',
};

export default function RecentTransactions() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filtered, setFiltered] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  const handlePeriodChange = (_period: string) => {
    // no-op: filtering is local-only on the rendered list
  };

  const handleDateRangeChange = (_range: string) => {
    // no-op: filtering is local-only on the rendered list
  };

  const handleSearch = (query: string) => {
    if (!query.trim()) {
      setFiltered(transactions);
      return;
    }
    const q = query.toLowerCase();
    setFiltered(transactions.filter((t) => t.type.toLowerCase().includes(q)));
  };

  useEffect(() => {
    let cancelled = false;
    const fetchTransactions = async () => {
      try {
        const response = await ApiService.wallet.getTransactions({ limit: 10 });
        const mapped: Transaction[] = (response.data.data.transactions || []).map(
          (t: { id: string | number; description?: string; type: string; created_at?: string; amount: number | string; status: string }) => {
            const isCredit =
              (t.type ?? '').toLowerCase().includes('credit') ||
              (t.type ?? '').toLowerCase().includes('deposit') ||
              (t.type ?? '').toLowerCase().includes('fund');
            const status: Transaction['status'] =
              t.status === 'success' || t.status === 'completed'
                ? 'Successful'
                : t.status === 'pending'
                  ? 'Pending'
                  : 'Failed';
            return {
              id: String(t.id),
              type: t.description || t.type,
              date: t.created_at ? new Date(t.created_at).toLocaleDateString() : 'N/A',
              amount: `₦${Number(t.amount).toLocaleString()}`,
              status,
              direction: isCredit ? 'in' : 'out',
            };
          }
        );
        if (!cancelled) {
          setTransactions(mapped);
          setFiltered(mapped);
        }
      } catch (error) {
        if (!cancelled) {
          toastAxiosError(error, 'Failed to load transactions.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchTransactions();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <Card variant="default">
      <CardHeader>
        <CardTitle className="text-lg">Recent transactions</CardTitle>
        <CardDescription className="uppercase tracking-widest text-[10px] font-bold">
          History &amp; activity
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <TransactionFilters
          onPeriodChange={handlePeriodChange}
          onDateRangeChange={handleDateRangeChange}
          onSearch={handleSearch}
        />

        {loading ? (
          <ul className="divide-y divide-border">
            {Array.from({ length: 4 }).map((_, i) => (
              <li key={i} className="flex items-center gap-3 py-3">
                <Skeleton className="size-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-1/3" />
                  <Skeleton className="h-3 w-1/4" />
                </div>
                <Skeleton className="h-4 w-20" />
              </li>
            ))}
          </ul>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<Receipt className="size-5" aria-hidden="true" />}
            title="No transactions yet"
            description="Once you fund or send money, your activity will show here."
          />
        ) : (
          <ul className="divide-y divide-border" role="list">
            {filtered.map((t) => {
              const Icon = t.direction === 'in' ? ArrowDownLeft : ArrowUpRight;
              return (
                <li
                  key={t.id}
                  className="grid grid-cols-[auto_1fr_auto] items-center gap-4 py-3 sm:grid-cols-[auto_1fr_auto_auto_auto]"
                >
                  <span
                    className={cn(
                      'grid size-10 place-items-center rounded-full',
                      t.direction === 'in'
                        ? 'bg-success/15 text-success'
                        : 'bg-brand-soft text-accent-foreground'
                    )}
                    aria-hidden="true"
                  >
                    <Icon className="size-4" />
                  </span>

                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-foreground">{t.type}</p>
                    <p className="text-xs text-muted-foreground">{t.date}</p>
                  </div>

                  <span
                    className={cn(
                      'text-sm font-semibold tabular-nums',
                      t.direction === 'in' ? 'text-success' : 'text-foreground'
                    )}
                  >
                    {t.direction === 'in' ? '+' : '−'}
                    {t.amount}
                  </span>

                  <Badge
                    variant={STATUS_VARIANTS[t.status]}
                    className="hidden sm:inline-flex"
                  >
                    <span
                      className={cn(
                        'mr-1 size-1.5 rounded-full',
                        t.status === 'Successful' && 'bg-success',
                        t.status === 'Pending' && 'bg-warning',
                        t.status === 'Failed' && 'bg-destructive'
                      )}
                      aria-hidden="true"
                    />
                    {t.status}
                  </Badge>

                  <button
                    type="button"
                    aria-label="Transaction options"
                    className="hidden size-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground sm:inline-flex focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <MoreVertical className="size-4" aria-hidden="true" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
