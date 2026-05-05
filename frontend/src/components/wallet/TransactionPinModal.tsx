'use client';

import * as React from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface TransactionPinModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Receives the entered PIN. Existing callers that don't need the PIN
   * can simply ignore the argument. */
  onConfirm: (pin: string) => void;
  title: string;
  confirmButtonText: string;
  /** Show a busy state on the confirm button while the parent dispatches. */
  loading?: boolean;
}

export function TransactionPinModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  confirmButtonText,
  loading = false,
}: TransactionPinModalProps) {
  const [pin, setPin] = React.useState('');

  // Reset the PIN whenever the dialog closes so a stale value never gets reused.
  React.useEffect(() => {
    if (!isOpen) setPin('');
  }, [isOpen]);

  const isValid = pin.length >= 4;

  const handleConfirm = () => {
    if (!isValid || loading) return;
    onConfirm(pin);
  };

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
              maxLength={6}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleConfirm();
              }}
            />
            <p className="mt-1 text-[11px] text-muted-foreground">
              4–6 digit transaction PIN.
            </p>
          </div>
        </div>

        <div className="p-4 flex gap-3">
          <Button
            onClick={onClose}
            variant="outline"
            disabled={loading}
            className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-200"
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!isValid || loading}
            loading={loading}
            className="flex-1 bg-teal-600 hover:bg-teal-700 text-white"
          >
            {confirmButtonText}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
