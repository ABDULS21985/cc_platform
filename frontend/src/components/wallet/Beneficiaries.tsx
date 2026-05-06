'use client';

import * as React from 'react';
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Plus,
  Search,
  Users,
} from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { motion } from '@/components/ui/motion';
import { cn } from '@/lib/utils';
import { ApiService, type WalletBeneficiary } from '@/services/api';
import { toastAxiosError } from '@/hooks/useAxiosError';

export interface Beneficiary {
  id: string;
  name: string;
  bank: string;
  /** Last 4 digits, masked. */
  accountTail: string;
  accountNumber?: string;
  accountName?: string;
  bankCode?: string;
  initials: string;
  /** Tone for the avatar fallback bg. */
  tone: string;
  /** Last transfer date / amount (display only). */
  lastSent?: string;
  isFavorite?: boolean;
}

const TONES = [
  'bg-brand text-primary-foreground',
  'bg-info/30 text-info',
  'bg-warning/30 text-warning',
  'bg-success/30 text-success',
  'bg-brand-bright/30 text-primary',
];

function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function relativeAge(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  if (Number.isNaN(ms)) return '';
  const days = Math.floor(ms / (24 * 60 * 60 * 1000));
  if (days < 1) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
  return `${Math.floor(days / 30)} months ago`;
}

function mapBeneficiary(item: WalletBeneficiary, index: number): Beneficiary {
  const display = item.name || item.account_name || `Account ${item.account_number.slice(-4)}`;
  return {
    id: String(item.id),
    name: display,
    bank: item.bank_name,
    accountTail: item.account_number.slice(-4),
    accountNumber: item.account_number,
    accountName: item.account_name,
    bankCode: item.bank_code,
    initials: initialsFor(display),
    tone: TONES[index % TONES.length],
    lastSent: item.last_used_at ? relativeAge(item.last_used_at) : undefined,
    isFavorite: item.is_favorite,
  };
}

interface BeneficiariesProps {
  onCreate: () => void;
  onSelect: (b: Beneficiary) => void;
  refreshKey?: number;
}

