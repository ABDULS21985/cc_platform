'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Calendar,
  Check,
  MoreHorizontal,
  Receipt,
  ShieldCheck,
  Sparkles,
  Trash2,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { motion } from '@/components/ui/motion';
import { cn } from '@/lib/utils';
import type { NotificationCategory, NotificationItem as Notif } from './types';

interface CategoryConfig {
  label: string;
  icon: LucideIcon;
  /** Tone class pair: bg + foreground. */
  tone: string;
}

export const CATEGORY_CONFIG: Record<NotificationCategory, CategoryConfig> = {
  money: {
    label: 'Money',
    icon: ArrowUpRight,
    tone: 'bg-success/15 text-success',
  },
  bills: {
    label: 'Bills',
    icon: Receipt,
    tone: 'bg-warning/15 text-warning',
  },
  communities: {
    label: 'Community',
    icon: Users,
    tone: 'bg-brand-soft text-accent-foreground',
  },
  events: {
    label: 'Events',
    icon: Calendar,
    tone: 'bg-info/15 text-info',
  },
  security: {
    label: 'Security',
    icon: ShieldCheck,
    tone: 'bg-destructive/15 text-destructive',
  },
  system: {
    label: 'System',
    icon: Sparkles,
    tone: 'bg-muted text-foreground',
  },
};

function relativeTime(iso: string): string {
  const now = Date.now();
  const t = new Date(iso).getTime();
  const diffMs = now - t;
  const mins = Math.round(diffMs / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}

interface NotificationRowProps {
  item: Notif;
  selected: boolean;
  onSelect: (id: string, selected: boolean) => void;
  onMarkRead: (id: string) => void;
  onDelete: (id: string) => void;
}

export function NotificationRow({
  item,
  selected,
  onSelect,
  onMarkRead,
  onDelete,
}: NotificationRowProps) {
  const cfg = CATEGORY_CONFIG[item.category];
  const Icon = cfg.icon;

  // Money category gets a directional icon overlay.
  const showAmount = item.category === 'money' && item.amount;
  const directionIcon =
    item.amount?.direction === 'in' ? ArrowDownLeft : ArrowUpRight;

  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: 24 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        'group relative flex items-start gap-3 rounded-xl border p-3 transition-colors',
        item.isRead
          ? 'border-border bg-card hover:bg-muted/40'
          : 'border-border bg-brand-soft/30 hover:bg-brand-soft/50',
        selected && 'border-primary ring-2 ring-primary/20'
      )}
    >
      {/* Selection checkbox (custom) */}
      <label
        className={cn(
          'mt-0.5 inline-flex shrink-0 cursor-pointer select-none items-center justify-center',
          'opacity-0 transition-opacity',
          'group-hover:opacity-100 focus-within:opacity-100',
          selected && 'opacity-100'
        )}
        aria-label={`Select notification: ${item.title}`}
      >
        <span
          className={cn(
            'grid size-5 place-items-center rounded-md border transition-colors',
            selected
              ? 'border-primary bg-primary text-primary-foreground'
              : 'border-input bg-background'
          )}
        >
          {selected && <Check className="size-3" aria-hidden="true" />}
        </span>
        <input
          type="checkbox"
          checked={selected}
          onChange={(e) => onSelect(item.id, e.target.checked)}
          className="sr-only"
        />
      </label>

      {/* Icon tile */}
      <div className="relative shrink-0">
        {item.initials ? (
          <Avatar className="size-10">
            <AvatarFallback className={cn('font-bold', cfg.tone)}>
              {item.initials}
            </AvatarFallback>
          </Avatar>
        ) : (
          <span
            className={cn(
              'grid size-10 place-items-center rounded-xl',
              cfg.tone
            )}
            aria-hidden="true"
          >
            <Icon className="size-5" />
          </span>
        )}
        {showAmount && (
          <span
            aria-hidden="true"
            className={cn(
              'absolute -bottom-1 -right-1 grid size-5 place-items-center rounded-full ring-2 ring-card',
              item.amount!.direction === 'in'
                ? 'bg-success text-success-foreground'
                : 'bg-foreground text-background'
            )}
          >
            {React.createElement(directionIcon, {
              className: 'size-3',
              'aria-hidden': true,
            })}
          </span>
        )}
      </div>

      {/* Body */}
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              {!item.isRead && (
                <span
                  aria-label="Unread"
                  className="inline-flex size-1.5 shrink-0 rounded-full bg-primary"
                />
              )}
              <p
                className={cn(
                  'truncate text-sm tracking-tight',
                  item.isRead ? 'text-foreground' : 'font-semibold text-foreground'
                )}
              >
                {item.title}
              </p>
            </div>
            <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
              {item.body}
            </p>
            <div className="mt-1.5 flex flex-wrap items-center gap-2">
              <Badge variant="soft" size="sm">
                {cfg.label}
              </Badge>
              <span className="text-[11px] text-muted-foreground">
                {item.source}
              </span>
              <span aria-hidden="true" className="text-muted-foreground">
                ·
              </span>
              <time
                className="text-[11px] text-muted-foreground"
                dateTime={item.timestamp}
              >
                {relativeTime(item.timestamp)}
              </time>
            </div>
          </div>

          {showAmount && (
            <span
              className={cn(
                'shrink-0 text-sm font-bold tabular-nums',
                item.amount!.direction === 'in'
                  ? 'text-success'
                  : 'text-foreground'
              )}
            >
              {item.amount!.direction === 'in' ? '+' : '−'}₦{item.amount!.value}
            </span>
          )}
        </div>

        {/* Hover actions */}
        <div
          className={cn(
            'mt-2 flex items-center gap-1.5 opacity-0 transition-opacity',
            'group-hover:opacity-100 focus-within:opacity-100'
          )}
        >
          {item.actionHref && (
            <Button asChild size="sm" variant="outline">
              <Link
                href={item.actionHref}
                onClick={() => {
                  if (!item.isRead) onMarkRead(item.id);
                }}
              >
                {item.actionLabel ?? 'Open'}
              </Link>
            </Button>
          )}
          {!item.isRead && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => onMarkRead(item.id)}
              leadingIcon={<Check className="size-3.5" />}
            >
              Mark read
            </Button>
          )}
          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            aria-label="Delete notification"
            onClick={() => onDelete(item.id)}
          >
            <Trash2 className="size-3.5" aria-hidden="true" />
          </Button>
          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            aria-label="More options"
          >
            <MoreHorizontal className="size-3.5" aria-hidden="true" />
          </Button>
        </div>
      </div>
    </motion.li>
  );
}
