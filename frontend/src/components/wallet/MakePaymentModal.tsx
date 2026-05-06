'use client';

import { useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
export interface WalletFundDraft {
  amount: string;
  note?: string;
}

interface MakePaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (draft: WalletFundDraft) => void;
  loading?: boolean;
}

export function MakePaymentModal({
  isOpen,
  onClose,
  onSubmit,
  loading = false,
}: MakePaymentModalProps) {
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');

  const handleSend = () => {
    if (!amount.trim() || loading) return;
    onSubmit({ amount, note: note.trim() || undefined });
  };

  const handleCancel = () => {
    if (loading) return;
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        showClose={false}
        className="p-0 bg-white rounded-lg w-full max-w-md overflow-hidden"
      >
        <h2 className="text-[1.2rem]  p-4 text-center font-bold text-[#000000]">
          Fund wallet
        </h2>

        <div className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#000000] mb-2">
              Amount (₦)
            </label>
            <Input
              type="number"
              min="50"
              placeholder="Enter amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSend();
              }}
              className="w-full h-9 rounded-full border border-gray-200 focus:border-[#4ab5ba] focus:ring-1 focus:ring-[#4ab5ba] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#000000] mb-2">
              Note (Optional)
            </label>
            <Input
              type="text"
              placeholder="Write note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSend();
              }}
              className="w-full h-9 rounded-full border border-gray-200 focus:border-[#4ab5ba] focus:ring-1 focus:ring-[#4ab5ba] focus:outline-none"
            />
          </div>
        </div>

        <div className="p-4  flex gap-3">
          <Button
            onClick={handleCancel}
            variant="outline"
            disabled={loading}
            className="flex-1 bg-gray-300 text-[#000000] hover:bg-gray-400 border-gray-300"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSend}
            loading={loading}
            disabled={!amount.trim() || loading}
            className="flex-1  text-white"
          >
            Continue
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
