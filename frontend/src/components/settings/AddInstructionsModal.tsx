'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export type StandingInstructionCadence = 'weekly' | 'monthly' | 'quarterly' | 'yearly';

export interface AddInstructionFormData {
  title: string;
  amount: string;
  frequency: StandingInstructionCadence;
  startDate: string;
  endDate: string;
  destinationAccountNumber: string;
  destinationBankCode: string;
  destinationAccountName: string;
}

interface AddInstructionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNext: (data: AddInstructionFormData) => void;
}

const initialState: AddInstructionFormData = {
  title: '',
  amount: '',
  frequency: 'monthly',
  startDate: '',
  endDate: '',
  destinationAccountNumber: '',
  destinationBankCode: '',
  destinationAccountName: '',
};

export function AddInstructionsModal({
  isOpen,
  onClose,
  onNext,
}: AddInstructionsModalProps) {
  const [form, setForm] = useState<AddInstructionFormData>(initialState);

  const update = <K extends keyof AddInstructionFormData>(
    key: K,
    value: AddInstructionFormData[K],
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleCreateInstructions = () => {
    onNext({
      ...form,
      title: form.title.trim(),
      amount: form.amount.trim(),
      destinationAccountNumber: form.destinationAccountNumber.trim(),
      destinationBankCode: form.destinationBankCode.trim(),
      destinationAccountName: form.destinationAccountName.trim(),
    });
  };

  const handleCancel = () => {
    setForm(initialState);
    onClose();
  };

  const canContinue =
    form.title.trim().length > 0 &&
    form.amount.trim().length > 0 &&
    form.destinationAccountNumber.trim().length > 0 &&
    form.destinationBankCode.trim().length > 0 &&
    form.destinationAccountName.trim().length > 0;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleCancel()}>
      <DialogContent className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg bg-white p-0">
        <DialogHeader className="border-b p-4">
          <DialogTitle className="text-lg font-bold text-[#000000]">
            Add instructions
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 p-4">
          <div>
            <label htmlFor="instruction-title" className="mb-2 block text-sm font-medium text-[#000000]">
              Title
            </label>
            <Input
              id="instruction-title"
              type="text"
              placeholder="Estate maintenance"
              value={form.title}
              onChange={(e) => update('title', e.target.value)}
              className="h-10 w-full rounded-lg border border-gray-200 focus:border-[#0E9DA5] focus:outline-none focus:ring-1 focus:ring-[#0E9DA5]"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="instruction-amount" className="mb-2 block text-sm font-medium text-[#000000]">
                Amount
              </label>
              <Input
                id="instruction-amount"
                type="text"
                inputMode="decimal"
                placeholder="18500"
                value={form.amount}
                onChange={(e) => update('amount', e.target.value)}
                className="h-10 w-full rounded-lg border border-gray-200 focus:border-[#0E9DA5] focus:outline-none focus:ring-1 focus:ring-[#0E9DA5]"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-[#000000]">
                Frequency
              </label>
              <Select
                value={form.frequency}
                onValueChange={(value) =>
                  update('frequency', value as StandingInstructionCadence)
                }
              >
                <SelectTrigger className="h-10 w-full rounded-lg border border-gray-200 focus:border-[#0E9DA5] focus:outline-none focus:ring-1 focus:ring-[#0E9DA5]">
                  <SelectValue placeholder="Frequency" />
                </SelectTrigger>
                <SelectContent className="rounded-lg border border-gray-200 bg-white">
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                  <SelectItem value="yearly">Yearly</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="instruction-start-date" className="mb-2 block text-sm font-medium text-[#000000]">
                Start date
              </label>
              <Input
                id="instruction-start-date"
                type="date"
                value={form.startDate}
                onChange={(e) => update('startDate', e.target.value)}
                className="h-10 w-full rounded-lg border border-gray-200 focus:border-[#0E9DA5] focus:outline-none focus:ring-1 focus:ring-[#0E9DA5]"
              />
            </div>

            <div>
              <label htmlFor="instruction-end-date" className="mb-2 block text-sm font-medium text-[#000000]">
                End date
              </label>
              <Input
                id="instruction-end-date"
                type="date"
                value={form.endDate}
                onChange={(e) => update('endDate', e.target.value)}
                className="h-10 w-full rounded-lg border border-gray-200 focus:border-[#0E9DA5] focus:outline-none focus:ring-1 focus:ring-[#0E9DA5]"
              />
            </div>
          </div>

          <div>
            <label htmlFor="destination-account-name" className="mb-2 block text-sm font-medium text-[#000000]">
              Destination account name
            </label>
            <Input
              id="destination-account-name"
              type="text"
              placeholder="Lekki HOA"
              value={form.destinationAccountName}
              onChange={(e) => update('destinationAccountName', e.target.value)}
              className="h-10 w-full rounded-lg border border-gray-200 focus:border-[#0E9DA5] focus:outline-none focus:ring-1 focus:ring-[#0E9DA5]"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="destination-account-number" className="mb-2 block text-sm font-medium text-[#000000]">
                Destination account
              </label>
              <Input
                id="destination-account-number"
                type="text"
                inputMode="numeric"
                placeholder="1234567890"
                value={form.destinationAccountNumber}
                onChange={(e) => update('destinationAccountNumber', e.target.value)}
                className="h-10 w-full rounded-lg border border-gray-200 focus:border-[#0E9DA5] focus:outline-none focus:ring-1 focus:ring-[#0E9DA5]"
              />
            </div>

            <div>
              <label htmlFor="destination-bank-code" className="mb-2 block text-sm font-medium text-[#000000]">
                Bank code
              </label>
              <Input
                id="destination-bank-code"
                type="text"
                placeholder="044"
                value={form.destinationBankCode}
                onChange={(e) => update('destinationBankCode', e.target.value)}
                className="h-10 w-full rounded-lg border border-gray-200 focus:border-[#0E9DA5] focus:outline-none focus:ring-1 focus:ring-[#0E9DA5]"
              />
            </div>
          </div>
        </div>

        <div className="flex gap-3 p-4">
          <Button
            type="button"
            onClick={handleCancel}
            variant="outline"
            className="flex-1 border border-gray-200 bg-gray-100 text-gray-700 hover:bg-gray-200"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleCreateInstructions}
            disabled={!canContinue}
            className="flex-1 bg-[#0E9DA5] text-white hover:bg-[#0d8a91]"
          >
            Continue
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
