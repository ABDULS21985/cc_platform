'use client';

import {
  User,
  ShieldCheck,
  Bell,
  Trash2,
  ChevronRight,
  Fingerprint,
  History,
  Users,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface SettingsSidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

interface SettingsItem {
  id: string;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface SettingsGroup {
  title: string;
  items: SettingsItem[];
}

const GROUPS: SettingsGroup[] = [
  {
    title: 'Account',
    items: [
      { id: 'account-info', label: 'Personal information', description: 'Profile and bio', icon: User },
      { id: 'verification', label: 'Identity verification', description: 'KYC, BVN, and NIN status', icon: Fingerprint },
      { id: 'notification', label: 'Notifications', description: 'Alert preferences', icon: Bell },
    ],
  },
  {
    title: 'Security',
    items: [
      { id: 'change-password', label: 'Password', description: 'Change your credentials', icon: ShieldCheck },
      { id: 'login-history', label: 'Login history', description: 'Recent account activity', icon: History },
      { id: 'role-access', label: 'Admin management', description: 'Manage permissions', icon: Users },
    ],
  },
];

export function SettingsSidebar({ activeTab, onTabChange }: SettingsSidebarProps) {
  return (
    <nav aria-label="Settings sections" className="flex w-full flex-col gap-4 lg:w-80">
      {GROUPS.map((group) => (
        <Card key={group.title} variant="default" density="compact" className="px-2 py-3">
          <h2 className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            {group.title}
          </h2>
          <ul className="space-y-1" role="list">
            {group.items.map((item) => {
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
        </Card>
      ))}

      {/* Danger zone */}
      <Card
        variant="outline"
        density="compact"
        className="border-destructive/30 bg-destructive/5 px-2 py-3"
      >
        <h2 className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-widest text-destructive/80">
          Danger zone
        </h2>
        <button
          type="button"
          onClick={() => onTabChange('deactivate')}
          aria-current={activeTab === 'deactivate' ? 'page' : undefined}
          className={cn(
            'group flex w-full items-center justify-between rounded-xl p-2.5 text-left transition-colors',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive focus-visible:ring-offset-2 focus-visible:ring-offset-background',
            activeTab === 'deactivate'
              ? 'bg-destructive/10 text-destructive'
              : 'text-destructive/70 hover:bg-destructive/10 hover:text-destructive'
          )}
        >
          <span className="flex items-center gap-3">
            <span className="grid size-9 place-items-center rounded-lg bg-destructive/10 text-destructive transition-colors group-hover:bg-destructive/15">
              <Trash2 className="size-4" aria-hidden="true" />
            </span>
            <span>
              <span className="block text-sm font-semibold leading-tight tracking-tight">
                Deactivate account
              </span>
              <span className="mt-0.5 block text-xs leading-tight opacity-80">
                Permanently delete data
              </span>
            </span>
          </span>
          <ChevronRight className="size-4 shrink-0" aria-hidden="true" />
        </button>
      </Card>
    </nav>
  );
}
