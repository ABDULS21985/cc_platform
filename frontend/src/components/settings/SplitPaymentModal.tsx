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

export interface SplitPaymentFormData {
  splitMemberName: string;
  splitPrimaryAmount: string;
  splitSecondaryAmount: string;
}

interface SplitPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (data: SplitPaymentFormData) => void;
  title: string;
  isSubmitting?: boolean;
}

const initialState: SplitPaymentFormData = {
  splitMemberName: '',
  splitPrimaryAmount: '',
  splitSecondaryAmount: '',
};

export function SplitPaymentModal({
  isOpen,
  onClose,
  onComplete,
  title,
  isSubmitting = false,
}: SplitPaymentModalProps) {
  const [form, setForm] = useState<SplitPaymentFormData>(initialState);

  const update = <K extends keyof SplitPaymentFormData>(
    key: K,
    value: SplitPaymentFormData[K],
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const complete = (data: SplitPaymentFormData) => {
    onComplete({
      splitMemberName: data.splitMemberName.trim(),
      splitPrimaryAmount: data.splitPrimaryAmount.trim(),
      splitSecondaryAmount: data.splitSecondaryAmount.trim(),
    });
  };

  const handleCancel = () => {
    setForm(initialState);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleCancel()}>
      <DialogContent className="w-full max-w-md overflow-hidden rounded-lg bg-white p-0">
        <DialogHeader className="border-b p-4">
          <DialogTitle className="text-lg font-bold text-[#000000]">
            Split payment
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 p-4">
          <div>
            <label htmlFor="split-title" className="mb-2 block text-sm font-medium text-[#000000]">
              Title
            </label>
            <Input
              id="split-title"
              type="text"
              value={title}
              readOnly
              className="h-10 w-full rounded-lg border border-gray-200 bg-gray-50 text-gray-600"
            />
          </div>

          <div>
            <label htmlFor="split-member-name" className="mb-2 block text-sm font-medium text-[#000000]">
              Member
            </label>
            <Input
              id="split-member-name"
              type="text"
              placeholder="Sherifat Mobalaji"
              value={form.splitMemberName}
              onChange={(e) => update('splitMemberName', e.target.value)}
              className="h-10 w-full rounded-lg border border-gray-200 focus:border-[#0E9DA5] focus:outline-none focus:ring-1 focus:ring-[#0E9DA5]"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="split-primary-amount" className="mb-2 block text-sm font-medium text-[#000000]">
                Member amount
              </label>
              <Input
                id="split-primary-amount"
                type="text"
                inputMode="decimal"
                placeholder="9000"
                value={form.splitPrimaryAmount}
                onChange={(e) => update('splitPrimaryAmount', e.target.value)}
                className="h-10 w-full rounded-lg border border-gray-200 focus:border-[#0E9DA5] focus:outline-none focus:ring-1 focus:ring-[#0E9DA5]"
              />
            </div>

            <div>
              <label htmlFor="split-secondary-amount" className="mb-2 block text-sm font-medium text-[#000000]">
                Remaining amount
              </label>
              <Input
                id="split-secondary-amount"
                type="text"
                inputMode="decimal"
                placeholder="9500"
                value={form.splitSecondaryAmount}
                onChange={(e) => update('splitSecondaryAmount', e.target.value)}
                className="h-10 w-full rounded-lg border border-gray-200 focus:border-[#0E9DA5] focus:outline-none focus:ring-1 focus:ring-[#0E9DA5]"
              />
            </div>
          </div>
        </div>

        <div className="flex gap-3 p-4">
          <Button
            type="button"
            onClick={() => complete(initialState)}
            variant="outline"
            disabled={isSubmitting}
            className="flex-1 border border-gray-200 bg-gray-100 text-gray-700 hover:bg-gray-200"
          >
            Skip split
          </Button>
          <Button
            type="button"
            onClick={() => complete(form)}
            disabled={isSubmitting}
            className="flex-1 bg-[#0E9DA5] text-white hover:bg-[#0d8a91]"
          >
            {isSubmitting ? 'Creating...' : 'Create instructions'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
