'use client';

import { useState } from 'react';
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
import type { WalletTransferDraft } from './SendMoneyModal';

interface WithdrawMoneyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (draft: WalletTransferDraft) => void;
}

const BANK_OPTIONS = [
  { code: '058', name: 'GTBank' },
  { code: '057', name: 'Zenith Bank' },
  { code: '044', name: 'Access Bank' },
  { code: '011', name: 'First Bank' },
  { code: '000', name: 'Bell MFB' },
];

export function WithdrawMoneyModal({
  isOpen,
  onClose,
  onConfirm,
}: WithdrawMoneyModalProps) {
  const [account, setAccount] = useState('');
  const [bank, setBank] = useState('');
  const [accountName, setAccountName] = useState('');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');

  const handleWithdraw = () => {
    if (account && bank && amount) {
      const selectedBank = BANK_OPTIONS.find((b) => b.code === bank);
      onConfirm({
        amount,
        account_number: account,
        bank_code: bank,
        bank_name: selectedBank?.name || bank,
        account_name: accountName.trim() || undefined,
        note: note.trim() || undefined,
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        showClose={true}
        className="p-0 bg-white rounded-lg w-full max-w-md overflow-hidden"
      >
        <h2 className="text-[1.2rem] p-3 font-bold text-[#000000]">
          Withdraw funds
        </h2>

        <div className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#959595] mb-2">
              Account
            </label>
            <Input
              placeholder="Enter account number"
              value={account}
              onChange={(e) => setAccount(e.target.value)}
              className="w-full rounded-full"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#959595] mb-2">
              Account name
            </label>
            <Input
              placeholder="Enter account name"
              value={accountName}
              onChange={(e) => setAccountName(e.target.value)}
              className="w-full rounded-full"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#959595] mb-2">
              Select bank
            </label>
            <Select value={bank} onValueChange={setBank}>
              <SelectTrigger className="w-full rounded-full">
                <SelectValue placeholder="Select bank" />
              </SelectTrigger>
              <SelectContent>
                {BANK_OPTIONS.map((option) => (
                  <SelectItem key={option.code} value={option.code}>
                    {option.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#959595] mb-2">
              Amount (₦)
            </label>
            <Input
              placeholder="Enter amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full rounded-full"
              type="number"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#959595] mb-2">
              Note (Optional)
            </label>
            <Input
              placeholder="Write note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full rounded-full"
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
            onClick={handleWithdraw}
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
