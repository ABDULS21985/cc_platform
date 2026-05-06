'use client';

import * as React from 'react';
import { useEffect, useState } from 'react';
import {
  ArrowDownLeft,
  Bell,
  Calendar,
  Lock,
  Mail,
  MessageSquare,
  Receipt,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Users,
} from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { ApiService, type NotificationPreferencesApi } from '@/services/api';
import { cn } from '@/lib/utils';

interface ChannelPref {
  id: 'email' | 'sms' | 'push' | 'in_app';
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  enabled: boolean;
  /** Channels other than `in_app` are not yet wired to the backend. */
  comingSoon?: boolean;
}

const CHANNELS: ChannelPref[] = [
  {
    id: 'in_app',
    label: 'In-app',
    description: 'Notifications in your dashboard inbox and bell.',
    icon: Bell,
    enabled: true,
  },
  {
    id: 'email',
    label: 'Email',
    description: 'Receipts, alerts, and digest emails.',
    icon: Mail,
    enabled: true,
  },
  {
    id: 'sms',
    label: 'SMS',
    description: 'Transaction confirmations and security codes (Nigerian numbers).',
    icon: MessageSquare,
    enabled: true,
  },
  {
    id: 'push',
    label: 'Mobile push',
    description: 'Real-time alerts on your phone.',
    icon: Smartphone,
    enabled: true,
  },
];

type CategoryKey = 'money' | 'bills' | 'communities' | 'events' | 'security' | 'system';

interface CategoryPref {
  id: CategoryKey;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  /** Locked-on (cannot be muted). */
  locked?: boolean;
}

const CATEGORIES: CategoryPref[] = [
  {
    id: 'money',
    label: 'Money movements',
    description: 'Transfers, deposits, withdrawals, and reversals.',
    icon: ArrowDownLeft,
  },
  {
    id: 'bills',
    label: 'Bills & dues',
    description: 'New bills, reminders, and overdue alerts.',
    icon: Receipt,
  },
  {
    id: 'communities',
    label: 'Community activity',
    description: 'Joins, role changes, and posts in your circles.',
    icon: Users,
  },
  {
    id: 'events',
    label: 'Events',
    description: 'New events, reminders, and host updates.',
    icon: Calendar,
  },
  {
    id: 'security',
    label: 'Security',
    description:
      'Sign-ins, password changes, and account alerts. Always on for safety.',
    icon: ShieldCheck,
    locked: true,
  },
  {
    id: 'system',
    label: 'Product updates',
    description: 'New features and platform announcements.',
    icon: Sparkles,
  },
];

const DEFAULT_PREFS: Record<CategoryKey, boolean> = {
  money: true,
  bills: true,
  communities: true,
  events: true,
  security: true,
  system: true,
};

type DigestFrequency = 'off' | 'daily' | 'weekly';

const DIGEST_OPTIONS: Array<{ id: DigestFrequency; label: string; description: string }> = [
  { id: 'off', label: 'Off', description: 'Only realtime in-app alerts.' },
  { id: 'daily', label: 'Daily', description: 'A summary email each morning of unread items.' },
  { id: 'weekly', label: 'Weekly', description: 'A round-up every Monday morning.' },
];

type ChannelKey = 'in-app' | 'email' | 'sms' | 'push';

