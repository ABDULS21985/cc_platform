'use client';

import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Check } from 'lucide-react';

interface SuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  amount: string;
  message: string;
  isWithdrawal?: boolean;
}

export function SuccessModal({
  isOpen,
  onClose,
  amount,
  message,
  isWithdrawal = false,
}: SuccessModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        showClose={true}
        className="p-0 bg-white rounded-lg w-full max-w-md overflow-hidden"
      >
        <div className="p-6 text-center">
          {/* Success Icon */}
          <div className="w-16 h-16 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check className="w-8 h-8 text-teal-600" />
          </div>

          {/* Amount */}
          <div className="text-2xl font-bold text-[#000000] mb-2">
            {isWithdrawal ? `-${amount}` : amount}
          </div>

          {/* Message */}
          <p className="text-sm text-[#959595]">{message}</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
