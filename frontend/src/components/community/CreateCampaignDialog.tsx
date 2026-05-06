'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, X } from 'lucide-react';
import type { CreateBillPayload } from '@/services/api';

interface CreateCampaignDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (payload: CreateBillPayload) => Promise<void>;
  isSubmitting?: boolean;
}

export function CreateCampaignDialog({
  isOpen,
  onClose,
  onCreate,
  isSubmitting = false,
}: CreateCampaignDialogProps) {
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [endDate, setEndDate] = useState('');
  const [description, setDescription] = useState('');
  const [minAmount, setMinAmount] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const nextErrors: Record<string, string> = {};
    if (!title.trim()) nextErrors.title = 'Title is required';
    if (!amount.trim() || Number.isNaN(Number(amount)) || Number(amount) <= 0) {
      nextErrors.amount = 'Valid target amount is required';
    }
    if (minAmount.trim() && (Number.isNaN(Number(minAmount)) || Number(minAmount) < 0)) {
      nextErrors.minAmount = 'Minimum amount must be 0 or more';
    }
    if (!endDate) nextErrors.endDate = 'End date is required';
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const reset = () => {
    setTitle('');
    setAmount('');
    setEndDate('');
    setDescription('');
    setMinAmount('');
    setErrors({});
  };

  const handleCreate = async () => {
    if (!validate()) return;

    try {
      await onCreate({
        title: title.trim(),
        description: description.trim() || null,
        amount: Number(amount),
        type: 'free_will',
        min_amount: minAmount.trim() ? Number(minAmount) : 0,
        due_date: new Date(`${endDate}T23:59:59`).toISOString(),
      });
      reset();
    } catch {
      // Error toast is handled by the parent API flow.
    }
  };

  const handleCancel = () => {
    reset();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent showClose={false} className="p-0 bg-white/95 backdrop-blur-2xl rounded-[32px] w-full max-w-md overflow-hidden border-white/20 shadow-elevated animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-6 border-b border-gray-50/50">
          <DialogTitle className="text-xl font-extrabold text-gray-900 tracking-tight">Create campaign</DialogTitle>
          <button onClick={onClose} className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#000000] mb-2">
              Title
            </label>
            <Input
              placeholder="Enter your campaign title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={`w-full rounded-full ${errors.title ? 'border-red-500' : ''}`}
              disabled={isSubmitting}
            />
            {errors.title && <p className="text-xs text-red-500 mt-1">{errors.title}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#000000] mb-2">
                Amount
              </label>
              <Input
                placeholder="Enter target amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className={`w-full rounded-full ${errors.amount ? 'border-red-500' : ''}`}
                disabled={isSubmitting}
              />
              {errors.amount && <p className="text-xs text-red-500 mt-1">{errors.amount}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-[#000000] mb-2">
                End date
              </label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className={`w-full rounded-full ${errors.endDate ? 'border-red-500' : ''}`}
                disabled={isSubmitting}
              />
              {errors.endDate && <p className="text-xs text-red-500 mt-1">{errors.endDate}</p>}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#000000] mb-2">
              Description
            </label>
            <Input
              placeholder="Enter a short description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-full"
              disabled={isSubmitting}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#000000] mb-2">
              Minimum contribution
            </label>
            <Input
              placeholder="Optional minimum amount"
              value={minAmount}
              onChange={(e) => setMinAmount(e.target.value)}
              className={`w-full rounded-full ${errors.minAmount ? 'border-red-500' : ''}`}
              disabled={isSubmitting}
            />
            {errors.minAmount && <p className="text-xs text-red-500 mt-1">{errors.minAmount}</p>}
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              variant="ghost"
              onClick={handleCancel}
              disabled={isSubmitting}
              className="flex-1 h-12 rounded-2xl text-gray-500 font-bold hover:bg-gray-50 transition-all"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={isSubmitting}
              className="flex-1 h-12 rounded-2xl bg-[#0E9DA5] hover:bg-[#0a7a80] text-white font-bold shadow-glow hover:shadow-lg transition-all"
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating
                </span>
              ) : (
                'Create Campaign'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
