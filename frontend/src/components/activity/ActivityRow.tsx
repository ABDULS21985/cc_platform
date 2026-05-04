'use client';

import * as React from 'react';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Building2,
  CheckCircle2,
  Clock,
  CreditCard,
  MoreHorizontal,
  Receipt,
  RefreshCcw,
  XCircle,
  type LucideIcon,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { motion } from '@/components/ui/motion';
import { cn } from '@/lib/utils';
import type { ActivityItem, ActivityType } from './types';

interface TypeConfig {
  icon: LucideIcon;
  /** Tone class pair (bg + foreground) for the icon tile. */
  tone: string;
  /** Short label rendered as a chip. */
  label: string;
}

const TYPE_CONFIG: Record<ActivityType, TypeConfig> = {
  'transfer-in': {
    icon: ArrowDownLeft,
    tone: 'bg-success/15 text-success',
    label: 'Transfer in',
  },
  'transfer-out': {
    icon: ArrowUpRight,
    tone: 'bg-foreground/10 text-foreground',
    label: 'Transfer out',
  },
  deposit: {
    icon: Building2,
    tone: 'bg-success/15 text-success',
    label: 'Top up',
  },
  withdrawal: {
    icon: Building2,
    tone: 'bg-foreground/10 text-foreground',
    label: 'Withdrawal',
  },
  'bill-payment': {
    icon: Receipt,
    tone: 'bg-warning/15 text-warning',
    label: 'Bill paid',
  },
  'bill-received': {
    icon: Receipt,
    tone: 'bg-success/15 text-success',
    label: 'Bill received',
  },
  fee: {
    icon: CreditCard,
    tone: 'bg-info/15 text-info',
    label: 'Fee',
  },
  refund: {
    icon: RefreshCcw,
    tone: 'bg-info/15 text-info',
    label: 'Refund',
  },
  'card-charge': {
    icon: CreditCard,
    tone: 'bg-foreground/10 text-foreground',
    label: 'Card charge',
  },
};

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
    hour12: false,
  });
}

interface ActivityRowProps {
  item: ActivityItem;
  onSelect?: (id: string) => void;
}

export function ActivityRow({ item, onSelect }: ActivityRowProps) {
  const cfg = TYPE_CONFIG[item.type];
  const Icon = cfg.icon;

  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      className="group"
    >
      <button
        type="button"
        onClick={() => onSelect?.(item.id)}
        className={cn(
          'flex w-full items-start gap-3 rounded-xl border border-transparent p-3 text-left transition-colors',
          'hover:border-border hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          item.status === 'failed' && 'opacity-70'
        )}
      >
        {/* Icon */}
        <span
          className={cn(
            'grid size-10 shrink-0 place-items-center rounded-xl',
            cfg.tone
          )}
          aria-hidden="true"
        >
          <Icon className="size-5" />
        </span>

        {/* Body */}
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold tracking-tight text-foreground">
                {item.title}
              </p>
              <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                {item.description}
              </p>
            </div>

            {/* Amount */}
            <span
              className={cn(
                'shrink-0 text-sm font-bold tabular-nums tracking-tight',
                item.status === 'failed' && 'line-through text-muted-foreground',
                item.status !== 'failed' && item.direction === 'in'
                  ? 'text-success'
                  : 'text-foreground'
              )}
            >
              {item.direction === 'in' ? '+' : '−'}₦{item.amountFormatted}
            </span>
          </div>

          {/* Meta row */}
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
            <Badge variant="soft" size="sm">
              {cfg.label}
            </Badge>
            <StatusBadge status={item.status} />
            {item.community && (
              <>
                <span aria-hidden="true">·</span>
                <span className="truncate">{item.community.name}</span>
              </>
            )}
            {item.counterparty && (
              <>
                <span aria-hidden="true">·</span>
                <span className="truncate">
                  {item.counterparty.name}
                  {item.counterparty.bank && (
                    <>
                      {' '}
                      <span className="text-muted-foreground/70">
                        ({item.counterparty.bank}
                        {item.counterparty.tail && ` ·· ${item.counterparty.tail}`})
                      </span>
                    </>
                  )}
                </span>
              </>
            )}
            <span aria-hidden="true">·</span>
            <time
              dateTime={item.timestamp}
              className="font-mono tabular-nums"
            >
              {formatTime(item.timestamp)}
            </time>
            {item.fee && item.fee > 0 && (
              <>
                <span aria-hidden="true">·</span>
                <span>Fee ₦{item.fee.toLocaleString()}</span>
              </>
            )}
            {item.reference && (
              <>
                <span aria-hidden="true">·</span>
                <span className="font-mono text-muted-foreground/70">
                  Ref {item.reference}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Hover affordance */}
        <span
          className="ml-2 shrink-0 self-center text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
          aria-hidden="true"
        >
          <MoreHorizontal className="size-4" />
        </span>
      </button>
    </motion.li>
  );
}

function StatusBadge({ status }: { status: ActivityItem['status'] }) {
  if (status === 'success') {
    return (
      <Badge variant="successSoft" size="sm" className="gap-1">
        <CheckCircle2 className="size-2.5" aria-hidden="true" />
        Success
      </Badge>
    );
  }
  if (status === 'pending') {
    return (
      <Badge variant="warningSoft" size="sm" className="gap-1">
        <Clock className="size-2.5" aria-hidden="true" />
        Pending
      </Badge>
    );
  }
  return (
    <Badge variant="destructiveSoft" size="sm" className="gap-1">
      <XCircle className="size-2.5" aria-hidden="true" />
      Failed
    </Badge>
  );
}
