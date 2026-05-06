'use client';

import { useEffect, useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface SendMoneyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSend: (draft: WalletTransferDraft) => void;
  initialRecipient?: WalletTransferPrefill | null;
}

export interface WalletTransferDraft {
  amount: string;
  account_number: string;
  bank_code: string;
  bank_name: string;
  account_name?: string;
  note?: string;
}

export interface WalletTransferPrefill {
  account_number?: string;
  account_name?: string;
  bank_code?: string;
  bank_name?: string;
}

const BANK_OPTIONS = [
  { code: '058', name: 'GTBank' },
  { code: '057', name: 'Zenith Bank' },
  { code: '044', name: 'Access Bank' },
  { code: '011', name: 'First Bank' },
  { code: '000', name: 'Bell MFB' },
];

export function SendMoneyModal({
  isOpen,
  onClose,
  onSend,
  initialRecipient,
}: SendMoneyModalProps) {
  const [account, setAccount] = useState('');
  const [bank, setBank] = useState('');
  const [accountName, setAccountName] = useState('');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setAccount(initialRecipient?.account_number ?? '');
    setBank(initialRecipient?.bank_code ?? '');
    setAccountName(initialRecipient?.account_name ?? '');
    setNote('');
    setAmount('');
  }, [initialRecipient, isOpen]);

  const handleSend = () => {
    if (account && bank && amount) {
      const selectedBank = BANK_OPTIONS.find((b) => b.code === bank);
      onSend({
        amount,
        account_number: account,
        bank_code: bank,
        bank_name: initialRecipient?.bank_name || selectedBank?.name || bank,
        account_name: accountName.trim() || undefined,
        note: note.trim() || undefined,
      });
    }
  };

  const handleCancel = () => {
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        showClose={false}
        className="p-0 bg-white rounded-lg w-full max-w-md overflow-hidden"
      >
        <h2 className="text-[1.2rem] p-4 text-center font-bold text-[#000000]">
          Send to bank
        </h2>

        <div className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#000000] mb-2">
              Account
            </label>
            <Input
              type="text"
              placeholder="Enter account number"
              value={account}
              onChange={(e) => setAccount(e.target.value)}
              className="w-full h-9 rounded-full border border-gray-200 focus:border-[#4ab5ba] focus:ring-1 focus:ring-[#4ab5ba] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#000000] mb-2">
              Account name
            </label>
            <Input
              type="text"
              placeholder="Enter account name"
              value={accountName}
              onChange={(e) => setAccountName(e.target.value)}
              className="w-full h-9 rounded-full border border-gray-200 focus:border-[#4ab5ba] focus:ring-1 focus:ring-[#4ab5ba] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#000000] mb-2">
              Select bank
            </label>
            <Select value={bank} onValueChange={setBank}>
              <SelectTrigger className="w-full h-9 rounded-full border border-gray-200 focus:border-[#4ab5ba] focus:ring-1 focus:ring-[#4ab5ba] focus:outline-none">
                <SelectValue placeholder="Select bank" />
              </SelectTrigger>
              <SelectContent className="bg-white border border-gray-200 rounded-lg">
                {BANK_OPTIONS.map((option) => (
                  <SelectItem
                    key={option.code}
                    value={option.code}
                    className="cursor-pointer hover:bg-gray-50"
                  >
                    {option.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#000000] mb-2">
              Amount (N)
            </label>
            <Input
              type="number"
              min="100"
              placeholder="Enter amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
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
              className="w-full h-9 rounded-full border border-gray-200 focus:border-[#4ab5ba] focus:ring-1 focus:ring-[#4ab5ba] focus:outline-none"
            />
          </div>
        </div>

        <div className="p-4 flex gap-3">
          <Button
            onClick={handleCancel}
            variant="outline"
            className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-200"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSend}
            disabled={!account || !bank || !amount}
            className="flex-1 bg-teal-600 hover:bg-teal-700 text-white"
          >
            Continue
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
