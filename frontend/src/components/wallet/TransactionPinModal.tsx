'use client';

import * as React from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

/** Maximum number of incorrect-PIN attempts before the modal hard-locks. */
const MAX_PIN_ATTEMPTS = 3;

/** Shape the parent should report after the server responds. */
export interface TransactionPinResult {
  ok: boolean;
  /** True when the failure was caused by a bad PIN (not network / validation). */
  pinError?: boolean;
  /** Optional remaining attempts if the backend exposes one. */
  attemptsRemaining?: number;
  /** Server-supplied human-readable message. */
  message?: string;
}

interface TransactionPinModalProps {
  isOpen: boolean;
  onClose: () => void;
  /**
   * Called with the entered PIN.
   * Existing parents that fire-and-forget keep working: returning `void` /
   * `undefined` means "trust the parent to close on success and toast on error".
   * Returning a `TransactionPinResult` opts the modal in to inline error
   * handling (attempt counter, lockout state).
   */
  onConfirm: (
    pin: string,
  ) => void | TransactionPinResult | Promise<void | TransactionPinResult>;
  title: string;
  confirmButtonText: string;
  /** Show a busy state on the confirm button while the parent dispatches. */
  loading?: boolean;
  /**
   * When provided, overrides the modal's internal PIN error text. Useful when
   * the parent owns transaction state.
   */
  errorMessage?: string | null;
}

export function TransactionPinModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  confirmButtonText,
  loading = false,
  errorMessage = null,
}: TransactionPinModalProps) {
  const [pin, setPin] = React.useState('');
  const [pinFailures, setPinFailures] = React.useState(0);
  const [internalError, setInternalError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  // Reset state whenever the dialog opens/closes so a stale value never gets reused.
  React.useEffect(() => {
    if (!isOpen) {
      setPin('');
      setPinFailures(0);
      setInternalError(null);
      setSubmitting(false);
    }
  }, [isOpen]);

  const lockedOut = pinFailures >= MAX_PIN_ATTEMPTS;
  const isLocallyValid = pin.length === 4;
  const busy = loading || submitting;

  const visibleError = errorMessage ?? internalError;

  const handleConfirm = async () => {
    if (!isLocallyValid || busy || lockedOut) return;
    setInternalError(null);
    try {
      setSubmitting(true);
      const result = await Promise.resolve(onConfirm(pin));
      if (result && typeof result === 'object' && 'ok' in result) {
        if (result.ok) {
          // Parent will typically close us; nothing to do.
          return;
        }
        if (result.pinError) {
          const next = pinFailures + 1;
          setPinFailures(next);
          const remaining =
            typeof result.attemptsRemaining === 'number'
              ? result.attemptsRemaining
              : Math.max(MAX_PIN_ATTEMPTS - next, 0);
          setInternalError(
            remaining > 0
              ? `Incorrect PIN. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.`
              : 'Too many attempts. Try again in a few minutes.',
          );
          setPin('');
        } else if (result.message) {
          setInternalError(result.message);
        }
      }
    } finally {
      setSubmitting(false);
    }
  };

  const helperText = lockedOut
    ? 'Too many attempts. Try again in a few minutes.'
    : '4 digit transaction PIN.';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        showClose={true}
        className="p-0 bg-white rounded-lg w-full max-w-md overflow-hidden"
      >
        <h2 className="text-[1.2rem] p-3 font-bold text-[#000000]">{title}</h2>

        <div className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#959595] mb-2">
              Transaction pin
            </label>
            <Input
              placeholder="Enter transaction pin"
              className="w-full rounded-full"
              type="password"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={4}
              value={pin}
              disabled={busy || lockedOut}
              aria-invalid={Boolean(visibleError) || lockedOut}
              aria-describedby={visibleError ? 'transaction-pin-error' : 'transaction-pin-helper'}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void handleConfirm();
              }}
            />
            {visibleError ? (
              <p
                id="transaction-pin-error"
                role="alert"
                className="mt-1 text-[11px] font-medium text-destructive"
              >
                {visibleError}
              </p>
            ) : (
              <p
                id="transaction-pin-helper"
                className="mt-1 text-[11px] text-muted-foreground"
              >
                {helperText}
              </p>
            )}
          </div>
        </div>

        <div className="p-4 flex gap-3">
          <Button
            onClick={onClose}
            variant="outline"
            disabled={busy}
            className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-200"
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!isLocallyValid || busy || lockedOut}
            loading={busy}
            className="flex-1 bg-teal-600 hover:bg-teal-700 text-white"
          >
            {confirmButtonText}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
