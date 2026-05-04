'use client';

import * as React from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface PasswordCheck {
  test: (v: string) => boolean;
  label: string;
}

export const DEFAULT_CHECKS: PasswordCheck[] = [
  { test: (v) => v.length >= 8, label: 'At least 8 characters' },
  { test: (v) => /[A-Z]/.test(v), label: 'One uppercase letter' },
  { test: (v) => /\d/.test(v), label: 'One number' },
  { test: (v) => /[^A-Za-z0-9]/.test(v), label: 'One symbol' },
];

export function passwordScore(value: string, checks = DEFAULT_CHECKS): number {
  return checks.reduce((acc, c) => acc + (c.test(value) ? 1 : 0), 0);
}

interface PasswordStrengthProps {
  value: string;
  checks?: PasswordCheck[];
  className?: string;
}

/**
 * Live password strength meter. 4-segment colored bar + checklist + tone label.
 * Use alongside an Input field. Reads strength as 0-4 against the supplied checks
 * (default: length 8, uppercase, number, symbol).
 */
export function PasswordStrength({
  value,
  checks = DEFAULT_CHECKS,
  className,
}: PasswordStrengthProps) {
  const score = passwordScore(value, checks);
  const visible = value.length > 0;

  const strength =
    score <= 1
      ? { label: 'Too weak', tone: 'bg-destructive', text: 'text-destructive' }
      : score === 2
        ? { label: 'Fair', tone: 'bg-warning', text: 'text-warning' }
        : score === 3
          ? { label: 'Good', tone: 'bg-info', text: 'text-info' }
          : { label: 'Strong', tone: 'bg-success', text: 'text-success' };

  return (
    <div
      className={cn('mt-2 space-y-2', !visible && 'opacity-50', className)}
      aria-live="polite"
    >
      <div className="flex gap-1.5">
        {[0, 1, 2, 3].map((i) => (
          <span
            key={i}
            className={cn(
              'h-1 flex-1 rounded-full bg-muted transition-colors',
              i < score && strength.tone
            )}
          />
        ))}
      </div>
      <ul className="grid grid-cols-2 gap-1 text-[11px]">
        {checks.map((c) => {
          const passed = c.test(value);
          return (
            <li
              key={c.label}
              className={cn(
                'flex items-center gap-1.5 transition-colors',
                passed ? 'text-success' : 'text-muted-foreground'
              )}
            >
              <span
                className={cn(
                  'grid size-4 place-items-center rounded-full transition-colors',
                  passed ? 'bg-success/15' : 'bg-muted'
                )}
                aria-hidden="true"
              >
                <Check className="size-2.5" />
              </span>
              {c.label}
            </li>
          );
        })}
      </ul>
      {visible && (
        <p className={cn('text-[11px] font-semibold', strength.text)}>
          {strength.label}
        </p>
      )}
    </div>
  );
}
