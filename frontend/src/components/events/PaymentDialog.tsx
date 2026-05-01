'use client';

import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface PaymentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onPay: () => void;
  amount: string;
}

export function PaymentDialog({
  isOpen,
  onClose,
  onPay,
  amount,
}: PaymentDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        showClose={true}
        className="p-0 bg-white rounded-lg w-full max-w-md overflow-hidden"
      >
        <div className="p-6 text-center space-y-4">
          <h2 className="text-xl font-bold text-[#000000]">
            Payment of {amount} required
          </h2>
          <p className="text-sm text-[#959595]">
            This is a private community, make payment to access event
          </p>
        </div>

        <div className="p-6 flex gap-3">
          <Button
            onClick={onClose}
            variant="outline"
            className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-200 rounded-lg"
          >
            Cancel
          </Button>
          <Button
            onClick={onPay}
            className="flex-1 bg-[#0E9DA5] hover:bg-[#0E9DA5]/90 text-white rounded-lg"
          >
            Pay now
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
