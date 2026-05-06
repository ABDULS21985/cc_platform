'use client';

import * as React from 'react';
import { useEffect, useState } from 'react';
import { CreditCard, MoreHorizontal, Pause, Play, Phone, Trash2 } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { ApiService, type SubscriptionApi } from '@/services/api';
import { toast } from 'sonner';

const fmt = (n: number) => `₦${n.toLocaleString('en-NG')}`;

const cadenceLabel: Record<SubscriptionApi['cadence'], string> = {
  weekly: 'Weekly',
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  yearly: 'Yearly',
};

export function SubscriptionsContent() {
  const [tab, setTab] = useState<'active' | 'inactive'>('active');
  const [subs, setSubs] = useState<SubscriptionApi[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await ApiService.subscriptions.list({ limit: 100 });
      setSubs(res.data?.data?.subscriptions ?? []);
    } catch {
      toast.error('Could not load subscriptions');
      setSubs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleSetStatus = async (
    id: number,
    next: 'active' | 'paused' | 'cancelled',
  ) => {
    setBusyId(id);
    try {
      const res = await ApiService.subscriptions.setStatus(id, next);
      const updated = res.data?.data?.subscription;
      if (updated) {
        setSubs((prev) => prev.map((s) => (s.id === id ? updated : s)));
      }
      toast.success(
        next === 'paused'
          ? 'Subscription paused'
          : next === 'active'
            ? 'Subscription resumed'
            : 'Subscription cancelled',
      );
    } catch {
      toast.error('Could not update subscription');
    } finally {
      setBusyId(null);
    }
  };

  const active = subs.filter((s) => s.status === 'active' || s.status === 'paused');
  const inactive = subs.filter((s) => s.status === 'cancelled');
  const visible = tab === 'active' ? active : inactive;

  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-9 w-48 rounded" />
        <Skeleton className="h-20 rounded-2xl" />
        <Skeleton className="h-20 rounded-2xl" />
      </div>
    );
  }

  return (
    <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
      <TabsList>
        <TabsTrigger value="active">
          Active{' '}
          <Badge variant="successSoft" size="sm" className="ml-2">
            {active.length}
          </Badge>
        </TabsTrigger>
        <TabsTrigger value="inactive">Inactive</TabsTrigger>
      </TabsList>

      <TabsContent value={tab} className="mt-5 space-y-3">
        {visible.length === 0 ? (
          <EmptyState
            icon={<Phone className="size-5" aria-hidden="true" />}
            title={tab === 'active' ? 'No active subscriptions' : 'No inactive subscriptions'}
            description={
              tab === 'active'
                ? 'Subscriptions you create will appear here.'
                : "When you cancel a subscription, it'll appear here."
            }
          />
        ) : (
          visible.map((sub) => (
            <Card key={sub.id} variant="default" density="compact">
              <CardContent className="flex items-center justify-between gap-3 px-5">
                <div className="flex items-center gap-3">
                  <span
                    className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-soft text-accent-foreground"
                    aria-hidden="true"
                  >
                    <CreditCard className="size-5" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold tracking-tight text-foreground">
                      {sub.name}
                    </p>
                    {sub.description && (
                      <p className="truncate text-xs text-muted-foreground">
                        {sub.description}
                      </p>
                    )}
                    {sub.status === 'paused' && (
                      <Badge variant="warningSoft" size="sm" className="mt-1">
                        Paused
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-sm font-bold tabular-nums text-foreground">
                      {fmt(sub.amount)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      /{cadenceLabel[sub.cadence]}
                    </p>
                  </div>
                  {sub.status !== 'cancelled' && (
                    <>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        aria-label={
                          sub.status === 'paused'
                            ? `Resume ${sub.name}`
                            : `Pause ${sub.name}`
                        }
                        disabled={busyId === sub.id}
                        onClick={() =>
                          handleSetStatus(
                            sub.id,
                            sub.status === 'paused' ? 'active' : 'paused',
                          )
                        }
                      >
                        {sub.status === 'paused' ? (
                          <Play className="size-4" aria-hidden="true" />
                        ) : (
                          <Pause className="size-4" aria-hidden="true" />
                        )}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Cancel ${sub.name}`}
                        disabled={busyId === sub.id}
                        onClick={() => handleSetStatus(sub.id, 'cancelled')}
                      >
                        <Trash2 className="size-4" aria-hidden="true" />
                      </Button>
                    </>
                  )}
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Options for ${sub.name}`}
                  >
                    <MoreHorizontal className="size-4" aria-hidden="true" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </TabsContent>
    </Tabs>
  );
}