export function NotificationPreferencesContent() {
  const [prefs, setPrefs] = useState<Record<CategoryKey, boolean>>(DEFAULT_PREFS);
  const [channels, setChannels] = useState<Record<ChannelKey, boolean>>({
    'in-app': true,
    email: true,
    sms: false,
    push: false,
  });
  const [digest, setDigest] = useState<DigestFrequency>('off');
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<CategoryKey | null>(null);
  const [savingChannel, setSavingChannel] = useState<ChannelKey | null>(null);
  const [savingDigest, setSavingDigest] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await ApiService.notifications.getPreferences();
        const remote = res.data?.data?.preferences as
          | (NotificationPreferencesApi & {
              channel_email?: boolean;
              channel_sms?: boolean;
              channel_push?: boolean;
            })
          | undefined;
        if (!cancelled && remote) {
          setPrefs({
            money: remote.money,
            bills: remote.bills,
            communities: remote.communities,
            events: remote.events,
            security: remote.security,
            system: remote.system,
          });
          setChannels({
            'in-app': true,
            email: remote.channel_email ?? true,
            sms: remote.channel_sms ?? false,
            push: remote.channel_push ?? false,
          });
          if (remote.digest_frequency) setDigest(remote.digest_frequency);
        }
      } catch {
        // keep defaults
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const toggleChannel = async (id: ChannelKey, value: boolean) => {
    if (id === 'in-app') return;
    const prev = channels[id];
    setChannels((c) => ({ ...c, [id]: value }));
    setSavingChannel(id);
    const fieldMap: Record<Exclude<ChannelKey, 'in-app'>, string> = {
      email: 'channel_email',
      sms: 'channel_sms',
      push: 'channel_push',
    };
    try {
      await ApiService.notifications.updatePreferences({
        [fieldMap[id]]: value,
      } as Partial<Omit<NotificationPreferencesApi, 'user_id' | 'updated_at' | 'security'>>);
      toast.success(`${value ? 'Enabled' : 'Disabled'} ${id.toUpperCase()}`);
    } catch {
      setChannels((c) => ({ ...c, [id]: prev }));
      toast.error('Could not update channel');
    } finally {
      setSavingChannel(null);
    }
  };

  const updateDigest = async (next: DigestFrequency) => {
    if (next === digest) return;
    const prev = digest;
    setDigest(next);
    setSavingDigest(true);
    try {
      await ApiService.notifications.updatePreferences({
        digest_frequency: next,
      } as Partial<Omit<NotificationPreferencesApi, 'user_id' | 'updated_at' | 'security'>>);
      toast.success(
        next === 'off'
          ? 'Email digest turned off'
          : `Email digest set to ${next}`,
      );
    } catch {
      setDigest(prev);
      toast.error('Could not update digest preference');
    } finally {
      setSavingDigest(false);
    }
  };

  const toggleCategory = async (id: CategoryKey, value: boolean) => {
    if (id === 'security') return;
    const prev = prefs[id];
    setPrefs((p) => ({ ...p, [id]: value }));
    setSavingId(id);
    try {
      await ApiService.notifications.updatePreferences({ [id]: value } as Partial<
        Omit<NotificationPreferencesApi, 'user_id' | 'updated_at' | 'security'>
      >);
      toast.success(
        `${value ? 'Enabled' : 'Muted'} ${CATEGORIES.find((c) => c.id === id)?.label}`,
      );
    } catch {
      // Revert on failure.
      setPrefs((p) => ({ ...p, [id]: prev }));
      toast.error('Could not update preference');
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="space-y-8">
      {/* Channels */}
      <section aria-labelledby="channels-heading" className="space-y-3">
        <header>
          <h2
            id="channels-heading"
            className="text-sm font-semibold uppercase tracking-widest text-muted-foreground"
          >
            Channels
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Where notifications can reach you. In-app is always on.
          </p>
        </header>
        <Card variant="default" density="compact">
          <CardContent className="divide-y divide-border px-0">
            {CHANNELS.map((c) => {
              const channelKey = c.id as ChannelKey;
              const checked = channels[channelKey];
              const isInApp = channelKey === 'in-app';
              return (
                <div
                  key={c.id}
                  className="flex items-center justify-between gap-4 px-5 py-4 first:rounded-t-2xl last:rounded-b-2xl"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className="grid size-9 shrink-0 place-items-center rounded-xl bg-brand-soft text-accent-foreground"
                      aria-hidden="true"
                    >
                      <c.icon className="size-4" />
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-foreground">
                          {c.label}
                        </p>
                        {isInApp && (
                          <Badge variant="successSoft" size="sm">
                            Always on
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">{c.description}</p>
                    </div>
                  </div>
                  <Switch
                    checked={checked}
                    disabled={isInApp || savingChannel === channelKey}
                    onCheckedChange={(v) => toggleChannel(channelKey, !!v)}
                    aria-label={`${c.label} channel`}
                  />
                </div>
              );
            })}
          </CardContent>
        </Card>
      </section>

      {/* Email digest */}
      <section aria-labelledby="digest-heading" className="space-y-3">
        <header>
          <h2
            id="digest-heading"
            className="text-sm font-semibold uppercase tracking-widest text-muted-foreground"
          >
            Email digest
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Get a summary email of unread notifications on a cadence.
          </p>
        </header>
        <Card variant="default" density="compact">
          <CardContent
            className="grid gap-2 px-5 py-4 sm:grid-cols-3"
            role="radiogroup"
            aria-label="Email digest cadence"
          >
            {DIGEST_OPTIONS.map((opt) => {
              const isActive = digest === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  role="radio"
                  aria-checked={isActive}
                  onClick={() => updateDigest(opt.id)}
                  disabled={savingDigest}
                  className={cn(
                    'rounded-2xl border px-4 py-3 text-left transition-all',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    isActive
                      ? 'border-primary bg-brand-soft/40'
                      : 'border-border bg-card hover:border-input hover:bg-muted/40',
                  )}
                >
                  <p className="text-sm font-semibold tracking-tight text-foreground">
                    {opt.label}
                  </p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    {opt.description}
                  </p>
                </button>
              );
            })}
          </CardContent>
        </Card>
      </section>

      {/* Categories */}
      <section aria-labelledby="categories-heading" className="space-y-3">
        <header>
          <h2
            id="categories-heading"
            className="text-sm font-semibold uppercase tracking-widest text-muted-foreground"
          >
            Categories
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Mute the kinds of notifications you'd rather not hear about.
          </p>
        </header>
        <Card variant="default" density="compact">
          <CardContent className="divide-y divide-border px-0">
            {loading
              ? Array.from({ length: 5 }).map((_, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between gap-4 px-5 py-4"
                  >
                    <div className="flex items-center gap-3">
                      <Skeleton className="size-9 rounded-xl" />
                      <div className="space-y-1.5">
                        <Skeleton className="h-3 w-32" />
                        <Skeleton className="h-2.5 w-56" />
                      </div>
                    </div>
                    <Skeleton className="h-5 w-9 rounded-full" />
                  </div>
                ))
              : CATEGORIES.map((c) => {
                  const Icon = c.icon;
                  const isLocked = !!c.locked;
                  const isSaving = savingId === c.id;
                  return (
                    <div
                      key={c.id}
                      className="flex items-center justify-between gap-4 px-5 py-4 first:rounded-t-2xl last:rounded-b-2xl"
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className="grid size-9 shrink-0 place-items-center rounded-xl bg-muted/60 text-muted-foreground"
                          aria-hidden="true"
                        >
                          <Icon className="size-4" />
                        </span>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold text-foreground">
                              {c.label}
                            </p>
                            {isLocked && (
                              <Badge variant="soft" size="sm" className="gap-1">
                                <Lock className="size-3" aria-hidden="true" />
                                Always on
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {c.description}
                          </p>
                        </div>
                      </div>
                      <Switch
                        checked={prefs[c.id]}
                        onCheckedChange={(v) => toggleCategory(c.id, v)}
                        disabled={isLocked || isSaving}
                        aria-label={`Toggle ${c.label} notifications`}
                      />
                    </div>
                  );
                })}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
