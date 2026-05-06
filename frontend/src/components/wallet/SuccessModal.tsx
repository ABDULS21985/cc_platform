'use client';

import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Check, Clock } from 'lucide-react';

interface SuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  amount: string;
  message: string;
  isWithdrawal?: boolean;
  /** Backend transaction id used to deep link into the receipt page. */
  transactionId?: number | string | null;
  /** Backend reference (e.g. WTH-...). */
  reference?: string | null;
  /** Backend status; if "pending", show the "may take a few minutes" hint. */
  status?: string | null;
}

export function SuccessModal({
  isOpen,
  onClose,
  amount,
  message,
  isWithdrawal = false,
  transactionId = null,
  reference = null,
  status = null,
}: SuccessModalProps) {
  const isPending =
    typeof status === 'string' && status.toLowerCase() === 'pending';
  const receiptHref = transactionId
    ? `/dashboard/wallet?txn=${transactionId}`
    : null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        showClose={true}
        className="p-0 bg-white rounded-lg w-full max-w-md overflow-hidden"
      >
        <div className="p-6 text-center">
          {/* Success Icon */}
          <div
            className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${
              isPending ? 'bg-amber-100' : 'bg-teal-100'
            }`}
          >
            {isPending ? (
              <Clock className="w-8 h-8 text-amber-600" aria-hidden="true" />
            ) : (
              <Check className="w-8 h-8 text-teal-600" aria-hidden="true" />
            )}
          </div>

          {/* Amount */}
          <div className="text-2xl font-bold text-[#000000] mb-2">
            {isWithdrawal ? `-${amount}` : amount}
          </div>

          {/* Message */}
          <p className="text-sm text-[#959595]">{message}</p>

          {/* Pending hint */}
          {isPending && (
            <p
              role="status"
              className="mt-3 rounded-md bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800"
            >
              Funds may take a few minutes to reach the destination.
            </p>
          )}

          {/* Reference */}
          {reference ? (
            <p className="mt-4 break-all text-[11px] uppercase tracking-widest text-muted-foreground">
              Ref: <span className="font-semibold text-foreground">{reference}</span>
            </p>
          ) : null}

          {/* Receipt link */}
          {receiptHref ? (
            <div className="mt-4">
              <a
                href={receiptHref}
                className="inline-flex items-center gap-1 rounded-md text-sm font-semibold text-teal-700 underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                View receipt
              </a>
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
