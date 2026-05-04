'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  MoreHorizontal,
  Receipt,
  Repeat,
  Users,
} from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { motion } from '@/components/ui/motion';
import { cn } from '@/lib/utils';
import type { BillItem, BillStatus } from './types';

const STATUS_CONFIG: Record<
  BillStatus,
  {
    label: string;
    badge: 'destructiveSoft' | 'warningSoft' | 'successSoft' | 'soft';
    pulse?: boolean;
  }
> = {
  overdue: { label: 'Overdue', badge: 'destructiveSoft', pulse: true },
  pending: { label: 'Pending', badge: 'warningSoft' },
  paid: { label: 'Paid', badge: 'successSoft' },
  cancelled: { label: 'Cancelled', badge: 'soft' },
};

function dueLabel(iso: string, status: BillStatus): string {
  const due = new Date(iso);
  const now = new Date();
  const startOfDay = (d: Date) => {
    const c = new Date(d);
    c.setHours(0, 0, 0, 0);
    return c;
  };
  const dayDiff = Math.round(
    (startOfDay(due).getTime() - startOfDay(now).getTime()) / (1000 * 60 * 60 * 24)
  );

  if (status === 'paid') {
    return due.toLocaleDateString(undefined, {
      day: 'numeric',
      month: 'short',
    });
  }
  if (dayDiff < 0) return `${Math.abs(dayDiff)}d overdue`;
  if (dayDiff === 0) return 'Due today';
  if (dayDiff === 1) return 'Due tomorrow';
  if (dayDiff <= 7) return `Due in ${dayDiff}d`;
  return `Due ${due.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}`;
}

interface BillCardProps {
  bill: BillItem;
  onPay?: (id: string) => void;
}

