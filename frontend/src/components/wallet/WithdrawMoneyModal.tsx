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

interface WithdrawMoneyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (amount: string) => void;
}

export function WithdrawMoneyModal({
  isOpen,
  onClose,
  onConfirm,
}: WithdrawMoneyModalProps) {
  const [account, setAccount] = useState('');
  const [bank, setBank] = useState('');
  const [amount, setAmount] = useState('');

  const handleWithdraw = () => {
    if (account && bank && amount) {
      onConfirm(amount);
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
              Select bank
            </label>
            <Select value={bank} onValueChange={setBank}>
              <SelectTrigger className="w-full rounded-full">
                <SelectValue placeholder="Select bank" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="bellbank">Bellbank</SelectItem>
                <SelectItem value="gtbank">GTBank</SelectItem>
                <SelectItem value="zenith">Zenith Bank</SelectItem>
                <SelectItem value="access">Access Bank</SelectItem>
                <SelectItem value="firstbank">First Bank</SelectItem>
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
            className="flex-1 bg-teal-600 hover:bg-teal-700 text-white"
          >
            Confirm
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
