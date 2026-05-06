'use client';

import * as React from 'react';
import {
  Building2,
  Check,
  CreditCard,
  Plus,
  ShieldAlert,
  Star,
  Wallet,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { motion } from '@/components/ui/motion';
import { cn } from '@/lib/utils';
import { ApiService } from '@/services/api';

interface Source {
  id: string;
  type: 'bank' | 'card';
  name: string;
  /** Last 4 digits / account-tail. */
  tail: string;
  /** Optional brand label (Visa, Mastercard, GTBank, etc.). */
  brand: string;
  /** Bank tone. */
  tone: string;
  isPrimary?: boolean;
  isVerified?: boolean;
}

interface FundingSourcesProps {
  onAdd: () => void;
  onSetPrimary?: (id: string) => void;
}

export function FundingSources({ onAdd, onSetPrimary }: FundingSourcesProps) {
  const [sources, setSources] = React.useState<Source[] | null>(null);
  const [walletMissing, setWalletMissing] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await ApiService.wallet.getDetails();
        const w = res.data?.data;
        if (cancelled) return;
        if (!w?.account_number) {
          setSources([]);
          return;
        }
        const tail = w.account_number.slice(-4);
        setSources([
          {
            id: `wallet-${w.id}`,
            type: 'bank',
            name: 'CCPay wallet',
            tail,
            brand: w.bank_name || 'Wallet account',
            tone: 'bg-brand text-primary-foreground',
            isPrimary: true,
            isVerified: w.status?.toLowerCase() === 'active',
          },
        ]);
      } catch (err) {
        // 404 from /v2/wallet means the user hasn't completed identity
        // verification yet — surface that path instead of an error.
        if (!cancelled) {
          const status = (err as { response?: { status?: number } })?.response?.status;
          if (status === 404) {
            setWalletMissing(true);
            setSources([]);
          } else {
            setSources([]);
          }
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (sources === null) {
    return (
      <Card variant="default" density="compact">
        <CardContent className="space-y-4 px-5">
          <header className="flex items-center justify-between">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-7 w-12 rounded-md" />
          </header>
          <ul className="space-y-2">
            {Array.from({ length: 2 }).map((_, i) => (
              <li
                key={i}
                className="flex items-center gap-3 rounded-xl border border-border bg-card p-3"
              >
                <Skeleton className="size-10 rounded-xl" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3.5 w-2/3" />
                  <Skeleton className="h-2.5 w-1/2" />
                </div>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card variant="default" density="compact">
      <CardContent className="space-y-4 px-5">
        <header className="flex items-center justify-between">
          <h3 className="inline-flex items-center gap-2 text-sm font-semibold tracking-tight text-foreground">
            <span
              className="grid size-7 place-items-center rounded-lg bg-brand-soft text-accent-foreground"
              aria-hidden="true"
            >
              <Wallet className="size-3.5" />
            </span>
            Funding sources
          </h3>
          <Button
            type="button"
            size="sm"
            variant="outline"
            leadingIcon={<Plus className="size-3.5" />}
            onClick={onAdd}
          >
            Add
          </Button>
        </header>

        {walletMissing && (
          <div className="flex items-start gap-3 rounded-xl border border-warning/30 bg-warning/5 p-3">
            <span
              className="grid size-9 shrink-0 place-items-center rounded-xl bg-warning/15 text-warning"
              aria-hidden="true"
            >
              <ShieldAlert className="size-4" />
            </span>
            <div className="flex-1">
              <p className="text-sm font-semibold text-foreground">
                Verify identity to unlock funding
              </p>
              <p className="text-xs text-muted-foreground">
                Your wallet activates after BVN/NIN check.
              </p>
            </div>
            <Button asChild size="sm" variant="outline">
              <a href="/dashboard/settings?tab=verification">Verify</a>
            </Button>
          </div>
        )}

        {sources.length === 0 && !walletMissing && (
          <p className="text-xs text-muted-foreground">
            No linked sources yet. Adding a bank or card lets you top up
            instantly.
          </p>
        )}

        <ul role="list" className="space-y-2">
          {sources.map((s, i) => {
            const Icon = s.type === 'card' ? CreditCard : Building2;
            return (
              <motion.li
                key={s.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  delay: 0.04 * i,
                  duration: 0.3,
                  ease: [0.16, 1, 0.3, 1],
                }}
              >
                <div
                  className={cn(
                    'group flex items-center gap-3 rounded-xl border bg-card p-3 transition-colors',
                    s.isPrimary
                      ? 'border-primary/30 ring-1 ring-primary/20'
                      : 'border-border hover:border-input'
                  )}
                >
                  <span
                    className={cn(
                      'grid size-10 shrink-0 place-items-center rounded-xl shadow-sm',
                      s.tone
                    )}
                    aria-hidden="true"
                  >
                    <Icon className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-semibold tracking-tight text-foreground">
                        {s.name}
                      </p>
                      {s.isPrimary && (
                        <Badge variant="successSoft" size="sm" className="gap-1">
                          <Star
                            className="size-2.5 fill-current"
                            aria-hidden="true"
                          />
                          Primary
                        </Badge>
                      )}
                      {s.isVerified && (
                        <Badge variant="infoSoft" size="sm" className="gap-1">
                          <Check className="size-2.5" aria-hidden="true" />
                          Verified
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {s.brand} ·· {s.tail}
                    </p>
                  </div>
                  {!s.isPrimary && (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => onSetPrimary?.(s.id)}
                      className="shrink-0 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
                    >
                      Make primary
                    </Button>
                  )}
                </div>
              </motion.li>
            );
          })}
        </ul>

        <p className="text-[11px] text-muted-foreground">
          Linked accounts settle in seconds via Bell MFB. Cards are subject to
          Paystack&apos;s standard processing fees.
        </p>
      </CardContent>
    </Card>
  );
}
