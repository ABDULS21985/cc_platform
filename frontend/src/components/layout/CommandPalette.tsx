'use client';

import * as React from 'react';
import { Command } from 'cmdk';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { useRouter } from 'next/navigation';
import {
  Home,
  Users,
  Calendar,
  Wallet,
  Settings,
  Search,
  Plus,
  ArrowRight,
  Sun,
  Moon,
  Monitor,
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { cn } from '@/lib/utils';

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface PaletteItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  group: string;
  keywords?: string[];
  action: () => void;
}

/**
 * Cmd-K command palette. Routes + theme controls + quick actions.
 * Wire <CommandPaletteRoot /> once at the dashboard layout level — it owns
 * its own state and listens for the global Cmd/Ctrl+K shortcut.
 */
export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const router = useRouter();
  const { setTheme } = useTheme();

  const close = React.useCallback(() => onOpenChange(false), [onOpenChange]);

  const navigate = React.useCallback(
    (href: string) => {
      router.push(href);
      close();
    },
    [router, close]
  );

  const items: PaletteItem[] = React.useMemo(
    () => [
      // Navigation
      { id: 'nav-home', label: 'Home', icon: <Home className="size-4" />, group: 'Navigation', keywords: ['dashboard'], action: () => navigate('/dashboard') },
      { id: 'nav-communities', label: 'Communities', icon: <Users className="size-4" />, group: 'Navigation', keywords: ['groups', 'community'], action: () => navigate('/dashboard/community') },
      { id: 'nav-events', label: 'Events', icon: <Calendar className="size-4" />, group: 'Navigation', action: () => navigate('/dashboard/events') },
      { id: 'nav-wallet', label: 'Wallet', icon: <Wallet className="size-4" />, group: 'Navigation', keywords: ['money', 'balance', 'transfer'], action: () => navigate('/dashboard/wallet') },
      { id: 'nav-settings', label: 'Settings', icon: <Settings className="size-4" />, group: 'Navigation', action: () => navigate('/dashboard/settings') },

      // Actions
      { id: 'action-create-community', label: 'Create a community', icon: <Plus className="size-4" />, group: 'Quick actions', keywords: ['new', 'add'], action: () => navigate('/dashboard/community?new=1') },
      { id: 'action-transfer', label: 'New transfer', icon: <ArrowRight className="size-4" />, group: 'Quick actions', keywords: ['send', 'pay'], action: () => navigate('/dashboard/wallet?action=transfer') },

      // Theme
      { id: 'theme-light', label: 'Switch to light theme', icon: <Sun className="size-4" />, group: 'Preferences', action: () => { setTheme('light'); close(); } },
      { id: 'theme-dark', label: 'Switch to dark theme', icon: <Moon className="size-4" />, group: 'Preferences', action: () => { setTheme('dark'); close(); } },
      { id: 'theme-system', label: 'Use system theme', icon: <Monitor className="size-4" />, group: 'Preferences', action: () => { setTheme('system'); close(); } },
    ],
    [close, navigate, setTheme]
  );

  // Group items for rendering.
  const grouped = React.useMemo(() => {
    const map = new Map<string, PaletteItem[]>();
    for (const item of items) {
      const existing = map.get(item.group) ?? [];
      existing.push(item);
      map.set(item.group, existing);
    }
    return Array.from(map.entries());
  }, [items]);

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          className={cn(
            'fixed inset-0 z-50 bg-foreground/40 backdrop-blur-sm',
            'data-[state=open]:animate-in data-[state=open]:fade-in-0',
            'data-[state=closed]:animate-out data-[state=closed]:fade-out-0'
          )}
        />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          className={cn(
            'fixed left-1/2 top-[15%] z-50 w-[min(640px,calc(100vw-2rem))] -translate-x-1/2',
            'overflow-hidden rounded-2xl border border-border bg-popover shadow-2xl',
            'data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 duration-150'
          )}
        >
          <DialogPrimitive.Title className="sr-only">Command palette</DialogPrimitive.Title>
          <Command label="Command palette" className="flex h-full flex-col">
            <div className="flex items-center gap-2 border-b border-border px-4">
              <Search className="size-4 text-muted-foreground" aria-hidden="true" />
              <Command.Input
                placeholder="Search routes, actions, settings…"
                className="flex h-12 w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
              />
              <kbd className="hidden rounded-md border border-border bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground sm:inline-block">
                ESC
              </kbd>
            </div>
            <Command.List className="max-h-[60vh] overflow-y-auto p-2">
              <Command.Empty className="px-3 py-8 text-center text-sm text-muted-foreground">
                No results.
              </Command.Empty>
              {grouped.map(([group, groupItems]) => (
                <Command.Group
                  key={group}
                  heading={group}
                  className="px-1 py-1 text-xs font-medium text-muted-foreground [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5"
                >
                  {groupItems.map((item) => (
                    <Command.Item
                      key={item.id}
                      value={`${item.label} ${(item.keywords ?? []).join(' ')}`}
                      onSelect={item.action}
                      className={cn(
                        'flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 text-sm text-foreground',
                        'aria-selected:bg-accent aria-selected:text-accent-foreground',
                        'data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground'
                      )}
                    >
                      <span className="grid size-6 place-items-center rounded-md bg-muted text-muted-foreground">
                        {item.icon}
                      </span>
                      <span className="flex-1">{item.label}</span>
                    </Command.Item>
                  ))}
                </Command.Group>
              ))}
            </Command.List>
          </Command>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

/**
 * Self-contained palette: handles its own open state and the Cmd/Ctrl+K shortcut.
 * Drop into the dashboard layout once.
 */
export function CommandPaletteRoot() {
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.key === 'k' || e.key === 'K') && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return <CommandPalette open={open} onOpenChange={setOpen} />;
}
