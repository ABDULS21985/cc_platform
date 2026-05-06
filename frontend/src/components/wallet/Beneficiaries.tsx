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
import { motion } from '@/components/ui/motion';
import { cn } from '@/lib/utils';
import { ApiService } from '@/services/api';

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

interface ApiTx {
  signed_amount?: number | string;
  status?: string;
  transaction_type?: string;
  destination_account_name?: string | null;
  destination_account_number?: string | null;
  destination_bank_name?: string | null;
  meta?: {
    bank_code?: string | null;
    bank_name?: string | null;
    destination_bank_name?: string | null;
  } | null;
  community_id?: number | null;
  completed_at?: string;
  created_at?: string;
}

/**
 * Walk the user's transaction history and pull out unique recipients of
 * outgoing money (debits). We key by destination_account_number when we
 * have one, falling back to recipient name. Most-recent transfers come
 * first; we cap at 12 entries.
 */
function deriveBeneficiaries(items: ApiTx[]): Beneficiary[] {
  const sorted = [...items].sort((a, b) => {
    const aTs = new Date(a.completed_at ?? a.created_at ?? '').getTime() || 0;
    const bTs = new Date(b.completed_at ?? b.created_at ?? '').getTime() || 0;
    return bTs - aTs; // newest first
  });

  const seen = new Map<string, Beneficiary>();
  for (const t of sorted) {
    const status = String(t.status ?? '').toLowerCase();
    if (status && status !== 'successful' && status !== 'completed') continue;
    const signed = Number(t.signed_amount ?? 0);
    if (signed >= 0) continue; // only outgoing
    const name = (t.destination_account_name ?? '').trim();
    const acct = (t.destination_account_number ?? '').trim();
    if (!name && !acct) continue;
    const key = acct || name.toLowerCase();
    if (seen.has(key)) continue;
    const tail = acct ? acct.slice(-4) : '••••';
    const display = name || `Account ··${tail}`;
    const bankName =
      (t.destination_bank_name ?? '').trim() ||
      (t.meta?.destination_bank_name ?? '').trim() ||
      (t.meta?.bank_name ?? '').trim() ||
      'Bank';
    seen.set(key, {
      id: key,
      name: display,
      bank: bankName,
      accountTail: tail,
      accountNumber: acct || undefined,
      accountName: name || undefined,
      bankCode: (t.meta?.bank_code ?? '').trim() || undefined,
      initials: initialsFor(display),
      tone: TONES[seen.size % TONES.length],
      lastSent: relativeAge(t.completed_at ?? t.created_at ?? ''),
    });
    if (seen.size >= 12) break;
  }
  return [...seen.values()];
}

// Fallback used only when the user has no outgoing transactions yet, so the
// UI demonstrates what this card will show.
const SEED_BENEFICIARIES: Beneficiary[] = [
  {
    id: 'b1',
    name: 'Ada Lovelace',
    bank: 'Bell MFB',
    accountTail: '1234',
    initials: 'AL',
    tone: 'bg-brand text-primary-foreground',
    lastSent: '2 days ago',
    isFavorite: true,
  },
  {
    id: 'b2',
    name: 'Kunle Adeyemi',
    bank: 'GTBank',
    accountTail: '5871',
    initials: 'KA',
    tone: 'bg-info/30 text-info',
    lastSent: '5 days ago',
    isFavorite: true,
  },
  {
    id: 'b3',
    name: 'Trinity Co-op',
    bank: 'SafeHaven',
    accountTail: '0418',
    initials: 'TC',
    tone: 'bg-warning/30 text-warning',
    lastSent: '1 week ago',
  },
  {
    id: 'b4',
    name: 'Funmi Ojo',
    bank: 'Access',
    accountTail: '6629',
    initials: 'FO',
    tone: 'bg-success/30 text-success',
    lastSent: '2 weeks ago',
  },
  {
    id: 'b5',
    name: 'Lekki Block 3',
    bank: 'Bell MFB',
    accountTail: '2245',
    initials: 'LB',
    tone: 'bg-brand-bright/30 text-primary',
    lastSent: '3 weeks ago',
  },
  {
    id: 'b6',
    name: 'Bisi Ojo',
    bank: 'Zenith',
    accountTail: '8841',
    initials: 'BO',
    tone: 'bg-info/30 text-info',
  },
  {
    id: 'b7',
    name: 'Marathon vendor',
    bank: 'UBA',
    accountTail: '4422',
    initials: 'MV',
    tone: 'bg-warning/30 text-warning',
  },
];

interface BeneficiariesProps {
  onCreate: () => void;
  onSelect: (b: Beneficiary) => void;
}

export function Beneficiaries({ onCreate, onSelect }: BeneficiariesProps) {
  const scrollerRef = React.useRef<HTMLDivElement>(null);
  const [allOpen, setAllOpen] = React.useState(false);
  const [search, setSearch] = React.useState('');
  const [items, setItems] = React.useState<Beneficiary[] | null>(null);
  const [usingSeed, setUsingSeed] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await ApiService.wallet.getTransactions({ limit: 200 });
        const txs =
          ((res.data?.data as { transactions?: ApiTx[] })?.transactions ?? []) ||
          [];
        const derived = deriveBeneficiaries(txs);
        if (cancelled) return;
        if (derived.length === 0) {
          setItems(SEED_BENEFICIARIES);
          setUsingSeed(true);
        } else {
          setItems(derived);
          setUsingSeed(false);
        }
      } catch {
        if (!cancelled) {
          setItems(SEED_BENEFICIARIES);
          setUsingSeed(true);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

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
                  No matches.
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
