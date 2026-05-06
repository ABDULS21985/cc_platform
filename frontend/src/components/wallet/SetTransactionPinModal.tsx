'use client';

import * as React from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ApiService } from '@/services/api';
import { toastAxiosError } from '@/hooks/useAxiosError';

interface SetTransactionPinModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Fired after the PIN is successfully set on the backend. */
  onComplete?: () => void;
}

/**
 * Minimal modal for the first-time PIN setup gate.
 * Two 4-digit numeric inputs that must match before submission.
 */
export function SetTransactionPinModal({
  isOpen,
  onClose,
  onComplete,
}: SetTransactionPinModalProps) {
  const [pin, setPin] = React.useState('');
  const [confirmPin, setConfirmPin] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!isOpen) {
      setPin('');
      setConfirmPin('');
      setError(null);
      setSubmitting(false);
    }
  }, [isOpen]);

  const isValid = pin.length === 4 && confirmPin.length === 4;
  const matches = pin === confirmPin;

  const handleSubmit = async () => {
    if (!isValid || submitting) return;
    if (!matches) {
      setError('PINs do not match. Try again.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await ApiService.wallet.setPin({ pin });
      onComplete?.();
      onClose();
    } catch (err) {
      toastAxiosError(err, 'Could not set transaction PIN.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        showClose={true}
        className="p-0 bg-white rounded-lg w-full max-w-md overflow-hidden"
      >
        <h2 className="text-[1.2rem] p-3 font-bold text-[#000000]">
          Set up your transaction PIN
        </h2>

        <div className="p-4 space-y-4">
          <p className="text-sm text-muted-foreground">
            Choose a 4-digit PIN. You will be asked for it before sending or
            withdrawing funds.
          </p>

          <div>
            <label
              htmlFor="set-pin"
              className="block text-sm font-medium text-[#959595] mb-2"
            >
              New PIN
            </label>
            <Input
              id="set-pin"
              type="password"
              inputMode="numeric"
              autoComplete="new-password"
              maxLength={4}
              value={pin}
              disabled={submitting}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
              className="w-full rounded-full"
              placeholder="••••"
            />
          </div>

          <div>
            <label
              htmlFor="confirm-pin"
              className="block text-sm font-medium text-[#959595] mb-2"
            >
              Confirm PIN
            </label>
            <Input
              id="confirm-pin"
              type="password"
              inputMode="numeric"
              autoComplete="new-password"
              maxLength={4}
              value={confirmPin}
              disabled={submitting}
              onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void handleSubmit();
              }}
              className="w-full rounded-full"
              placeholder="••••"
            />
          </div>

          {error ? (
            <p role="alert" className="text-[11px] font-medium text-destructive">
              {error}
            </p>
          ) : null}
        </div>

        <div className="p-4 flex gap-3">
          <Button
            onClick={onClose}
            variant="outline"
            disabled={submitting}
            className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-200"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!isValid || submitting}
            loading={submitting}
            className="flex-1 bg-teal-600 hover:bg-teal-700 text-white"
          >
            Set PIN
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
