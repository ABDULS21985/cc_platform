'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

interface OtpInputProps {
  /** Current value as a string (e.g. "123" for partial entry). */
  value: string;
  /** Called whenever the value changes; emits the digits-only string. */
  onChange: (next: string) => void;
  /** Number of cells (default 6). */
  length?: number;
  /** Auto-focus the first cell on mount. */
  autoFocus?: boolean;
  /** Mark fields as invalid (red border + aria-invalid). */
  invalid?: boolean;
  /** Disable input (e.g. during submission). */
  disabled?: boolean;
  /** Optional aria-describedby pointing at an external error/hint element. */
  describedBy?: string;
  /** Callback fired when the full code has been entered. */
  onComplete?: (code: string) => void;
  /** className for the wrapper. */
  className?: string;
}

/**
 * Accessible 6-cell OTP input.
 * - Backspace deletes the current cell, then moves back to the previous one.
 * - Arrow Left/Right navigates between cells.
 * - Paste fills as many cells as possible from the clipboard.
 * - autocomplete="one-time-code" on the first cell so iOS SMS-suggest works.
 */
export function OtpInput({
  value,
  onChange,
  length = 6,
  autoFocus,
  invalid,
  disabled,
  describedBy,
  onComplete,
  className,
}: OtpInputProps) {
  const refs = React.useRef<Array<HTMLInputElement | null>>([]);
  const cells = React.useMemo(() => {
    const arr = Array<string>(length).fill('');
    for (let i = 0; i < Math.min(length, value.length); i++) arr[i] = value[i];
    return arr;
  }, [value, length]);

  React.useEffect(() => {
    if (autoFocus) refs.current[0]?.focus();
  }, [autoFocus]);

  const emit = (next: string[]) => {
    const joined = next.join('').slice(0, length);
    onChange(joined);
    if (joined.length === length && joined.split('').every(Boolean)) {
      onComplete?.(joined);
    }
  };

  const handleChange = (index: number, raw: string) => {
    const sanitized = raw.replace(/\D/g, '').slice(-1);
    const next = [...cells];
    next[index] = sanitized;
    emit(next);
    if (sanitized && index < length - 1) refs.current[index + 1]?.focus();
  };

  const handleKeyDown = (
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (e.key === 'Backspace') {
      if (!cells[index] && index > 0) {
        e.preventDefault();
        const next = [...cells];
        next[index - 1] = '';
        emit(next);
        refs.current[index - 1]?.focus();
      }
      return;
    }
    if (e.key === 'ArrowLeft' && index > 0) {
      e.preventDefault();
      refs.current[index - 1]?.focus();
    }
    if (e.key === 'ArrowRight' && index < length - 1) {
      e.preventDefault();
      refs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length);
    if (!pasted) return;
    const next = [...cells];
    for (let i = 0; i < pasted.length; i++) next[i] = pasted[i];
    emit(next);
    const focusIndex = pasted.length >= length ? length - 1 : pasted.length;
    refs.current[focusIndex]?.focus();
  };

  return (
    <div
      className={cn(
        'flex items-center gap-2 sm:gap-3',
        disabled && 'pointer-events-none opacity-60',
        className
      )}
      role="group"
      aria-label={`Enter the ${length}-digit code`}
    >
      {cells.map((digit, index) => (
        <input
          key={index}
          ref={(el) => {
            refs.current[index] = el;
          }}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete={index === 0 ? 'one-time-code' : 'off'}
          maxLength={1}
          disabled={disabled}
          aria-label={`Digit ${index + 1} of ${length}`}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          value={digit}
          onChange={(e) => handleChange(index, e.target.value)}
          onKeyDown={(e) => handleKeyDown(index, e)}
          onPaste={handlePaste}
          className={cn(
            'h-12 w-10 sm:h-14 sm:w-12 rounded-xl border bg-card text-center text-lg font-semibold text-foreground shadow-xs transition-colors',
            digit ? 'border-primary' : 'border-border',
            invalid && 'border-destructive aria-invalid:ring-destructive/30',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-ring'
          )}
        />
      ))}
    </div>
  );
}
