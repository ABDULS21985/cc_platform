'use client';

import * as React from 'react';
import { useState } from 'react';
import {
  Bell,
  Mail,
  MessageSquare,
  Smartphone,
} from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

interface ChannelPref {
  id: 'email' | 'sms' | 'push' | 'in_app';
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
}

const CHANNELS: ChannelPref[] = [
  {
    id: 'email',
    label: 'Email',
    description: 'Receipts, alerts, and digest emails.',
    icon: Mail,
  },
  {
    id: 'sms',
    label: 'SMS',
    description: 'Transaction confirmations and security codes.',
    icon: MessageSquare,
  },
  {
    id: 'push',
    label: 'Mobile push',
    description: 'Real-time alerts on your phone.',
    icon: Smartphone,
    badge: 'Beta',
  },
  {
    id: 'in_app',
    label: 'In-app',
    description: 'Notifications in your dashboard inbox.',
    icon: Bell,
  },
];

interface CategoryPref {
  id: string;
  label: string;
  description: string;
}

const CATEGORIES: CategoryPref[] = [
  {
    id: 'money',
    label: 'Money movements',
    description: 'Transfers, deposits, withdrawals, and reversals.',
  },
  {
    id: 'bills',
    label: 'Bills & dues',
    description: 'New bills, reminders, and overdue alerts.',
  },
  {
    id: 'community',
    label: 'Community activity',
    description: 'New posts, member joins, and event updates.',
  },
  {
    id: 'security',
    label: 'Security',
    description: 'Login attempts, password changes, and MFA events.',
  },
];

export function NotificationPreferencesContent() {
  const [channels, setChannels] = useState<Record<string, boolean>>({
    email: true,
    sms: true,
    push: false,
    in_app: true,
  });
  const [categories, setCategories] = useState<Record<string, boolean>>({
    money: true,
    bills: true,
    community: true,
    security: true,
  });

  const toggleChannel = (id: string, value: boolean) => {
    setChannels((prev) => ({ ...prev, [id]: value }));
    toast.success(`${id.toUpperCase()} notifications ${value ? 'enabled' : 'disabled'}`);
  };

  const toggleCategory = (id: string, value: boolean) => {
    setCategories((prev) => ({ ...prev, [id]: value }));
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
            Choose where you receive notifications.
          </p>
        </header>
        <Card variant="default" density="compact">
          <CardContent className="divide-y divide-border px-0">
            {CHANNELS.map((c) => (
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
                      {c.badge && (
                        <Badge variant="infoSoft" size="sm">
                          {c.badge}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">{c.description}</p>
                  </div>
                </div>
                <Switch
                  checked={channels[c.id]}
                  onCheckedChange={(v) => toggleChannel(c.id, v)}
                  aria-label={`Toggle ${c.label} notifications`}
                />
              </div>
            ))}
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
            Choose which kinds of notifications you receive.
          </p>
        </header>
        <Card variant="default" density="compact">
          <CardContent className="divide-y divide-border px-0">
            {CATEGORIES.map((c) => (
              <div
                key={c.id}
                className="flex items-center justify-between gap-4 px-5 py-4 first:rounded-t-2xl last:rounded-b-2xl"
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground">{c.label}</p>
                  <p className="text-xs text-muted-foreground">{c.description}</p>
                </div>
                <Switch
                  checked={categories[c.id]}
                  onCheckedChange={(v) => toggleCategory(c.id, v)}
                  aria-label={`Toggle ${c.label} category`}
                />
              </div>
            ))}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
