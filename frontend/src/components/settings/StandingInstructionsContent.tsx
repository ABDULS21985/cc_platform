'use client';

import * as React from 'react';
import { useEffect, useState } from 'react';
import { Calendar, MoreHorizontal, Pause, Play, Plus, Repeat, Trash2 } from 'lucide-react';
import { AddInstructionsModal, type AddInstructionFormData } from './AddInstructionsModal';
import { PasswordConfirmModal } from './PasswordConfirmModal';
import { SplitPaymentModal, type SplitPaymentFormData } from './SplitPaymentModal';
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

function parseAmount(value: string): number {
  const normalized = value.replace(/[,\s₦]/g, '');
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function parseOptionalAmount(value: string): number | null {
  if (!value.trim()) return null;
  const parsed = parseAmount(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function toInstructionDateIso(value: string): string | null {
  if (!value) return null;
  return new Date(`${value}T08:00:00+01:00`).toISOString();
}

function buildCreatePayload(
  base: AddInstructionFormData,
  split: SplitPaymentFormData,
  pin: string,
): StandingInstructionCreatePayload | null {
  const amount = parseAmount(base.amount);
  if (!amount) return null;

  const startAt = toInstructionDateIso(base.startDate);
  const endAt = toInstructionDateIso(base.endDate);

  return {
    name: base.title,
    amount,
    currency: 'NGN',
    cadence: base.frequency,
    start_at: startAt,
    end_at: endAt,
    next_charge_at: startAt,
    destination_account_number: base.destinationAccountNumber,
    destination_bank_code: base.destinationBankCode,
    destination_account_name: base.destinationAccountName,
    split_member_name: split.splitMemberName || null,
    split_primary_amount: parseOptionalAmount(split.splitPrimaryAmount),
    split_secondary_amount: parseOptionalAmount(split.splitSecondaryAmount),
    pin,
  };
}

export function StandingInstructionsContent() {
  const [items, setItems] = useState<SubscriptionApi[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [isSplitModalOpen, setIsSplitModalOpen] = useState(false);
  const [draft, setDraft] = useState<AddInstructionFormData | null>(null);
  const [verifiedPin, setVerifiedPin] = useState('');
  const [pinError, setPinError] = useState<string | null>(null);
  const [verifyingPin, setVerifyingPin] = useState(false);
  const [creating, setCreating] = useState(false);
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

  const handleAddModalNext = (data: AddInstructionFormData) => {
    setDraft(data);
    setVerifiedPin('');
    setPinError(null);
    setIsAddModalOpen(false);
    setIsPasswordModalOpen(true);
  };

  const handlePasswordModalNext = async (pin: string) => {
    setVerifyingPin(true);
    setPinError(null);
    try {
      await ApiService.standingInstructions.verifyPin({ pin });
      setVerifiedPin(pin);
      setIsPasswordModalOpen(false);
      setIsSplitModalOpen(true);
    } catch {
      setPinError('PIN could not be verified');
      toast.error('PIN verification failed');
    } finally {
      setVerifyingPin(false);
    }
  };

  const handleSplitModalComplete = async (data: SplitPaymentFormData) => {
    if (!draft || !verifiedPin) {
      toast.error('Start the instruction again');
      return;
    }

    const payload = buildCreatePayload(draft, data, verifiedPin);
    if (!payload) {
      toast.error('Enter a valid amount');
      return;
    }

    setCreating(true);
    try {
      const res = await ApiService.standingInstructions.create(payload);
      const created = res.data?.data?.subscription;
      if (created) {
        setItems((prev) => [created, ...prev]);
      }
      closeAll();
      toast.success('Standing instruction created');
    } catch {
      toast.error('Could not create standing instruction');
    } finally {
      setCreating(false);
    }
  };

  const closeAll = () => {
    setIsAddModalOpen(false);
    setIsPasswordModalOpen(false);
    setIsSplitModalOpen(false);
    setDraft(null);
    setVerifiedPin('');
    setPinError(null);
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

  const deleteInstruction = async (id: number) => {
    setBusyId(id);
    try {
      await ApiService.standingInstructions.delete(id);
      setItems((prev) => prev.filter((it) => it.id !== id));
      toast.success('Deleted');
    } catch {
      toast.error('Delete failed');
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

  const visible = items;

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
                      {s.status === 'cancelled' && (
                        <Badge variant="soft" size="sm" className="mt-1">
                          Cancelled
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
                    {s.status !== 'cancelled' && (
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
                    )}
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label={
                        s.status === 'cancelled'
                          ? `Delete ${s.name}`
                          : `Cancel ${s.name}`
                      }
                      disabled={busyId === s.id}
                      onClick={() =>
                        s.status === 'cancelled'
                          ? deleteInstruction(s.id)
                          : setStatus(s.id, 'cancelled')
                      }
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
        title={draft?.title ?? ''}
        isSubmitting={verifyingPin}
        error={pinError}
      />
      <SplitPaymentModal
        isOpen={isSplitModalOpen}
        onClose={closeAll}
        onComplete={handleSplitModalComplete}
        title={draft?.title ?? ''}
        isSubmitting={creating}
      />
    </div>
  );
}
