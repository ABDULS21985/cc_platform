'use client';

import * as React from 'react';
import { ChevronRight, Clock, CreditCard } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface SubscriptionsSidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

interface NavItem {
  id: string;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}

const ITEMS: NavItem[] = [
  {
    id: 'subscriptions',
    label: 'Subscriptions',
    description: 'Manage active plans',
    icon: CreditCard,
  },
  {
    id: 'standing-instructions',
    label: 'Standing instructions',
    description: 'Recurring transfers',
    icon: Clock,
  },
];

export function SubscriptionsSidebar({
  activeTab,
  onTabChange,
}: SubscriptionsSidebarProps) {
  return (
    <nav aria-label="Subscriptions sections" className="flex w-full flex-col gap-4 lg:w-80">
      <Card variant="default" density="compact" className="px-2 py-3">
        <header className="flex items-center gap-2 px-3 pb-2">
          <span
            className="grid size-7 place-items-center rounded-lg bg-brand-soft text-accent-foreground"
            aria-hidden="true"
          >
            <CreditCard className="size-3.5" />
          </span>
          <h2 className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            Billing
          </h2>
        </header>
        <ul role="list" className="space-y-1">
          {ITEMS.map((item) => {
            const isActive = activeTab === item.id;
            const Icon = item.icon;
            return (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => onTabChange(item.id)}
                  aria-current={isActive ? 'page' : undefined}
                  className={cn(
                    'group flex w-full items-center justify-between rounded-xl p-2.5 text-left transition-colors',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                    isActive
                      ? 'bg-brand-soft text-accent-foreground'
                      : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
                  )}
                >
                  <span className="flex items-center gap-3">
                    <span
                      className={cn(
                        'grid size-9 place-items-center rounded-lg transition-colors',
                        isActive
                          ? 'bg-card text-primary shadow-xs'
                          : 'bg-muted text-muted-foreground group-hover:bg-card group-hover:text-foreground'
                      )}
                    >
                      <Icon className="size-4" aria-hidden="true" />
                    </span>
                    <span>
                      <span className="block text-sm font-semibold leading-tight tracking-tight">
                        {item.label}
                      </span>
                      <span className="mt-0.5 block text-xs leading-tight">
                        {item.description}
                      </span>
                    </span>
                  </span>
                  <ChevronRight
                    className={cn(
                      'size-4 shrink-0 transition-transform',
                      isActive ? 'translate-x-0.5 text-primary' : 'text-muted-foreground/60'
                    )}
                    aria-hidden="true"
                  />
                </button>
              </li>
            );
          })}
        </ul>

        <div className="mt-3 border-t border-border px-3 pt-3">
          <button
            type="button"
            onClick={() => onTabChange('account-info')}
            className="text-xs font-semibold text-primary hover:underline underline-offset-4"
          >
            ← Back to account settings
          </button>
        </div>
      </Card>
    </nav>
  );
}