export function Beneficiaries({ onCreate, onSelect, refreshKey = 0 }: BeneficiariesProps) {
  const scrollerRef = React.useRef<HTMLDivElement>(null);
  const [allOpen, setAllOpen] = React.useState(false);
  const [search, setSearch] = React.useState('');
  const [items, setItems] = React.useState<Beneficiary[] | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await ApiService.wallet.getBeneficiaries({ limit: 50 });
        const beneficiaries = res.data.data.beneficiaries ?? [];
        if (cancelled) return;
        setItems(beneficiaries.map(mapBeneficiary));
      } catch (error) {
        if (!cancelled) {
          setItems([]);
          toastAxiosError(error, 'Failed to load saved recipients.');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  const list = items ?? [];
  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (b) =>
        b.name.toLowerCase().includes(q) ||
        b.bank.toLowerCase().includes(q) ||
        b.accountTail.includes(q)
    );
  }, [search, list]);

  const scrollBy = (delta: number) =>
    scrollerRef.current?.scrollBy({ left: delta, behavior: 'smooth' });

  return (
    <Card variant="default" density="compact">
      <CardContent className="space-y-4 px-5">
        <header className="flex items-center justify-between gap-3">
          <div>
            <h3 className="inline-flex items-center gap-2 text-sm font-semibold tracking-tight text-foreground">
              <span
                className="grid size-7 place-items-center rounded-lg bg-brand-soft text-accent-foreground"
                aria-hidden="true"
              >
                <Users className="size-3.5" />
              </span>
              Saved recipients
            </h3>
            <p className="text-xs text-muted-foreground">
              Tap to start a transfer.
            </p>
          </div>
          <div className="flex items-center gap-1">
            <div
              className="hidden items-center gap-1 sm:flex"
              role="group"
              aria-label="Scroll recipients"
            >
              <Button
                type="button"
                size="icon-sm"
                variant="outline"
                onClick={() => scrollBy(-280)}
                aria-label="Scroll left"
              >
                <ChevronLeft className="size-4" aria-hidden="true" />
              </Button>
              <Button
                type="button"
                size="icon-sm"
                variant="outline"
                onClick={() => scrollBy(280)}
                aria-label="Scroll right"
              >
                <ChevronRight className="size-4" aria-hidden="true" />
              </Button>
            </div>
            <button
              type="button"
              onClick={() => setAllOpen(true)}
              className="inline-flex items-center gap-1 rounded-md px-1 text-xs font-semibold text-primary hover:underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              See all
              <ArrowRight className="size-3" aria-hidden="true" />
            </button>
          </div>
        </header>

        <div
          ref={scrollerRef}
          className="custom-scrollbar -mx-1 flex snap-x snap-mandatory gap-2 overflow-x-auto px-1 pb-1"
        >
          {/* Add new tile */}
          <motion.button
            type="button"
            whileTap={{ scale: 0.97 }}
            onClick={onCreate}
            className={cn(
              'flex w-[112px] shrink-0 snap-start flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border bg-muted/30 p-3 text-center transition-colors',
              'hover:border-input hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
            )}
            aria-label="Add a new recipient"
          >
            <span className="grid size-12 place-items-center rounded-full bg-card text-foreground shadow-xs">
              <Plus className="size-5" aria-hidden="true" />
            </span>
            <span className="text-[11px] font-semibold tracking-tight text-foreground">
              New
            </span>
            <span className="text-[10px] text-muted-foreground">
              Add recipient
            </span>
          </motion.button>

          {items === null
            ? Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={`skel-${i}`}
                  className="flex w-[112px] shrink-0 snap-start flex-col items-center gap-2 rounded-2xl border border-border bg-card p-3"
                >
                  <Skeleton className="size-12 rounded-full" />
                  <Skeleton className="h-2.5 w-3/4" />
                  <Skeleton className="h-2 w-1/2" />
                </div>
              ))
            : null}
          {list.map((b, i) => (
            <motion.button
              key={b.id}
              type="button"
              whileTap={{ scale: 0.97 }}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                delay: 0.03 * i,
                duration: 0.3,
                ease: [0.16, 1, 0.3, 1],
              }}
              onClick={() => onSelect(b)}
              className={cn(
                'group flex w-[112px] shrink-0 snap-start flex-col items-center gap-2 rounded-2xl border border-border bg-card p-3 text-center transition-colors',
                'hover:border-input hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
              )}
              aria-label={`Send to ${b.name}, ${b.bank} ending ${b.accountTail}`}
            >
              <div className="relative">
                <Avatar className="size-12">
                  <AvatarFallback className={cn('font-bold', b.tone)}>
                    {b.initials}
                  </AvatarFallback>
                </Avatar>
                {b.isFavorite && (
                  <span
                    aria-label="Favorite"
                    className="absolute -bottom-0.5 -right-0.5 grid size-4 place-items-center rounded-full bg-warning text-[10px] font-bold text-warning-foreground ring-2 ring-card"
                  >
                    ★
                  </span>
                )}
              </div>
              <span className="line-clamp-1 text-[11px] font-semibold tracking-tight text-foreground transition-colors group-hover:text-primary">
                {b.name}
              </span>
              <span className="text-[10px] text-muted-foreground">
                {b.bank} ·· {b.accountTail}
              </span>
            </motion.button>
          ))}
        </div>

        {items !== null && list.length === 0 ? (
          <EmptyState
            icon={<Users className="size-5" aria-hidden="true" />}
            title="No saved recipients"
            description="Add a recipient to keep their bank details ready for your next transfer."
          />
        ) : null}
      </CardContent>

      {/* All recipients sheet */}
      <Sheet open={allOpen} onOpenChange={setAllOpen}>
        <SheetContent
          side="right"
          title="All recipients"
          description="Search and pick someone to pay."
        >
          <div className="space-y-4">
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search name, bank, or account…"
                className="h-11 pl-10"
                aria-label="Search recipients"
              />
            </div>

            <ul role="list" className="space-y-2">
              {filtered.length === 0 ? (
                <li className="rounded-xl border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
                  {list.length === 0 ? 'No saved recipients yet.' : 'No matches.'}
                </li>
              ) : (
                filtered.map((b) => (
                  <li key={b.id}>
                    <button
                      type="button"
                      onClick={() => {
                        onSelect(b);
                        setAllOpen(false);
                      }}
                      className="flex w-full items-center gap-3 rounded-xl border border-transparent p-2.5 text-left transition-colors hover:border-border hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <Avatar className="size-10">
                        <AvatarFallback className={cn('font-bold', b.tone)}>
                          {b.initials}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold tracking-tight text-foreground">
                          {b.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {b.bank} ·· {b.accountTail}
                        </p>
                      </div>
                      {b.lastSent && (
                        <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
                          {b.lastSent}
                        </span>
                      )}
                    </button>
                  </li>
                ))
              )}
            </ul>
          </div>
        </SheetContent>
      </Sheet>
    </Card>
  );
}