export function BillCard({ bill, onPay }: BillCardProps) {
  const router = useRouter();
  const status = STATUS_CONFIG[bill.status];
  const memberPct = Math.min(
    100,
    Math.round((bill.members.paid / bill.members.total) * 100)
  );
  const isPayable = bill.status === 'pending' || bill.status === 'overdue';

  // Detail page lives under the community route per the existing app structure.
  const detailHref = `/dashboard/community/${bill.community.id}/bill/${bill.id}`;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: 24 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
    >
      <Card
        variant="default"
        interactive
        role="article"
        onClick={() => router.push(detailHref)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') router.push(detailHref);
        }}
        aria-label={`${bill.title} from ${bill.community.name}`}
        className={cn(
          'group/bill overflow-hidden',
          bill.status === 'overdue' && 'border-destructive/30',
          bill.status === 'paid' && 'opacity-90'
        )}
      >
        <CardContent className="px-5 sm:px-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            {/* Left: identity */}
            <div className="flex min-w-0 flex-1 items-start gap-3">
              <Avatar className="size-11 rounded-xl">
                <AvatarFallback
                  className={cn(
                    'rounded-xl font-bold',
                    bill.status === 'overdue'
                      ? 'bg-destructive/15 text-destructive'
                      : bill.status === 'paid'
                        ? 'bg-success/15 text-success'
                        : 'bg-brand-soft text-accent-foreground'
                  )}
                >
                  {bill.community.initials}
                </AvatarFallback>
              </Avatar>

              <div className="min-w-0 flex-1">
                {/* Top meta row */}
                <div className="flex flex-wrap items-center gap-1.5">
                  <Badge variant={status.badge} size="sm" className="gap-1.5">
                    {status.pulse && (
                      <span
                        className="relative flex size-1.5"
                        aria-hidden="true"
                      >
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-destructive opacity-70" />
                        <span className="relative inline-flex size-1.5 rounded-full bg-destructive" />
                      </span>
                    )}
                    {status.label}
                  </Badge>
                  <span className="text-[11px] font-medium text-muted-foreground">
                    {bill.community.name}
                  </span>
                  <span aria-hidden="true" className="text-muted-foreground">
                    ·
                  </span>
                  <span className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
                    {bill.category}
                  </span>
                  {bill.isRecurring && (
                    <span
                      className="inline-flex items-center gap-1 rounded-full bg-info/15 px-1.5 py-0.5 text-[10px] font-semibold text-info"
                      title="Recurring bill"
                    >
                      <Repeat className="size-2.5" aria-hidden="true" />
                      Recurring
                    </span>
                  )}
                </div>

                <h3 className="mt-1.5 truncate text-base font-bold tracking-tight text-foreground transition-colors group-hover/bill:text-primary sm:text-lg">
                  {bill.title}
                </h3>

                {bill.description && (
                  <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                    {bill.description}
                  </p>
                )}

                <ul
                  className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground"
                  aria-label="Bill details"
                >
                  <li
                    className={cn(
                      'inline-flex items-center gap-1',
                      bill.status === 'overdue' && 'text-destructive font-semibold'
                    )}
                  >
                    {bill.status === 'overdue' ? (
                      <AlertCircle className="size-3.5" aria-hidden="true" />
                    ) : bill.status === 'paid' ? (
                      <CheckCircle2 className="size-3.5" aria-hidden="true" />
                    ) : (
                      <Receipt className="size-3.5" aria-hidden="true" />
                    )}
                    {bill.status === 'paid'
                      ? `Paid ${dueLabel(bill.paidAt ?? bill.dueAt, 'paid')}`
                      : dueLabel(bill.dueAt, bill.status)}
                  </li>
                  <li className="inline-flex items-center gap-1">
                    <Users className="size-3.5" aria-hidden="true" />
                    <span className="tabular-nums">
                      {bill.members.paid}/{bill.members.total}
                    </span>{' '}
                    paid
                  </li>
                  {bill.createdBy.isYou ? (
                    <li className="inline-flex items-center gap-1 font-semibold text-foreground">
                      <Badge variant="infoSoft" size="sm">
                        You created this
                      </Badge>
                    </li>
                  ) : (
                    <li>By {bill.createdBy.name}</li>
                  )}
                </ul>

                {/* Member-payment progress (creator view only — meaningful when total > 1) */}
                {bill.members.total > 1 && bill.status !== 'cancelled' && (
                  <div className="mt-3 max-w-md">
                    <div
                      className="h-1 w-full overflow-hidden rounded-full bg-muted"
                      role="progressbar"
                      aria-valuenow={memberPct}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-label="Member payment progress"
                    >
                      <div
                        className={cn(
                          'h-full rounded-full transition-all',
                          bill.status === 'paid'
                            ? 'bg-success'
                            : bill.status === 'overdue'
                              ? 'bg-destructive'
                              : 'bg-gradient-to-r from-brand to-brand-bright'
                        )}
                        style={{ width: `${memberPct}%` }}
                      />
                    </div>
                    <p className="mt-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                      {memberPct}% of members paid
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Right: amount + action */}
            <div
              className="flex items-center justify-between gap-3 sm:flex-col sm:items-end sm:gap-2"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-right">
                <p
                  className={cn(
                    'text-lg font-extrabold tabular-nums tracking-tight sm:text-xl',
                    bill.status === 'paid' && 'text-success'
                  )}
                >
                  ₦{bill.amountFormatted}
                </p>
                {bill.status === 'paid' && bill.paidVia && (
                  <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
                    via {bill.paidVia}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                {isPayable && (
                  <motion.div whileTap={{ scale: 0.97 }}>
                    <Button
                      type="button"
                      size="sm"
                      variant={bill.status === 'overdue' ? 'destructive' : 'default'}
                      onClick={() => onPay?.(bill.id)}
                    >
                      Pay now
                    </Button>
                  </motion.div>
                )}
                {bill.status === 'paid' && (
                  <Button asChild type="button" size="sm" variant="outline">
                    <Link
                      href={detailHref}
                      onClick={(e) => e.stopPropagation()}
                      className="inline-flex items-center gap-2"
                    >
                      Receipt
                      <ArrowRight className="size-3.5" aria-hidden="true" />
                    </Link>
                  </Button>
                )}
                <Button
                  type="button"
                  size="icon-sm"
                  variant="ghost"
                  aria-label="Bill options"
                >
                  <MoreHorizontal className="size-4" aria-hidden="true" />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
