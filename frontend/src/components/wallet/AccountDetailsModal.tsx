'use client';

import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Copy } from 'lucide-react';

export interface WalletAccountDetails {
  account_number: string;
  account_name: string;
  bank_name: string;
  reference?: string;
  amount?: string;
  status?: string;
  instructions?: string;
  message?: string;
}

interface AccountDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  details: WalletAccountDetails | null;
}

export function AccountDetailsModal({
  isOpen,
  onClose,
  details,
}: AccountDetailsModalProps) {
  const handleCopy = () => {
    if (details?.account_number) {
      navigator.clipboard?.writeText(details.account_number);
    }
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
          {!details ? (
            <p className="text-sm text-[#959595]">
              Account details are not available yet.
            </p>
          ) : null}

          <div>
            <label className="block text-sm font-medium text-[#959595] mb-1">
              Account number
            </label>
            <div className="flex items-center gap-2">
              <span className="text-lg font-semibold text-[#000000]">
                {details?.account_number ?? 'Unavailable'}
              </span>
              <Button
                onClick={handleCopy}
                size="sm"
                disabled={!details?.account_number}
                leadingIcon={<Copy className="size-3.5" aria-hidden="true" />}
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
              {details?.bank_name ?? 'Unavailable'}
            </span>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#959595] mb-1">
              Account Name
            </label>
            <span className="text-lg font-semibold text-[#000000]">
              {details?.account_name ?? 'Unavailable'}
            </span>
          </div>

          {details?.reference ? (
            <div>
              <label className="block text-sm font-medium text-[#959595] mb-1">
                Reference
              </label>
              <span className="break-all text-sm font-semibold text-[#000000]">
                {details.reference}
              </span>
            </div>
          ) : null}

          {details?.instructions ? (
            <p className="rounded-lg bg-gray-50 p-3 text-sm text-[#555555]">
              {details.instructions}
            </p>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
