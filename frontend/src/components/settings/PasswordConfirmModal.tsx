'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface PasswordConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNext: (pin: string) => void;
  title: string;
  isSubmitting?: boolean;
  error?: string | null;
}

export function PasswordConfirmModal({
  isOpen,
  onClose,
  onNext,
  title,
  isSubmitting = false,
  error = null,
}: PasswordConfirmModalProps) {
  const [pin, setPin] = useState('');

  const handleConfirm = () => {
    onNext(pin);
  };

  const handleCancel = () => {
    setPin('');
    onClose();
  };

  const handlePinChange = (value: string) => {
    setPin(value.replace(/\D/g, '').slice(0, 4));
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleCancel()}>
      <DialogContent className="w-full max-w-md overflow-hidden rounded-lg bg-white p-0">
        <DialogHeader className="border-b p-4">
          <DialogTitle className="text-lg font-bold text-[#000000]">
            Confirm standing instruction
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 p-4">
          <div>
            <label htmlFor="confirmed-instruction-title" className="mb-2 block text-sm font-medium text-[#000000]">
              Title
            </label>
            <Input
              id="confirmed-instruction-title"
              type="text"
              value={title}
              readOnly
              className="h-10 w-full rounded-lg border border-gray-200 bg-gray-50 text-gray-600"
            />
          </div>

          <div>
            <label htmlFor="transaction-pin" className="mb-2 block text-sm font-medium text-[#000000]">
              Transaction PIN
            </label>
            <Input
              id="transaction-pin"
              type="password"
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="Enter 4-digit PIN"
              value={pin}
              onChange={(e) => handlePinChange(e.target.value)}
              className="h-10 w-full rounded-lg border border-gray-200 focus:border-[#0E9DA5] focus:outline-none focus:ring-1 focus:ring-[#0E9DA5]"
            />
            {error && <p className="mt-2 text-xs text-destructive">{error}</p>}
          </div>
        </div>

        <div className="flex gap-3 p-4">
          <Button
            type="button"
            onClick={handleCancel}
            variant="outline"
            disabled={isSubmitting}
            className="flex-1 border border-gray-200 bg-gray-100 text-gray-700 hover:bg-gray-200"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            disabled={pin.length !== 4 || isSubmitting}
            className="flex-1 bg-[#0E9DA5] text-white hover:bg-[#0d8a91]"
          >
            {isSubmitting ? 'Verifying...' : 'Confirm'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
