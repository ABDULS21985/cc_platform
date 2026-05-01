'use client';

import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface TransactionPinModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  confirmButtonText: string;
}

export function TransactionPinModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  confirmButtonText,
}: TransactionPinModalProps) {
  const handleConfirm = () => {
    onConfirm();
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
            />
          </div>
        </div>

        <div className="p-4 flex gap-3">
          <Button
            onClick={onClose}
            variant="outline"
            className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-200"
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            className="flex-1 bg-teal-600 hover:bg-teal-700 text-white"
          >
            {confirmButtonText}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
