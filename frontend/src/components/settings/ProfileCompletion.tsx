'use client';

import * as React from 'react';
import {
  CheckCircle2,
  Circle,
  Fingerprint,
  Image as ImageIcon,
  Mail,
  ShieldCheck,
  Smartphone,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { motion } from '@/components/ui/motion';
import { ApiService, type ProfileData } from '@/services/api';
import { cn } from '@/lib/utils';

interface ProfileItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  done: boolean;
  /** Tab id to navigate to when this row is clicked. */
  tab: string;
}

interface ProfileCompletionProps {
  onJumpTo?: (tab: string) => void;
}

type UserShape = Partial<ProfileData> & {
  email_verified?: boolean;
  phone_number?: string | null;
  bvn_verified?: boolean;
  nin_verified?: boolean;
  profile_photo?: string | null;
  profile_image?: string | null;
  bio?: string | null;
};

/**
 * Compact progress card that surfaces what's left for the user to complete
 * on their profile. Each item is clickable and routes the parent to the
 * appropriate settings tab.
 */
export function ProfileCompletion({ onJumpTo }: ProfileCompletionProps) {
  const [user, setUser] = React.useState<UserShape | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    ApiService.profile.get()
      .then((res) => {
        if (!cancelled) setUser(res.data?.data ?? null);
      })
      .catch(() => {
        if (!cancelled) setUser(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const items: ProfileItem[] = [
    {
      id: 'email',
      label: 'Email verified',
      icon: Mail,
      done: !!user?.email_verified,
      tab: 'verification',
    },
    {
      id: 'phone',
      label: 'Phone number',
      icon: Smartphone,
      done: !!user?.phone_number,
      tab: 'account-info',
    },
    {
      id: 'avatar',
      label: 'Profile photo',
      icon: ImageIcon,
      done: !!(user?.profile_photo || user?.profile_image),
      tab: 'account-info',
    },
    {
      id: 'bvn',
      label: 'BVN verified',
      icon: Fingerprint,
      done: !!user?.bvn_verified,
      tab: 'verification',
    },
    {
      id: 'nin',
      label: 'NIN verified',
      icon: ShieldCheck,
      done: !!user?.nin_verified,
      tab: 'verification',
    },
  ];

  const completed = items.filter((i) => i.done).length;
  const total = items.length;
  const pct = Math.round((completed / total) * 100);
  if (pct === 100) return null;

  return (
    <Card variant="default" className="overflow-hidden">
      <CardContent className="space-y-4">
        <header className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Profile completion
            </p>
            <h3 className="mt-0.5 text-lg font-bold tracking-tight text-foreground">
              You&apos;re {pct}% there.
            </h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Complete the remaining steps to unlock higher transaction limits
              and the full feature set.
            </p>
          </div>
          <Badge variant={pct < 60 ? 'warningSoft' : 'successSoft'} size="lg">
            {completed}/{total}
          </Badge>
        </header>

        {/* Progress */}
        <div className="flex items-center gap-2">
          <div
            role="progressbar"
            aria-valuenow={pct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Profile completion"
            className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted"
          >
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className="h-full rounded-full bg-gradient-to-r from-brand to-brand-bright"
            />
          </div>
          <span className="text-[11px] font-bold tabular-nums text-foreground">
            {pct}%
          </span>
        </div>

        {/* Steps */}
        <ul role="list" className="grid grid-cols-1 gap-1.5 sm:grid-cols-2 lg:grid-cols-5">
          {items.map((it) => (
            <li key={it.id}>
              <button
                type="button"
                onClick={() => onJumpTo?.(it.tab)}
                aria-label={`${it.label}${it.done ? ' (done)' : ' — go to step'}`}
                className={cn(
                  'group flex w-full items-center gap-2.5 rounded-xl border px-3 py-2 text-left text-xs transition-colors',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                  it.done
                    ? 'border-success/30 bg-success/5 text-foreground'
                    : 'border-border bg-muted/30 hover:border-input hover:bg-muted/60'
                )}
              >
                <span
                  className={cn(
                    'grid size-7 shrink-0 place-items-center rounded-full transition-colors',
                    it.done
                      ? 'bg-success/15 text-success'
                      : 'bg-muted text-muted-foreground group-hover:bg-card'
                  )}
                  aria-hidden="true"
                >
                  {it.done ? (
                    <CheckCircle2 className="size-3.5" />
                  ) : (
                    <Circle className="size-3.5" />
                  )}
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block truncate font-semibold">{it.label}</span>
                </span>
                <it.icon
                  className={cn(
                    'size-3.5 shrink-0 transition-colors',
                    it.done ? 'text-success' : 'text-muted-foreground'
                  )}
                  aria-hidden="true"
                />
              </button>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
