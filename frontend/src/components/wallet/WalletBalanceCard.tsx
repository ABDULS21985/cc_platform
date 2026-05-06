'use client';

import { useState, useEffect } from 'react';
import { ApiService } from '@/services/api';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowDownToLine, ArrowUpRight, Eye, EyeOff, Plus, Wallet } from 'lucide-react';
import { toastAxiosError } from '@/hooks/useAxiosError';
import { cn } from '@/lib/utils';

const QUICK_ACTIONS = [
  { id: 'fund', label: 'Fund', icon: Plus },
  { id: 'send', label: 'Send', icon: ArrowUpRight },
  { id: 'withdraw', label: 'Withdraw', icon: ArrowDownToLine },
  { id: 'account', label: 'Account', icon: Wallet },
] as const;

type QuickActionId = (typeof QUICK_ACTIONS)[number]['id'];

interface WalletBalanceCardProps {
  onAction: (id: QuickActionId) => void;
  refreshKey?: number;
}

export default function WalletBalanceCard({
  onAction,
  refreshKey = 0,
}: WalletBalanceCardProps) {
  const [balance, setBalance] = useState<string>('0.00');
  const [loading, setLoading] = useState(true);
  const [isBalanceVisible, setIsBalanceVisible] = useState(true);

  useEffect(() => {
    const fetchWallet = async () => {
      setLoading(true);
      try {
        const response = await ApiService.wallet.getSummary();
        if (response.data.data.wallet) {
          setBalance(response.data.data.wallet.balance);
        }
      } catch (error) {
        toastAxiosError(error, 'Failed to load wallet balance.');
      } finally {
        setLoading(false);
      }
    };
    fetchWallet();
  }, [refreshKey]);

  return (
    <>
      <section
        aria-labelledby="wallet-balance-heading"
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand to-[oklch(0.18_0.025_220)] p-7 text-white shadow-lg"
      >
        {/* Subtle highlights */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-16 -top-24 h-64 w-64 rounded-full bg-white/10 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-16 -left-12 h-40 w-40 rounded-full bg-white/8 blur-3xl"
        />

        <div className="relative space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 backdrop-blur-md">
              <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/80">
                Active balance
              </span>
              <button
                type="button"
                onClick={() => setIsBalanceVisible((v) => !v)}
                aria-label={isBalanceVisible ? 'Hide balance' : 'Show balance'}
                aria-pressed={!isBalanceVisible}
                className="text-white/70 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 rounded-full"
              >
                {isBalanceVisible ? (
                  <Eye className="size-3.5" aria-hidden="true" />
                ) : (
                  <EyeOff className="size-3.5" aria-hidden="true" />
                )}
              </button>
            </div>
            <span
              className="grid size-10 place-items-center rounded-xl border border-white/15 bg-white/10 text-[10px] font-bold backdrop-blur-md"
              aria-label="Currency: Nigerian Naira"
            >
              NGN
            </span>
          </div>

          {/* Balance */}
          <div className="space-y-1">
            <h2
              id="wallet-balance-heading"
              className="text-xs font-medium uppercase tracking-widest text-white/70"
            >
              Total available funds
            </h2>
            {loading ? (
              <Skeleton className="h-12 w-56 rounded-2xl bg-white/15" />
            ) : (
              <div
                className="flex items-baseline gap-1"
                aria-live="polite"
                aria-atomic="true"
              >
                <span className="text-2xl font-bold text-white/70">₦</span>
                <span
                  className={cn(
                    'text-5xl font-black tracking-tighter tabular-nums',
                    !isBalanceVisible && 'tracking-[0.1em]'
                  )}
                >
                  {isBalanceVisible
                    ? Number(balance).toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                      })
                    : '••••••'}
                </span>
              </div>
            )}
          </div>

          {/* Quick actions */}
          <div className="grid grid-cols-4 gap-2 pt-1">
            {QUICK_ACTIONS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => onAction(id)}
                className={cn(
                  'group flex flex-col items-center justify-center gap-1.5 rounded-2xl border border-white/15 bg-white/10 p-3 backdrop-blur-md',
                  'text-xs font-semibold text-white transition-colors hover:bg-white/20',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60'
                )}
              >
                <span className="grid size-8 place-items-center rounded-full bg-white/15 transition-transform group-hover:scale-105">
                  <Icon className="size-4" aria-hidden="true" />
                </span>
                {label}
              </button>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
