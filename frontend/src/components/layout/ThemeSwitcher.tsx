'use client';

import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { Monitor, Moon, Sun } from 'lucide-react';
import { cn } from '@/lib/utils';

const OPTIONS = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'system', label: 'System', icon: Monitor },
  { value: 'dark', label: 'Dark', icon: Moon },
] as const;

type ThemeValue = (typeof OPTIONS)[number]['value'];

interface ThemeSwitcherProps {
  className?: string;
  /** When true, renders a single icon button that cycles through themes (compact for mobile/topbars). */
  compact?: boolean;
}

/**
 * Segmented Light / System / Dark switcher backed by next-themes.
 * Avoids hydration mismatch by deferring the "active" indicator to after mount.
 */
export function ThemeSwitcher({ className, compact = false }: ThemeSwitcherProps) {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (compact) {
    const active = (mounted ? theme ?? 'system' : 'system') as ThemeValue;
    const next: ThemeValue =
      active === 'light' ? 'dark' : active === 'dark' ? 'system' : 'light';
    const Icon =
      !mounted
        ? Monitor
        : resolvedTheme === 'dark'
          ? Moon
          : resolvedTheme === 'light'
            ? Sun
            : Monitor;
    return (
      <button
        type="button"
        aria-label={`Switch theme (current: ${active})`}
        onClick={() => setTheme(next)}
        className={cn(
          'inline-flex h-9 w-9 items-center justify-center rounded-full',
          'text-muted-foreground hover:text-foreground hover:bg-accent',
          'transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          className
        )}
      >
        <Icon className="h-4 w-4" aria-hidden="true" />
      </button>
    );
  }

  return (
    <div
      role="radiogroup"
      aria-label="Color theme"
      className={cn(
        'inline-flex items-center gap-0.5 rounded-full border border-border bg-card p-0.5',
        className
      )}
    >
      {OPTIONS.map(({ value, label, icon: Icon }) => {
        const active = mounted && (theme ?? 'system') === value;
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={label}
            title={label}
            onClick={() => setTheme(value)}
            className={cn(
              'inline-flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground',
              'transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              active && 'bg-primary text-primary-foreground shadow-sm'
            )}
          >
            <Icon className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        );
      })}
    </div>
  );
}

export default ThemeSwitcher;
