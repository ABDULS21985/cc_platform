'use client';

import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Copy } from 'lucide-react';

interface AccountDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AccountDetailsModal({
  isOpen,
  onClose,
}: AccountDetailsModalProps) {
  const handleCopy = () => {
    navigator.clipboard.writeText('1123456985');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        showClose={true}
        className="p-0 bg-white rounded-lg w-full max-w-md overflow-hidden"
      >
        <h2 className="text-[1.2rem]  p-3 font-bold text-[#000000]">
          Account details
        </h2>

        <div className="p-4 space-y-2">
          <div>
            <label className="block text-sm font-medium text-[#959595] mb-1">
              Account number
            </label>
            <div className="flex items-center gap-2">
              <span className="text-lg font-semibold text-[#000000]">
                1123456985
              </span>
              <Button
                onClick={handleCopy}
                size="sm"
                className="h-8 px-3 bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-200"
              >
                Copy
              </Button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#959595] mb-1">
              Bank Name
            </label>
            <span className="text-lg font-semibold text-[#000000]">
              Bellbank
            </span>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#959595] mb-1">
              Account Name
            </label>
            <span className="text-lg font-semibold text-[#000000]">
              Aishat Adwan
            </span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
