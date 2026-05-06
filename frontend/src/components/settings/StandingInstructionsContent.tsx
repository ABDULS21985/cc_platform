'use client';

import * as React from 'react';
import { useEffect, useState } from 'react';
import { Calendar, MoreHorizontal, Pause, Play, Plus, Repeat, Trash2 } from 'lucide-react';
import { AddInstructionsModal } from './AddInstructionsModal';
import { PasswordConfirmModal } from './PasswordConfirmModal';
import { SplitPaymentModal } from './SplitPaymentModal';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import {
  ApiService,
  type SubscriptionApi,
  type StandingInstructionCreatePayload,
} from '@/services/api';
import { toast } from 'sonner';

const fmt = (n: number) => `₦${n.toLocaleString('en-NG')}`;

const cadenceLabel: Record<SubscriptionApi['cadence'], string> = {
  weekly: 'Weekly',
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  yearly: 'Yearly',
};

function formatNextRun(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString(undefined, {
    day: '2-digit',
    month: 'short',
  });
}

export function StandingInstructionsContent() {
  const [items, setItems] = useState<SubscriptionApi[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [isSplitModalOpen, setIsSplitModalOpen] = useState(false);
  const [currentTitle, setCurrentTitle] = useState('');
  const [busyId, setBusyId] = useState<number | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await ApiService.standingInstructions.list({ limit: 100 });
      setItems(res.data?.data?.subscriptions ?? []);
    } catch {
      toast.error('Could not load standing instructions');
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleAddModalNext = (data: { title: string }) => {
    setCurrentTitle(data.title);
    setIsAddModalOpen(false);
    setIsPasswordModalOpen(true);
  };

  const handlePasswordModalNext = () => {
    setIsPasswordModalOpen(false);
    setIsSplitModalOpen(true);
  };

  const handleSplitModalComplete = async (data: unknown) => {
    setIsSplitModalOpen(false);
    // The split modal currently emits an opaque shape; map only what we know.
    const split = (data as Partial<StandingInstructionCreatePayload>) ?? {};
    const payload: StandingInstructionCreatePayload = {
      name: currentTitle || 'Standing instruction',
      amount: typeof split.amount === 'number' ? split.amount : 0,
      cadence: split.cadence ?? 'monthly',
      destination_account_number: split.destination_account_number ?? '',
      destination_bank_code: split.destination_bank_code ?? '',
      destination_account_name: split.destination_account_name ?? '',
    };
    if (!payload.amount || !payload.destination_account_number) {
      toast.info('Saved as draft (complete in wallet to activate)');
      return;
    }
    try {
      const res = await ApiService.standingInstructions.create(payload);
      const created = res.data?.data?.subscription;
      if (created) {
        setItems((prev) => [created, ...prev]);
      }
      toast.success('Standing instruction created');
    } catch {
      toast.error('Could not create standing instruction');
    }
  };

  const closeAll = () => {
    setIsAddModalOpen(false);
    setIsPasswordModalOpen(false);
    setIsSplitModalOpen(false);
    setCurrentTitle('');
  };

  const setStatus = async (id: number, next: 'active' | 'paused' | 'cancelled') => {
    setBusyId(id);
    try {
      const res = await ApiService.standingInstructions.setStatus(id, next);
      const updated = res.data?.data?.subscription;
      if (updated) {
        setItems((prev) => prev.map((it) => (it.id === id ? updated : it)));
      }
      toast.success(
        next === 'paused'
          ? 'Paused'
          : next === 'active'
            ? 'Resumed'
            : 'Cancelled',
      );
    } catch {
      toast.error('Update failed');
    } finally {
      setBusyId(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-8 w-1/3 rounded" />
        <Skeleton className="h-20 rounded-2xl" />
        <Skeleton className="h-20 rounded-2xl" />
      </div>
    );
  }

  const visible = items.filter((i) => i.status !== 'cancelled');

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Scheduled transfers that run automatically.
        </p>
        <Button
          type="button"
          size="sm"
          onClick={() => setIsAddModalOpen(true)}
          leadingIcon={<Plus className="size-3.5" />}
        >
          New instruction
        </Button>
      </div>

      {visible.length === 0 ? (
        <EmptyState
          icon={<Repeat className="size-5" aria-hidden="true" />}
          title="No standing instructions"
          description="Create one to schedule a transfer that runs on a cadence."
        />
      ) : (
        <ul className="space-y-3" role="list">
          {visible.map((s) => (
            <li key={s.id}>
              <Card variant="default" density="compact">
                <CardContent className="flex items-center justify-between gap-3 px-5">
                  <div className="flex items-center gap-3">
                    <span
                      className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-soft text-accent-foreground"
                      aria-hidden="true"
                    >
                      <Repeat className="size-5" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold tracking-tight text-foreground">
                        {s.name}
                      </p>
                      {s.description && (
                        <p className="truncate text-xs text-muted-foreground">
                          {s.description}
                        </p>
                      )}
                      {s.status === 'paused' && (
                        <Badge variant="warningSoft" size="sm" className="mt-1">
                          Paused
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge
                      variant="soft"
                      size="sm"
                      className="hidden gap-1 sm:inline-flex"
                    >
                      <Calendar className="size-3" aria-hidden="true" />
                      Next {formatNextRun(s.next_charge_at)}
                    </Badge>
                    <div className="text-right">
                      <p className="text-sm font-bold tabular-nums text-foreground">
                        {fmt(s.amount)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        /{cadenceLabel[s.cadence]}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label={
                        s.status === 'paused'
                          ? `Resume ${s.name}`
                          : `Pause ${s.name}`
                      }
                      disabled={busyId === s.id}
                      onClick={() =>
                        setStatus(s.id, s.status === 'paused' ? 'active' : 'paused')
                      }
                    >
                      {s.status === 'paused' ? (
                        <Play className="size-4" aria-hidden="true" />
                      ) : (
                        <Pause className="size-4" aria-hidden="true" />
                      )}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Cancel ${s.name}`}
                      disabled={busyId === s.id}
                      onClick={() => setStatus(s.id, 'cancelled')}
                    >
                      <Trash2 className="size-4" aria-hidden="true" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Options for ${s.name}`}
                    >
                      <MoreHorizontal className="size-4" aria-hidden="true" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}

      <AddInstructionsModal
        isOpen={isAddModalOpen}
        onClose={closeAll}
        onNext={handleAddModalNext}
      />
      <PasswordConfirmModal
        isOpen={isPasswordModalOpen}
        onClose={closeAll}
        onNext={handlePasswordModalNext}
        title={currentTitle}
      />
      <SplitPaymentModal
        isOpen={isSplitModalOpen}
        onClose={closeAll}
        onComplete={handleSplitModalComplete}
        title={currentTitle}
      />
    </div>
  );
}
