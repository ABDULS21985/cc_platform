'use client';

import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface PaymentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  amount: string;
}

export function PaymentDialog({
  isOpen,
  onClose,
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
            Paid tickets unavailable
          </h2>
          <p className="text-sm text-[#959595]">
            This event requires a payment of ₦{amount}, but event ticket
            payments are not supported yet.
          </p>
        </div>

        <div className="p-6 flex gap-3">
          <Button
            onClick={onClose}
            className="flex-1 bg-[#0E9DA5] hover:bg-[#0E9DA5]/90 text-white rounded-lg"
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
