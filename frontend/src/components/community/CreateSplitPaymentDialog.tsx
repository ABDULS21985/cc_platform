'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Loader2 } from 'lucide-react';
import type { CreateBillPayload } from '@/services/api';

interface CreateSplitPaymentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (payload: CreateBillPayload) => Promise<void>;
  isSubmitting?: boolean;
}

export function CreateSplitPaymentDialog({
  isOpen,
  onClose,
  onCreate,
  isSubmitting = false,
}: CreateSplitPaymentDialogProps) {
  const [eventTitle, setEventTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [endDate, setEndDate] = useState('');
  const [description, setDescription] = useState('');
  const [splitEqually, setSplitEqually] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const nextErrors: Record<string, string> = {};
    if (!eventTitle.trim()) nextErrors.eventTitle = 'Title is required';
    if (!amount.trim() || Number.isNaN(Number(amount)) || Number(amount) <= 0) {
      nextErrors.amount = 'Valid amount is required';
    }
    if (!endDate) nextErrors.endDate = 'End date is required';
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const reset = () => {
    setEventTitle('');
    setAmount('');
    setEndDate('');
    setDescription('');
    setSplitEqually(true);
    setErrors({});
  };

  const handleCreate = async () => {
    if (!validate()) return;
    try {
      await onCreate({
        title: eventTitle.trim(),
        description: description.trim() || null,
        amount: Number(amount),
        type: 'fixed',
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
      <DialogContent className="p-0 bg-white rounded-lg w-full max-w-md overflow-hidden">
        <div className="p-4 border-b border-gray-200">
          <DialogTitle className="text-lg font-bold text-[#000000]">
            Create split payment
          </DialogTitle>
        </div>

        <div className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#000000] mb-2">
              Event title
            </label>
            <Input
              placeholder="Enter event title"
              value={eventTitle}
              onChange={(e) => setEventTitle(e.target.value)}
              className={`w-full rounded-full ${errors.eventTitle ? 'border-red-500' : ''}`}
              disabled={isSubmitting}
            />
            {errors.eventTitle && <p className="text-xs text-red-500 mt-1">{errors.eventTitle}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#000000] mb-2">
                Amount
              </label>
              <Input
                placeholder="Enter amount"
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

          <div className="flex items-center justify-between">
            <div>
              <label className="block text-sm font-medium text-[#000000] mb-1">
                Split equally
              </label>
              <p className="text-xs text-[#525252]">
                Share amount among your members
              </p>
            </div>
            <Switch checked={splitEqually} onCheckedChange={setSplitEqually} disabled />
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              onClick={handleCreate}
              disabled={isSubmitting}
              className="flex-1 bg-gray-300 text-[#000000] hover:bg-gray-400"
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating
                </span>
              ) : (
                'Create'
              )}
            </Button>
            <Button
              onClick={handleCancel}
              variant="outline"
              disabled={isSubmitting}
              className="flex-1 bg-gray-300 text-[#000000] hover:bg-gray-400 border-gray-300"
            >
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
